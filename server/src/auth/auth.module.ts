import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import * as fs from 'fs';
import * as path from 'path';

// Load keys
const privateKey = fs.readFileSync(
  path.join(process.cwd(), 'keys', 'private_key.pem'),
  'utf8',
);
const publicKey = fs.readFileSync(
  path.join(process.cwd(), 'keys', 'public_key.pem'),
  'utf8',
);

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      privateKey: privateKey,
      publicKey: publicKey,
      signOptions: {
        algorithm: 'RS256',
        expiresIn: '15m',
      },
      verifyOptions: {
        algorithms: ['RS256'],
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, GithubStrategy],
  exports: [AuthService],
})
export class AuthModule {}
