import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class FriendService {
  constructor(
    private prisma: PrismaService,
    private socketGateway: SocketGateway
  ) {}

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }

    // Check if already friends
    const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }
    
    if (sender.friendIds && sender.friendIds.includes(receiverId)) {
      throw new BadRequestException('You are already friends');
    }

    // Check if request already exists
    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: 'pending' },
          { senderId: receiverId, receiverId: senderId, status: 'pending' },
        ],
      },
    });

    if (existingRequest) {
      throw new BadRequestException('A pending friend request already exists');
    }

    const request = await this.prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
        status: 'pending',
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Notify receiver
    this.socketGateway.notifyUser(receiverId, 'friendRequestReceived', request);

    return request;
  }

  async getReceivedRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'pending',
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async acceptRequest(requestId: string, userId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== userId || request.status !== 'pending') {
      throw new BadRequestException('Invalid or expired friend request');
    }

    // Update status
    const updatedRequest = await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'accepted' },
      include: {
        receiver: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Add to friendIds for both users
    await this.prisma.user.update({
      where: { id: request.senderId },
      data: {
        friendIds: { push: request.receiverId },
      },
    });

    await this.prisma.user.update({
      where: { id: request.receiverId },
      data: {
        friendIds: { push: request.senderId },
      },
    });

    // Notify sender
    this.socketGateway.notifyUser(request.senderId, 'friendRequestAccepted', updatedRequest);

    return { message: 'Friend request accepted' };
  }

  async rejectRequest(requestId: string, userId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== userId || request.status !== 'pending') {
      throw new BadRequestException('Invalid or expired friend request');
    }

    const updatedRequest = await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
      include: {
        receiver: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Notify sender
    this.socketGateway.notifyUser(request.senderId, 'friendRequestRejected', updatedRequest);

    return updatedRequest;
  }

  async getFriends(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { friendIds: true },
    });

    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.findMany({
      where: {
        id: { in: user.friendIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
      },
    });
  }

  async getRelationStatus(userId: string, targetId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { friendIds: true },
    });

    if (user?.friendIds.includes(targetId)) {
      return { status: 'friends' };
    }

    const request = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetId },
          { senderId: targetId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (request) {
      // If the current user is the sender
      if (request.senderId === userId) {
        return { status: request.status, side: 'sender' };
      }
      // If the current user is the receiver
      return { status: request.status, side: 'receiver' };
    }

    return { status: 'none' };
  }
}
