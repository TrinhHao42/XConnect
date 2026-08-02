import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  userId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user: JwtPayload;
}
