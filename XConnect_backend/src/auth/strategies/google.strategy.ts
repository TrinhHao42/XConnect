import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'mock-client-id',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'mock-client-secret',
      callbackURL: 'http://localhost:8080/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails, id } = profile;
    const user = {
      email: emails[0].value,
      name: name ? `${name.givenName} ${name.familyName}` : '',
      providerId: id,
    };
    done(null, user);
  }
}
