import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../../common/types/auth-request.interface';

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

  @Post('groups')
  async createGroupConversation(
    @Req() req: AuthRequest,
    @Body('name') name: string,
    @Body('memberIds') memberIds: string[],
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.createGroupConversation(
      currentUserId,
      name,
      memberIds || [],
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

  @Get('groups/:id')
  async getGroupDetails(
    @Req() req: AuthRequest,
    @Param('id') conversationId: string,
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.getConversationDetails(
      conversationId,
      currentUserId,
    );
  }

  @Post('groups/:id/members')
  async addGroupMembers(
    @Req() req: AuthRequest,
    @Param('id') conversationId: string,
    @Body('memberIds') memberIds: string[],
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.addGroupMembers(
      conversationId,
      currentUserId,
      memberIds || [],
    );
  }

  @Post('groups/:id/leader')
  async setGroupLeader(
    @Req() req: AuthRequest,
    @Param('id') conversationId: string,
    @Body('newLeaderId') newLeaderId: string,
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.setGroupLeader(
      conversationId,
      currentUserId,
      newLeaderId,
    );
  }

  @Post('groups/:id/leader-and-leave')
  async transferLeaderAndLeave(
    @Req() req: AuthRequest,
    @Param('id') conversationId: string,
    @Body('newLeaderId') newLeaderId: string,
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.transferLeadershipAndLeave(
      conversationId,
      currentUserId,
      newLeaderId,
    );
  }

  @Post('groups/:id/kick/:memberId')
  async kickGroupMember(
    @Req() req: AuthRequest,
    @Param('id') conversationId: string,
    @Param('memberId') memberId: string,
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.kickGroupMember(
      conversationId,
      currentUserId,
      memberId,
    );
  }

  @Patch('groups/:id/permissions')
  async updateGroupPermissions(
    @Req() req: AuthRequest,
    @Param('id') conversationId: string,
    @Body()
    body: {
      memberAddMode?: string;
      messageSendMode?: string;
      allowedSenderIds?: string[];
    },
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.updateGroupPermissions(
      conversationId,
      currentUserId,
      body || {},
    );
  }

  @Delete('groups/:id')
  async dissolveGroup(
    @Req() req: AuthRequest,
    @Param('id') conversationId: string,
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.dissolveGroup(conversationId, currentUserId);
  }

  @Post('groups/:id/leave')
  async leaveGroup(
    @Req() req: AuthRequest,
    @Param('id') conversationId: string,
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    return this.chatService.leaveGroup(conversationId, currentUserId);
  }

  @Delete('messages/:messageId')
  async recallMessage(
    @Req() req: AuthRequest,
    @Param('messageId') messageId: string,
  ) {
    const currentUserId = String(req.user.sub || req.user.userId);
    await this.chatService.recallMessage(messageId, currentUserId);
    return { success: true };
  }
}
