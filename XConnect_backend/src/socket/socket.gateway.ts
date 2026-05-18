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
import { ChatService } from '../chat/chat.service';

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('SocketGateway');
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService
  ) {}

  afterInit(server: Server) {
    this.logger.log('Socket initialized');
  }

  private broadcastOnlineUsers() {
    const onlineUsers = Array.from(this.userSockets.keys());
    this.server.emit('updateOnlineUsers', onlineUsers);
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      // FE có thể gửi token qua header (Bearer ...) hoặc gửi thẳng trong auth: { token: '...' }
      const token = 
        client.handshake.auth?.token || 
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new Error('Missing token');
      }

      // Giải mã token, kiểm tra hợp lệ
      const payload = await this.jwtService.verifyAsync(token);
      
      // Lưu thông tin user vào socket data để các event khác xài
      client.data.user = payload;
      this.userSockets.set(payload.sub, client.id);
      
      this.logger.log(`Client connected & authenticated: ${client.id} (User ID: ${payload.sub})`);
      
      this.broadcastOnlineUsers();
    } catch (error) {
      this.logger.warn(`Client connection rejected: ${client.id} - Reason: ${error.message}`);
      client.disconnect(); // Đóng kết nối nếu token sai / không có
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      this.userSockets.delete(client.data.user.sub);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
    this.broadcastOnlineUsers();
  }

  @SubscribeMessage('pingServer')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.log(`Ping received from ${client.id}: ${JSON.stringify(data)}`);
    client.emit('pongClient', { message: 'Hello from server!', originalId: client.id });
  }

  // --- THÊM CHATS ---
  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    if (data.conversationId) {
      client.join(data.conversationId);
      this.logger.log(`Client ${client.id} joined room ${data.conversationId}`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: { conversationId: string; content: string; tempId?: string; type?: string }) {
    try {
      const user = client.data.user;
      if (!user) throw new Error('Not authenticated');

      const { conversationId, content, tempId } = payload;
      
      // Lưu vào Database
      const message = await this.chatService.saveMessage(conversationId, user.sub, content);

      // Báo lại cho người gửi để thay thế optimistic message
      if (tempId) {
        client.emit('messageStatusUpdate', {
          messageId: message.id,
          tempId,
          conversationId,
          status: 'sent',
        });
      }

      // Gửi message thật cho những người còn lại trong room
      client.to(conversationId).emit('newMessage', tempId ? { ...message, tempId } : message);
    } catch (e) {
      this.logger.error(`Error sending message: ${e.message}`);
      client.emit('error', { message: 'Cannot send message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    const user = client.data.user;
    if (!user || !data.conversationId) return;
    
    this.logger.log(`User ${user.sub} typing in room ${data.conversationId}`);

    client.to(data.conversationId).emit('userTyping', {
      conversationId: data.conversationId,
      userId: user.sub,
    });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    const user = client.data.user;
    if (!user || !data.conversationId) return;

    this.logger.log(`User ${user.sub} stopped typing in room ${data.conversationId}`);

    client.to(data.conversationId).emit('userStoppedTyping', {
      conversationId: data.conversationId,
      userId: user.sub,
    });
  }

  // Phương thức để gọi từ các service khác
  notifyUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }
}
