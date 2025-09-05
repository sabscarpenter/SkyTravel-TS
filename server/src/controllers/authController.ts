import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import { deriveRoleFromId } from '../utils/role';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

const REFRESH_COOKIE = 'rt';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };

  try {
    // Cerca l’utente nel DB
    const result = await pool.query(
      'SELECT id, email, password FROM utenti WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verifica password
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // Deriva ruolo dall’id
    const role = deriveRoleFromId(user.id);
    const payload = { sub: user.id, role };

    // Genera token
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Refresh token nel cookie
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // true in produzione con https
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      accessToken,
      user: { id: user.id, email: user.email, role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
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
  const { sub, role } = (req as any).user as { sub: number; role: string };
  return res.json({ id: sub, role });
}
