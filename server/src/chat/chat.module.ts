import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';

const publicKey = fs.readFileSync(
  path.join(process.cwd(), 'keys', 'public_key.pem'),
  'utf8',
);

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      publicKey,
      verifyOptions: { algorithms: ['RS256'] },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService], // Exported for SocketGateway to use
})
export class ChatModule {}
