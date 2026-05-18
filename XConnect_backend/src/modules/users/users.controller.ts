import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    const userId = req.user.userId;
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  async updateProfile(
    @Req() req: any,
    @Body() updateData: { name?: string; avatar?: string; bio?: string },
  ) {
    const userId = req.user.userId;
    return this.usersService.updateProfile(userId, updateData);
  }

  @Get('search')
  async searchUsers(@Req() req: any, @Query('q') query: string) {
    const userId = req.user.userId;
    return this.usersService.searchUsers(query, userId);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }
}
