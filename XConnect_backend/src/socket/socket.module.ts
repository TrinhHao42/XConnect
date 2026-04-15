import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key', // Bạn có thể update secret key cho khớp với bên Auth
    }),
  ],
  providers: [SocketGateway],
})
export class SocketModule { }
