import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { users } from '../data/users';
import { deriveRoleFromId } from '../utils/role';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

const REFRESH_COOKIE = 'rt';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const role = deriveRoleFromId(user.id);
  const payload = { sub: user.id, role };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // metti true in produzione su https
    path: '/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    accessToken,
    user: { id: user.id, email: user.email, role }
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ message: 'Missing refresh token' });
  try {
    const { sub, role } = verifyRefreshToken(token);
    const accessToken = signAccessToken({ sub, role });
    return res.json({ accessToken, user: { id: sub, role } });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/auth/refresh' });
  return res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  // richiede requireAuth
  const { sub, role } = (req as any).user as { sub: number; role: string };
  return res.json({ id: sub, role });
}
