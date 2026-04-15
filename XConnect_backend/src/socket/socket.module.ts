import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SocketGateway } from './socket.gateway';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
    ChatModule,
  ],
  providers: [SocketGateway],
})
export class SocketModule { }
