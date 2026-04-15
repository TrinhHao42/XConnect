import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || 'mock-client-id',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || 'mock-client-secret',
      callbackURL: 'http://localhost:8080/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any): Promise<any> {
    const { username, displayName, emails, id } = profile;
    const user = {
      email: emails?.[0]?.value || `${username}@github.com`,
      name: displayName || username,
      providerId: id,
    };
    done(null, user);
  }
}
