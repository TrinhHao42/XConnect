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
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('ChatGateway initialized (Text Messaging)');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) return; // Silent return, let CallGateway handle the main rejection if needed
      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;
    } catch (error) {
      // we might not disconnect here, because CallGateway could also connect, but we better be safe
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {}

  // --- THÊM CHATS ---
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data.conversationId) {
      client.join(data.conversationId);
      this.logger.log(`Client ${client.id} joined room ${data.conversationId}`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      conversationId: string;
      content: string;
      tempId?: string;
      type?: string;
    },
  ) {
    try {
      const user = client.data.user;
      if (!user) throw new Error('Not authenticated');

      const { conversationId, content, tempId } = payload;
      const userId = user.sub || user.userId || String(user.id);

      // Lưu vào Database
      const message = await this.chatService.saveMessage(
        conversationId,
        userId,
        content,
      );

      if (tempId) {
        client.emit('messageStatusUpdate', {
          messageId: message.id,
          tempId,
          conversationId,
          status: 'sent',
        });
      }

      client
        .to(conversationId)
        .emit('newMessage', tempId ? { ...message, tempId } : message);
    } catch (e) {
      this.logger.error(`Error sending message: ${e.message}`);
      client.emit('error', { message: 'Cannot send message' });
    }
  }
}
