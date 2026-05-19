import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';

// Load public key để verify RS256 token
const publicKey = fs.readFileSync(
  path.join(process.cwd(), 'keys', 'public_key.pem'),
  'utf8',
);

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      publicKey: publicKey,
      verifyOptions: {
        algorithms: ['RS256'],
      },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
