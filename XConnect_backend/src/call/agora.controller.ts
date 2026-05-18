import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

@Controller('call')
export class AgoraController {
  constructor(private readonly jwtService: JwtService) {}

  @Get('token')
  async getToken(
    @Req() req: any,
    @Query('channelName') channelName: string,
    @Query('uid') uidQuery?: string,
    @Query('expiry') expirySec?: string,
  ) {
    const authHeader =
      req.headers?.authorization?.split(' ')[1] || req.query?.token;
    if (!authHeader) throw new UnauthorizedException('Missing auth token');

    const payload = await this.jwtService.verifyAsync(authHeader).catch(() => {
      throw new UnauthorizedException('Invalid token');
    });

    const userId =
      payload?.sub || payload?.userId || String(payload?.id || '0');
    const uid = Number(uidQuery ?? userId) || 0;

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      throw new Error('Missing Agora App ID or App Certificate in environment');
    }

    const ttl = Number(expirySec || '3600');
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + ttl;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs,
    );

    return { token, appId, uid };
  }
}
