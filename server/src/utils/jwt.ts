// server/src/utils/jwt.ts
import jwt, { Secret, SignOptions, TokenExpiredError, JwtPayload as LibJwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

export type Role = 'ADMIN' | 'COMPAGNIA' | 'PASSEGGERO';
export interface JwtPayload { sub: number; role: Role }

// === Secrets mutabili, inizializzate a runtime ===
let ACCESS_SECRET: Secret  = 'accesso_segreto';
let REFRESH_SECRET: Secret = 'refresh_segreto';

export function setJwtSecrets(access: Secret, refresh: Secret) {
  ACCESS_SECRET = access;
  REFRESH_SECRET = refresh;
}
export function generateRandomSecret(bytes = 64): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// Durate
const ACCESS_EXPIRES: SignOptions['expiresIn']  = (process.env.ACCESS_EXPIRES_IN  || '15m') as any;
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
  const decoded = jwt.decode(token) as LibJwtPayload | null;
  const exp = decoded?.exp ?? Math.floor(Date.now()/1000) + 7*24*3600;
  return { token, jti, exp };
}
export function verifyRefreshToken(token: string): JwtPayload & { jti?: string; exp?: number } {
  return jwt.verify(token, REFRESH_SECRET) as unknown as (JwtPayload & { jti?: string; exp?: number });
}

export { TokenExpiredError };
