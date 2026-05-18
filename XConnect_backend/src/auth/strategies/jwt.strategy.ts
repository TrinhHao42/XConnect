import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AuthService } from '../auth.service';

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

  async validate(req: any, payload: any) {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (accessToken) {
      const isBlacklisted =
        await this.authService.isTokenBlacklisted(accessToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token đã bị thu hồi');
      }
    }

    return { userId: payload.sub };
  }
}
