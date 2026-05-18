import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  private uniqueIds(ids: string[]) {
    return [...new Set(ids.filter(Boolean))];
  }

  private async getConversationOrThrow(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || !conversation.participantIds.includes(userId)) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    return conversation;
  }

  private async getConversationWithParticipants(conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  // Create or get 1v1 conversation
  async createOrGetConversation(user1Id: string, user2Id: string) {
    if (user1Id === user2Id) {
      throw new BadRequestException(
        'Cannot create a conversation with yourself',
      );
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        participantIds: {
          hasEvery: [user1Id, user2Id],
        },
      },
      include: {
        participants: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (existing && existing.participantIds.length === 2) {
      return existing;
    }

    return this.prisma.conversation.create({
      data: {
        participantIds: [user1Id, user2Id],
        kind: 'direct',
        name: null,
        leaderId: null,
        memberAddMode: 'all',
        messageSendMode: 'all',
        allowedSenderIds: [],
      },
      include: {
        participants: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async createGroupConversation(
    creatorId: string,
    name: string,
    memberIds: string[],
  ) {
    const participantIds = this.uniqueIds([creatorId, ...memberIds]);

    if (participantIds.length < 3) {
      throw new BadRequestException('A group needs at least 3 members');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true },
    });

    if (users.length !== participantIds.length) {
      throw new BadRequestException(
        'One or more selected members do not exist',
      );
    }

    return this.prisma.conversation.create({
      data: {
        participantIds,
        kind: 'group',
        name: name?.trim() || 'New group',
        leaderId: creatorId,
        memberAddMode: 'all',
        messageSendMode: 'all',
        allowedSenderIds: [creatorId],
      },
      include: {
        participants: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  // Get all conversations for a user
  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participantIds: {
          has: userId,
        },
      },
      include: {
        participants: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // preview latest message
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversationDetails(conversationId: string, userId: string) {
    const conversation = await this.getConversationOrThrow(
      conversationId,
      userId,
    );

    return this.getConversationWithParticipants(conversation.id);
  }

  async addGroupMembers(
    conversationId: string,
    actorId: string,
    memberIds: string[],
  ) {
    const conversation = await this.getConversationOrThrow(
      conversationId,
      actorId,
    );

    if (conversation.kind !== 'group') {
      throw new BadRequestException('Not a group conversation');
    }

    const normalized = this.uniqueIds(memberIds).filter(
      (id) => !conversation.participantIds.includes(id),
    );
    if (normalized.length === 0)
      return this.getConversationWithParticipants(conversationId);

    const canAdd =
      conversation.memberAddMode !== 'leader_only' ||
      conversation.leaderId === actorId;
    if (!canAdd) {
      throw new ForbiddenException('Only the group leader can add members');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: normalized } },
      select: { id: true },
    });

    const validIds = users.map((user) => user.id);

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        participantIds: [...conversation.participantIds, ...validIds],
      },
    });

    return this.getConversationWithParticipants(updated.id);
  }

  async setGroupLeader(
    conversationId: string,
    actorId: string,
    newLeaderId: string,
  ) {
    const conversation = await this.getConversationOrThrow(
      conversationId,
      actorId,
    );

    if (conversation.kind !== 'group') {
      throw new BadRequestException('Not a group conversation');
    }

    if (conversation.leaderId !== actorId) {
      throw new ForbiddenException(
        'Only the current group leader can transfer leadership',
      );
    }

    if (!conversation.participantIds.includes(newLeaderId)) {
      throw new BadRequestException('Selected leader must be a group member');
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { leaderId: newLeaderId },
    });

    return this.getConversationWithParticipants(conversationId);
  }

  async kickGroupMember(
    conversationId: string,
    actorId: string,
    memberId: string,
  ) {
    const conversation = await this.getConversationOrThrow(
      conversationId,
      actorId,
    );

    if (conversation.kind !== 'group') {
      throw new BadRequestException('Not a group conversation');
    }

    if (conversation.leaderId !== actorId) {
      throw new ForbiddenException('Only the group leader can kick members');
    }

    if (memberId === conversation.leaderId) {
      throw new BadRequestException('Group leader cannot be kicked');
    }

    if (!conversation.participantIds.includes(memberId)) {
      throw new BadRequestException('Member not found in group');
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        participantIds: conversation.participantIds.filter(
          (id) => id !== memberId,
        ),
      },
    });

    return this.getConversationWithParticipants(conversationId);
  }

  async transferLeadershipAndLeave(
    conversationId: string,
    actorId: string,
    newLeaderId: string,
  ) {
    const conversation = await this.getConversationOrThrow(
      conversationId,
      actorId,
    );

    if (conversation.kind !== 'group') {
      throw new BadRequestException('Not a group conversation');
    }

    if (conversation.leaderId !== actorId) {
      throw new ForbiddenException(
        'Only the group leader can transfer leadership',
      );
    }

    if (!conversation.participantIds.includes(newLeaderId)) {
      throw new BadRequestException('Selected leader must be a group member');
    }

    const nextParticipantIds = conversation.participantIds.filter(
      (id) => id !== actorId,
    );

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        leaderId: newLeaderId,
        participantIds: nextParticipantIds,
      },
    });

    return this.getConversationWithParticipants(conversationId);
  }

  async dissolveGroup(conversationId: string, actorId: string) {
    const conversation = await this.getConversationOrThrow(
      conversationId,
      actorId,
    );

    if (conversation.kind !== 'group') {
      throw new BadRequestException('Not a group conversation');
    }

    if (conversation.leaderId !== actorId) {
      throw new ForbiddenException(
        'Only the group leader can dissolve the group',
      );
    }

    await this.prisma.message.deleteMany({ where: { conversationId } });
    await this.prisma.conversation.delete({ where: { id: conversationId } });

    return { message: 'Group dissolved' };
  }

  async updateGroupPermissions(
    conversationId: string,
    actorId: string,
    data: {
      memberAddMode?: string;
      messageSendMode?: string;
      allowedSenderIds?: string[];
    },
  ) {
    const conversation = await this.getConversationOrThrow(
      conversationId,
      actorId,
    );

    if (conversation.kind !== 'group') {
      throw new BadRequestException('Not a group conversation');
    }

    if (conversation.leaderId !== actorId) {
      throw new ForbiddenException(
        'Only the group leader can update permissions',
      );
    }

    const updates: Record<string, unknown> = {};

    if (data.memberAddMode === 'all' || data.memberAddMode === 'leader_only') {
      updates.memberAddMode = data.memberAddMode;
    }

    if (
      data.messageSendMode === 'all' ||
      data.messageSendMode === 'restricted'
    ) {
      updates.messageSendMode = data.messageSendMode;
    }

    if (Array.isArray(data.allowedSenderIds)) {
      const allowed = this.uniqueIds([
        actorId,
        ...data.allowedSenderIds,
      ]).filter((id) => conversation.participantIds.includes(id));
      updates.allowedSenderIds = allowed;
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: updates,
    });

    return this.getConversationWithParticipants(conversationId);
  }

  async leaveGroup(conversationId: string, actorId: string) {
    const conversation = await this.getConversationOrThrow(
      conversationId,
      actorId,
    );

    if (conversation.kind !== 'group') {
      throw new BadRequestException('Not a group conversation');
    }

    if (conversation.leaderId === actorId) {
      throw new BadRequestException(
        'Leader must transfer leadership or dissolve the group before leaving',
      );
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        participantIds: conversation.participantIds.filter(
          (id) => id !== actorId,
        ),
      },
    });

    return this.getConversationWithParticipants(conversationId);
  }

  // Save a new message (Triggered by Socket or API)
  async saveMessage(conversationId: string, senderId: string, content: string) {
    const conversation = await this.getConversationOrThrow(
      conversationId,
      senderId,
    );

    if (
      conversation.kind === 'group' &&
      conversation.messageSendMode === 'restricted'
    ) {
      const allowedSenderIds = this.uniqueIds([
        conversation.leaderId || '',
        ...conversation.allowedSenderIds,
      ]);
      if (!allowedSenderIds.includes(senderId)) {
        throw new ForbiddenException(
          'You are not allowed to send messages in this group',
        );
      }
    }

    const message = await this.prisma.message.create({
      data: {
        content,
        senderId,
        conversationId,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  // Get message history
  async getMessages(conversationId: string, userId: string) {
    await this.getConversationOrThrow(conversationId, userId);

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
