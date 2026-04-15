import { Controller, Post, Get, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
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

  @Post('conversations')
  async createConversation(
    @Headers('authorization') authHeader: string,
    @Body('targetUserId') targetUserId: string,
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.createOrGetConversation(currentUserId, targetUserId);
  }

  @Get('conversations')
  async getConversations(@Headers('authorization') authHeader: string) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.getUserConversations(currentUserId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Headers('authorization') authHeader: string,
    @Param('id') conversationId: string,
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.getMessages(conversationId, currentUserId);
  }
}
