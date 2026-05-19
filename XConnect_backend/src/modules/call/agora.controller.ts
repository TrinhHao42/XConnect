import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';

function toAgoraUid(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = String(value ?? '').trim();
  if (!text) return 0;

  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric);
  }

  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) || 1;
}

@Controller('call')
export class AgoraController {
  constructor(private readonly jwtService: JwtService) {}

  @Get('token')
  async getToken(
    @Req() req: { headers?: { authorization?: string }; query?: { token?: string } },
    @Query('channelName') channelName: string,
    @Query('uid') uidQuery?: string,
    @Query('expiry') expirySec?: string,
  ) {
    const authToken =
      req.headers?.authorization?.split(' ')[1] ?? (req.query?.token as string | undefined);
    if (!authToken) throw new UnauthorizedException('Missing auth token');

    const payload = await this.jwtService.verifyAsync<{ sub?: string; userId?: string; id?: string }>(authToken).catch(() => {
      throw new UnauthorizedException('Invalid token');
    });

    const userId = String(payload?.sub || payload?.userId || payload?.id || '0');
    const uid = toAgoraUid(uidQuery ?? userId);

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
