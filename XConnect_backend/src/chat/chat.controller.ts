import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../common/types/auth-request.interface';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  async createConversation(
    @Req() req: AuthRequest,
    @Body('targetUserId') targetUserId: string,
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.createOrGetConversation(
      currentUserId,
      targetUserId,
    );
  }

  @Get('conversations')
  async getConversations(@Req() req: AuthRequest) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.getUserConversations(currentUserId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Req() req: AuthRequest,
    @Param('id') conversationId: string,
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.getMessages(conversationId, currentUserId);
  }
}
