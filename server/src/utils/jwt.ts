import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types';

const ACCESS_SECRET: Secret  = process.env.JWT_ACCESS_SECRET || 'changeme';
const REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET || 'changeme';
const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES= process.env.REFRESH_EXPIRES_IN || '7d';

export function signAccessToken(payload: JwtPayload) {
  const options: SignOptions = { expiresIn: ACCESS_EXPIRES };
  return jwt.sign(payload, ACCESS_SECRET, options);
}

export function signRefreshToken(payload: JwtPayload) {
  const options: SignOptions = { expiresIn: REFRESH_EXPIRES };
  return jwt.sign(payload, REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
