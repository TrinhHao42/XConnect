import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CallGateway } from './call.gateway';
import { AgoraController } from './agora.controller';
import * as fs from 'fs';
import * as path from 'path';

// Load public key để verify RS256 token (chỉ cần public key, không cần private key)
const publicKey = fs.readFileSync(path.join(process.cwd(), 'keys', 'public_key.pem'), 'utf8');

@Module({
  imports: [
    JwtModule.register({
      publicKey: publicKey,
      verifyOptions: {
        algorithms: ['RS256'],
      },
    }),
  ],
  providers: [CallGateway],
  controllers: [AgoraController],
})
export class CallModule {}
