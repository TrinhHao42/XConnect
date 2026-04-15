import { Controller, Get, Put, Body, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  private async getUserIdFromAuth(authHeader: string): Promise<string> {
    try {
      const token = authHeader?.split(' ')[1];
      if (!token) throw new Error('No token');
      const payload = await this.jwtService.verifyAsync(token, {
         secret: process.env.JWT_SECRET || 'your-secret-key'
      });
      return payload.sub || payload.userId || String(payload.id);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc không có');
    }
  }

  @Get('profile')
  async getProfile(@Headers('authorization') authHeader: string) {
    const userId = await this.getUserIdFromAuth(authHeader);
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  async updateProfile(
    @Headers('authorization') authHeader: string,
    @Body() updateData: { name?: string; avatar?: string; bio?: string }
  ) {
    const userId = await this.getUserIdFromAuth(authHeader);
    return this.usersService.updateProfile(userId, updateData);
  }

  @Get('search')
  async searchUsers(
    @Headers('authorization') authHeader: string,
    @Query('q') query: string
  ) {
    const userId = await this.getUserIdFromAuth(authHeader);
    return this.usersService.searchUsers(query, userId);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }
}
