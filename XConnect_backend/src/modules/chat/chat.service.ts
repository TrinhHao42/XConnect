import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) { }

  // Create or get 1v1 conversation
  async createOrGetConversation(user1Id: string, user2Id: string) {
    if (user1Id === user2Id) {
      throw new BadRequestException('Cannot create a conversation with yourself');
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
      },
      include: {
        participants: {
          select: { id: true, name: true, email: true },
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
          select: { id: true, name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // preview latest message
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Save a new message (Triggered by Socket or API)
  async saveMessage(conversationId: string, senderId: string, content: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || !conversation.participantIds.includes(senderId)) {
      throw new NotFoundException('Conversation not found or access denied');
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
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || !conversation.participantIds.includes(userId)) {
      throw new NotFoundException('Conversation not found or access denied');
    }

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
