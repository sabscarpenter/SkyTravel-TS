import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types';

const ACCESS_SECRET: Secret  = process.env.JWT_ACCESS_SECRET || 'changeme';
const REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET || 'changeme';
const ACCESS_EXPIRES = (process.env.ACCESS_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
const REFRESH_EXPIRES = (process.env.REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as unknown as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as unknown as JwtPayload;
}
