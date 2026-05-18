import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CallGateway } from './call.gateway';
import { AgoraController } from './agora.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  providers: [CallGateway],
  controllers: [AgoraController],
})
export class CallModule {}
