import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { decryptUserId } from '../../common/utils/crypto.util';

const publicKey = fs.readFileSync(
  path.join(process.cwd(), 'keys', 'public_key.pem'),
  'utf8',
);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string; [key: string]: unknown }) {
    const authHeader = req.headers['authorization'] ?? '';
    const accessToken = typeof authHeader === 'string'
      ? authHeader.split(' ')[1]
      : undefined;
    if (accessToken) {
      const isBlacklisted =
        await this.authService.isTokenBlacklisted(accessToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token đã bị thu hồi');
      }
    }

    const decryptedUserId = decryptUserId(payload.sub);
    return { userId: decryptedUserId, sub: decryptedUserId };
  }
}
