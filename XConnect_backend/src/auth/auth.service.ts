import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
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
  ) {}

  async register(body: any) {
    if (!body) {
      throw new BadRequestException('Invalid registration data');
    }
    const { username, name, email, password, repassword } = body;

    if (!email || !password) {
      throw new BadRequestException(
        'Please provide both email and password',
      );
    }

    if (repassword !== undefined && password !== repassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const normalizedUsername = (username || name || email.split('@')[0]).trim();
    const normalizedName = (name || username || normalizedUsername).trim();

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username: normalizedUsername }] },
    });

    if (existingUser) {
      throw new BadRequestException('Email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: normalizedUsername,
        name: normalizedName,
        email,
        password: hashedPassword,
        provider: 'local',
      },
    });

    const { password: _, ...safeUser } = user;
    const tokens = await this.generateTokens(user.id);
    return { ...tokens, user: safeUser };
  }

  async login(body: any) {
    if (!body || !body.email || !body.password) {
      throw new BadRequestException(
        'Please provide both email and password',
      );
    }
    const { email, password } = body;
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.provider !== 'local' || !user.password) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    const { password: _, ...safeUser } = user;
    const tokens = await this.generateTokens(user.id);
    return { ...tokens, user: safeUser };
  }

  async oauthLogin(profile: any, provider: string) {
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (!user) {
      // Generate a unique username from email prefix + random suffix
      const baseUsername = profile.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      let username = baseUsername;
      let attempts = 0;
      
      // Retry until we find a unique username
      while (attempts < 10) {
        const existing = await this.prisma.user.findUnique({ where: { username } });
        if (!existing) break;
        username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
        attempts++;
      }

      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          username,
          provider: provider,
          providerId: profile.providerId,
        },
      });
    }
    return this.generateTokens(user.id);
  }

  async supabaseLogin(accessToken: string) {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new UnauthorizedException('Supabase is not configured in backend');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token with Supabase server
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired Supabase token');
    }

    const profile = {
      email: user.email,
      name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      providerId: user.id
    };

    // Internal OAuth login/registration
    const tokens = await this.oauthLogin(profile, 'google');
    
    // Get user info to return to FE
    const dbUser = await this.prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) {
      throw new UnauthorizedException('User not found in database');
    }
    const { password: _, ...safeUser } = dbUser;

    return { ...tokens, user: safeUser };
  }

  async refreshTokens(oldRefreshToken: string) {
    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh Token not found');
    }

    const userId = await this.redis.get(`refresh_token:${oldRefreshToken}`);
    if (!userId) {
      throw new UnauthorizedException(
        'Invalid or expired Refresh Token',
      );
    }

    // Delete old token to prevent reuse (token rotation)
    await this.redis.del(`refresh_token:${oldRefreshToken}`);

    return this.generateTokens(userId);
  }

  async logout(accessToken: string, refreshToken: string) {
    // Revoke Refresh Token
    if (refreshToken) {
      await this.redis.del(`refresh_token:${refreshToken}`);
    }

    // Add Access Token to Blacklist (TTL 15 mins = 900s)
    if (accessToken) {
      // Decode to get exact remaining time, or set slightly longer
      const decoded = this.jwtService.decode(accessToken);
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await this.redis.setex(
            `blacklist:${accessToken}`,
            expiresIn,
            'revoked',
          );
        }
      } else {
        await this.redis.setex(`blacklist:${accessToken}`, 900, 'revoked');
      }
    }
    return { message: 'Logged out successfully' };
  }

  async verifyTokenRaw(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      // Check blacklist
      const isBlacklisted = await this.redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return { valid: false, message: 'Token has been revoked (Blacklisted)' };
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
      throw new BadRequestException('User does not exist');
    }

    // Generate random 6-digit OTP
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to Redis, expires in 15 mins
    await this.redis.setex(`reset_token:${email}`, 900, resetToken);

    console.log(`\n======================================================`);
    console.log(`🔔 EMAIL SIMULATION WARNING 🔔`);
    console.log(`Sending OTP to: ${email}`);
    console.log(`YOUR PASSWORD RESET OTP IS: ${resetToken}`);
    console.log(`======================================================\n`);

    return { message: 'Verification code sent to your email' };
  }

  async resetPassword(body: any) {
    if (!body) {
      throw new BadRequestException('Invalid data');
    }
    const { email, token, newPassword } = body;
    const storedToken = await this.redis.get(`reset_token:${email}`);

    if (!storedToken || storedToken !== token) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // Clear reset token
    await this.redis.del(`reset_token:${email}`);

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ sub: userId });

    // Create random string for refresh_token
    const refreshToken = crypto.randomBytes(40).toString('hex');

    // Save refresh token to Redis with 7 days TTL
    // If Redis is not ready, return tokens anyway so login/register doesn't hang.
    try {
      await this.redis.setex(`refresh_token:${refreshToken}`, 604800, userId);
    } catch (error) {
      console.warn(
        '[Auth] Failed to persist refresh token in Redis:',
        error.message,
      );
    }

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
