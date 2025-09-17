import jwt, { SignOptions, TokenExpiredError } from 'jsonwebtoken';
import crypto from 'crypto';

export type Role = 'ADMIN' | 'COMPAGNIA' | 'PASSEGGERO';
export interface JwtPayload { sub: number; role: Role; exp?: number | undefined; }

let ACCESS_SECRET: string = 'accesso_segreto';
let REFRESH_SECRET: string = 'refresh_segreto';

export function setJwtSecrets(access: string | undefined, refresh: string | undefined) {
  ACCESS_SECRET = access || 'accesso_segreto';
  REFRESH_SECRET = refresh || 'refresh_segreto';
}
export function generateRandomSecret(bytes = 64): string {
  return crypto.randomBytes(bytes).toString('hex');
}

const ACCESS_EXPIRES: SignOptions['expiresIn']  = (process.env.ACCESS_EXPIRES_IN  || '5m') as any;
const REFRESH_EXPIRES: SignOptions['expiresIn'] = (process.env.REFRESH_EXPIRES_IN || '7d')  as any;

const randId = () => crypto.randomUUID();

// -------- ACCESS --------
export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES, jwtid: randId() });
}
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as unknown as JwtPayload;
}

// -------- REFRESH --------
export function signRefreshToken(payload: JwtPayload): { token: string; jti: string; exp: number } {
  const jti = randId();
  const token = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES, jwtid: jti });
  const decoded = jwt.decode(token) as JwtPayload | null;
  const exp = decoded?.exp;
  if (!exp) throw new Error('Cannot extract exp from just-signed refresh token');
  return { token, jti, exp };
}
export function verifyRefreshToken(token: string): JwtPayload & { jti?: string; exp?: number } {
  return jwt.verify(token, REFRESH_SECRET) as unknown as (JwtPayload & { jti?: string; exp?: number });
}

export { TokenExpiredError };
