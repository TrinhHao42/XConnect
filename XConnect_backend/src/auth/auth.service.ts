import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) { }

  async register(body: any) {
    if (!body) {
      throw new BadRequestException('Dữ liệu đăng ký không hợp lệ');
    }
    const { username, email, password, repassword } = body;
    if (password !== repassword) {
      throw new BadRequestException('Mật khẩu nhập lại không khớp');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      throw new BadRequestException('Email hoặc tên người dùng đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        provider: 'local',
      },
    });

    return this.generateTokens(user.id);
  }

  async login(body: any) {
    if (!body || !body.email || !body.password) {
      throw new BadRequestException('Vui lòng cung cấp đầy đủ email và mật khẩu');
    }
    const { email, password } = body;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.provider !== 'local' || !user.password) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    return this.generateTokens(user.id);
  }

  async oauthLogin(profile: any, provider: string) {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          provider: provider,
          providerId: profile.providerId,
        },
      });
    }
    return this.generateTokens(user.id);
  }

  async refreshTokens(oldRefreshToken: string) {
    if (!oldRefreshToken) {
      throw new UnauthorizedException('Không tìm thấy Refresh Token');
    }

    const userId = await this.redis.get(`refresh_token:${oldRefreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Refresh Token không hợp lệ hoặc đã hết hạn');
    }

    // Xoá token cũ để tránh bị reuse (xoay vòng token)
    await this.redis.del(`refresh_token:${oldRefreshToken}`);

    return this.generateTokens(userId);
  }

  async logout(accessToken: string, refreshToken: string) {
    // Thu hồi Refresh Token
    if (refreshToken) {
      await this.redis.del(`refresh_token:${refreshToken}`);
    }

    // Đưa Access Token vào Blacklist (TTL 15 phút = 900 giây)
    if (accessToken) {
      // Decode để lấy chính xác thời gian còn lại, hoặc set dư một chút
      const decoded = this.jwtService.decode(accessToken) as any;
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await this.redis.setex(`blacklist:${accessToken}`, expiresIn, 'revoked');
        }
      } else {
        await this.redis.setex(`blacklist:${accessToken}`, 900, 'revoked');
      }
    }
    return { message: 'Đăng xuất thành công' };
  }

  async verifyTokenRaw(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      // Check blacklist
      const isBlacklisted = await this.redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return { valid: false, message: 'Token đã bị thu hồi (Blacklist)' };
      }

      return { valid: true, payload };
    } catch (e) {
      return { valid: false, message: e.message };
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const isBlacklisted = await this.redis.get(`blacklist:${token}`);
    return !!isBlacklisted;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    // Generate random 6-digit OTP
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu vào Redis, hết hạn sau 15 phút
    await this.redis.setex(`reset_token:${email}`, 900, resetToken);

    console.log(`\n======================================================`);
    console.log(`🔔 CẢNH BÁO MÔ PHỎNG GỬI MAIL 🔔`);
    console.log(`Gửi OTP đến: ${email}`);
    console.log(`MÃ RESET PASSWORD (OTP) CỦA BẠN LÀ: ${resetToken}`);
    console.log(`======================================================\n`);

    return { message: 'Mã xác nhận đã được gửi đến email của bạn' };
  }

  async resetPassword(body: any) {
    if (!body) {
      throw new BadRequestException('Dữ liệu không hợp lệ');
    }
    const { email, token, newPassword } = body;
    const storedToken = await this.redis.get(`reset_token:${email}`);

    if (!storedToken || storedToken !== token) {
      throw new BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Clear reset token
    await this.redis.del(`reset_token:${email}`);

    return { message: 'Mật khẩu đã được thay đổi thành công' };
  }

  private async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ sub: userId });

    // Tạo chuỗi ngẫu nhiên làm refresh_token
    const refreshToken = crypto.randomBytes(40).toString('hex');

    // Lưu refresh token vào Redis với chu kỳ sống 7 ngày (604800 giây)
    await this.redis.setex(`refresh_token:${refreshToken}`, 604800, userId);

    return { accessToken, refreshToken };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (user) {
      const { password, ...safeUser } = user;
      return safeUser;
    }
    return null;
  }
}
