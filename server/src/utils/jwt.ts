import jwt, { Secret, SignOptions, TokenExpiredError } from 'jsonwebtoken';

// ruoli possibili
export type Role = 'ADMIN' | 'COMPAGNIA' | 'PASSEGGERO';

// payload dentro al JWT
export interface JwtPayload {
  sub: number; // user id
  role: Role;
}

// modello user (se serve anche fuori, lascialo qui)
export interface User {
  id: number;
  email: string;
  password: string;
}

const ACCESS_SECRET: Secret  = process.env.JWT_ACCESS_SECRET  || 'dev_access_secret';
const REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

const ACCESS_EXPIRES: SignOptions['expiresIn']  = (process.env.ACCESS_EXPIRES_IN  || '15m') as any;
const REFRESH_EXPIRES: SignOptions['expiresIn'] = (process.env.REFRESH_EXPIRES_IN || '7d')  as any;

const randId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES, jwtid: randId() });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES, jwtid: randId() });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as unknown as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as unknown as JwtPayload;
}

export { TokenExpiredError };
