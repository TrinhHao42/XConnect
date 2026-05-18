import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: 'call',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class CallGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('CallGateway');

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('CallGateway initialized (WebRTC Signaling)');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) throw new Error('Missing token');

      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;

      const userId = payload.sub || payload.userId || String(payload.id);

      // Global room for the user to be callable from anywhere
      client.join(userId);

      this.logger.log(
        `Client online for Calls: ${client.id} (User ID: ${userId})`,
      );
    } catch (error) {
      this.logger.warn(
        `Call connection rejected: ${client.id} - ${error.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from Calls: ${client.id}`);
  }

  // ==========================================
  // --- WEBRTC AUDIO/VIDEO CALL SIGNALING ---
  // ==========================================

  @SubscribeMessage('callUser')
  handleCallUser(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      userToCallId: string;
      signalData: any;
      isVideo: boolean;
      fromName?: string;
    },
  ) {
    const user = client.data.user;
    if (!user) return;

    const userId = user.sub || user.userId || String(user.id);
    this.server.to(payload.userToCallId).emit('incomingCall', {
      signal: payload.signalData,
      from: userId,
      callerName: payload.fromName || 'Someone',
      isVideo: payload.isVideo,
    });
    this.logger.log(
      `[Call] initiated from ${userId} to ${payload.userToCallId}`,
    );
  }

  @SubscribeMessage('answerCall')
  handleAnswerCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { toUserId: string; signalData: any },
  ) {
    const user = client.data.user;
    if (!user) return;

    const userId = user.sub || user.userId || String(user.id);
    this.server
      .to(payload.toUserId)
      .emit('callAccepted', { signal: payload.signalData, from: userId });
    this.logger.log(
      `[Call] accepted by ${userId} for caller ${payload.toUserId}`,
    );
  }

  @SubscribeMessage('rejectCall')
  handleRejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { toUserId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    const userId = user.sub || user.userId || String(user.id);
    this.server.to(payload.toUserId).emit('callRejected', { from: userId });
    this.logger.log(
      `[Call] rejected by ${userId} for caller ${payload.toUserId}`,
    );
  }

  @SubscribeMessage('endCall')
  handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { toUserId: string },
  ) {
    const user = client.data.user;
    if (!user) return;

    const userId = user.sub || user.userId || String(user.id);
    this.server.to(payload.toUserId).emit('callEnded', { from: userId });
    this.logger.log(`[Call] ended by ${userId}`);
  }

  @SubscribeMessage('iceCandidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { toUserId: string; candidate: any },
  ) {
    const user = client.data.user;
    if (!user) return;

    const userId = user.sub || user.userId || String(user.id);
    this.server
      .to(payload.toUserId)
      .emit('iceCandidate', { candidate: payload.candidate, from: userId });
  }
}
