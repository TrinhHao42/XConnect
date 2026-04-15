import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CallGateway } from './call.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  providers: [CallGateway],
})
export class CallModule {}
