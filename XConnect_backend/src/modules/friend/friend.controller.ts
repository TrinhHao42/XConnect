import { Controller, Post, Get, Param, UseGuards, Request, Body, Put } from '@nestjs/common';
import { FriendService } from './friend.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('friend')
@UseGuards(JwtAuthGuard)
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request/:receiverId')
  async sendRequest(@Request() req, @Param('receiverId') receiverId: string) {
    return this.friendService.sendRequest(req.user.userId, receiverId);
  }

  @Get('requests')
  async getReceivedRequests(@Request() req) {
    return this.friendService.getReceivedRequests(req.user.userId);
  }

  @Put('accept/:requestId')
  async acceptRequest(@Request() req, @Param('requestId') requestId: string) {
    return this.friendService.acceptRequest(requestId, req.user.userId);
  }

  @Put('reject/:requestId')
  async rejectRequest(@Request() req, @Param('requestId') requestId: string) {
    return this.friendService.rejectRequest(requestId, req.user.userId);
  }

  @Get('list')
  async getFriends(@Request() req) {
    return this.friendService.getFriends(req.user.userId);
  }

  @Get('status/:receiverId')
  async getStatus(@Request() req, @Param('receiverId') receiverId: string) {
    return this.friendService.getRelationStatus(req.user.userId, receiverId);
  }
}
