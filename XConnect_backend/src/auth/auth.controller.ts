import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import type { AuthRequest } from '../common/types/auth-request.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.register(body);
    this.setRefreshTokenCookie(res, data.refreshToken);
    return { accessToken: data.accessToken, user: data.user };
  }

  @Post('login')
  async login(
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.login(body);
    this.setRefreshTokenCookie(res, data.refreshToken);
    return { accessToken: data.accessToken, user: data.user };
  }

  @Post('supabase-login')
  async supabaseLogin(
    @Body('access_token') accessToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.supabaseLogin(accessToken);
    this.setRefreshTokenCookie(res, data.refreshToken);
    return { accessToken: data.accessToken, user: data.user };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken = (req.cookies as Record<string, string>)
      ?._xcsid;
    const tokens = await this.authService.refreshTokens(oldRefreshToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = (req.headers.authorization ?? '').split(' ')[1] ?? '';
    const refreshToken =
      (req.cookies as Record<string, string>)?._xcsid ?? '';

    await this.authService.logout(accessToken, refreshToken);
    res.clearCookie('_xcsid');
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthRequest) {
    return this.authService.getMe(String(req.user.sub || req.user.userId));
  }

  @Get('verify-token')
  async verifyToken(@Query('token') token: string) {
    return this.authService.verifyTokenRaw(token);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: Record<string, unknown>) {
    return this.authService.resetPassword(body);
  }

  // --- OAuth2 Google ---
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() _req: Request) {
    // AuthGuard automatically redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.oauthLogin(req.user, 'google');
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  // --- OAuth2 Github ---
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth(@Req() _req: Request) {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.oauthLogin(req.user, 'github');
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('_xcsid', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
