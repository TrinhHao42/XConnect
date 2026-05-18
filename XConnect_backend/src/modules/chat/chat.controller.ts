import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  private async getUserIdFromAuth(authHeader: string): Promise<string> {
    try {
      const token = authHeader?.split(' ')[1];
      if (!token) throw new Error('No token');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
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
    return this.chatService.createOrGetConversation(
      currentUserId,
      targetUserId,
    );
  }

  @Post('groups')
  async createGroupConversation(
    @Headers('authorization') authHeader: string,
    @Body('name') name: string,
    @Body('memberIds') memberIds: string[],
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.createGroupConversation(
      currentUserId,
      name,
      memberIds || [],
    );
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

  @Get('groups/:id')
  async getGroupDetails(
    @Headers('authorization') authHeader: string,
    @Param('id') conversationId: string,
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.getConversationDetails(
      conversationId,
      currentUserId,
    );
  }

  @Post('groups/:id/members')
  async addGroupMembers(
    @Headers('authorization') authHeader: string,
    @Param('id') conversationId: string,
    @Body('memberIds') memberIds: string[],
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.addGroupMembers(
      conversationId,
      currentUserId,
      memberIds || [],
    );
  }

  @Post('groups/:id/leader')
  async setGroupLeader(
    @Headers('authorization') authHeader: string,
    @Param('id') conversationId: string,
    @Body('newLeaderId') newLeaderId: string,
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.setGroupLeader(
      conversationId,
      currentUserId,
      newLeaderId,
    );
  }

  @Post('groups/:id/leader-and-leave')
  async transferLeaderAndLeave(
    @Headers('authorization') authHeader: string,
    @Param('id') conversationId: string,
    @Body('newLeaderId') newLeaderId: string,
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.transferLeadershipAndLeave(
      conversationId,
      currentUserId,
      newLeaderId,
    );
  }

  @Post('groups/:id/kick/:memberId')
  async kickGroupMember(
    @Headers('authorization') authHeader: string,
    @Param('id') conversationId: string,
    @Param('memberId') memberId: string,
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.kickGroupMember(
      conversationId,
      currentUserId,
      memberId,
    );
  }

  @Patch('groups/:id/permissions')
  async updateGroupPermissions(
    @Headers('authorization') authHeader: string,
    @Param('id') conversationId: string,
    @Body()
    body: {
      memberAddMode?: string;
      messageSendMode?: string;
      allowedSenderIds?: string[];
    },
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.updateGroupPermissions(
      conversationId,
      currentUserId,
      body || {},
    );
  }

  @Delete('groups/:id')
  async dissolveGroup(
    @Headers('authorization') authHeader: string,
    @Param('id') conversationId: string,
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.dissolveGroup(conversationId, currentUserId);
  }

  @Post('groups/:id/leave')
  async leaveGroup(
    @Headers('authorization') authHeader: string,
    @Param('id') conversationId: string,
  ) {
    const currentUserId = await this.getUserIdFromAuth(authHeader);
    return this.chatService.leaveGroup(conversationId, currentUserId);
  }
}
