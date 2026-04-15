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
  cors: {
    origin: true,
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('SocketGateway');

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('Socket initialized');
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
      
      this.logger.log(`Client connected & authenticated: ${client.id} (User ID: ${payload.sub})`);
    } catch (error) {
      this.logger.warn(`Client connection rejected: ${client.id} - Reason: ${error.message}`);
      client.disconnect(); // Đóng kết nối nếu token sai / không có
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('pingServer')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.log(`Ping received from ${client.id}: ${JSON.stringify(data)}`);
    // Example: send back to client
    client.emit('pongClient', { message: 'Hello from server!', originalId: client.id });
  }
}
