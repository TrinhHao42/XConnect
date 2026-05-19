import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Body,
  Put,
  Req,
} from '@nestjs/common';
import { FriendService } from './friend.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../../common/types/auth-request.interface';

@Controller('friend')
@UseGuards(JwtAuthGuard)
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request/:receiverId')
  async sendRequest(
    @Req() req: AuthRequest,
    @Param('receiverId') receiverId: string,
  ) {
    return this.friendService.sendRequest(
      String(req.user.sub || req.user.userId),
      receiverId,
    );
  }

  @Get('requests')
  async getReceivedRequests(@Req() req: AuthRequest) {
    return this.friendService.getReceivedRequests(
      String(req.user.sub || req.user.userId),
    );
  }

  @Put('accept/:requestId')
  async acceptRequest(
    @Req() req: AuthRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.friendService.acceptRequest(
      requestId,
      String(req.user.sub || req.user.userId),
    );
  }

  @Put('reject/:requestId')
  async rejectRequest(
    @Req() req: AuthRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.friendService.rejectRequest(
      requestId,
      String(req.user.sub || req.user.userId),
    );
  }

  @Get('list')
  async getFriends(@Req() req: AuthRequest) {
    return this.friendService.getFriends(
      String(req.user.sub || req.user.userId),
    );
  }

  @Get('status/:receiverId')
  async getStatus(
    @Req() req: AuthRequest,
    @Param('receiverId') receiverId: string,
  ) {
    return this.friendService.getRelationStatus(
      String(req.user.sub || req.user.userId),
      receiverId,
    );
  }
}
