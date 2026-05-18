import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  async createConversation(
    @Req() req: any,
    @Body('targetUserId') targetUserId: string,
  ) {
    const currentUserId = req.user.userId;
    return this.chatService.createOrGetConversation(currentUserId, targetUserId);
  }

  @Get('conversations')
  async getConversations(@Req() req: any) {
    const currentUserId = req.user.userId;
    return this.chatService.getUserConversations(currentUserId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Req() req: any,
    @Param('id') conversationId: string,
  ) {
    const currentUserId = req.user.userId;
    return this.chatService.getMessages(conversationId, currentUserId);
  }
}
