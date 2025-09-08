// server/src/controllers/authController.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken'; // usato solo per decode fallback
import bcrypt from 'bcrypt';
import { pool } from '../db';
import { deriveRoleFromId } from '../utils/role';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';

const REFRESH_COOKIE = 'rt';

// ------------------ REGISTER ------------------
export async function register(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) return res.status(400).json({ message: 'Email e password richieste' });

  try {
    const exists = await pool.query('SELECT 1 FROM utenti WHERE LOWER(email)=LOWER($1)', [email]);
    if (exists.rowCount) return res.status(409).json({ message: 'Email già registrata' });

    const hash = await bcrypt.hash(password, 12);
    const ins = await pool.query(
      'INSERT INTO utenti (email, password, foto) VALUES ($1, $2, NULL) RETURNING id, email',
      [email, hash]
    );
    const user = ins.rows[0] as { id: number; email: string };

    const role = deriveRoleFromId(user.id);
    const payload = { sub: user.id, role };

    const accessToken = signAccessToken(payload);
    const { token: refreshToken, jti, exp } = signRefreshToken(payload);
    await insertSession(jti, user.id, exp);

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,                 // true in prod + https
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({ accessToken, user: { id: user.id, email: user.email, role } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Errore server' });
  }
}

// ------------------ LOGIN ------------------
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };

  try {
    const result = await pool.query(
      'SELECT id, email, password, foto FROM utenti WHERE LOWER(email)=LOWER($1)',
      [email]
    );
    if (!result.rowCount) return res.status(401).json({ message: 'Invalid credentials' });

    const row = result.rows[0] as { id: number; email: string; password: string; foto: string | null };
    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const role = deriveRoleFromId(row.id);
    const payload = { sub: row.id, role };

    const accessToken = signAccessToken(payload);
    const { token: refreshToken, jti, exp } = signRefreshToken(payload);
    await insertSession(jti, row.id, exp);

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,                 // true in prod + https
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken, user: { id: row.id, email: row.email, role, foto: row.foto ?? '' } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// ------------------ REFRESH (rotazione) ------------------
export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ message: 'Missing refresh token' });

  try {
    const decoded = verifyRefreshToken(token); // { sub, role, jti?, exp? }
    const { sub, role } = decoded;
    const oldJti = (decoded as any).jti as string | undefined;
    if (!oldJti) return res.status(401).json({ message: 'Invalid refresh token' });

    const valid = await isSessionValid(oldJti, sub);
    if (!valid) return res.status(401).json({ message: 'Invalid refresh token' });

    // ruota
    await revokeSession(oldJti);

    const accessToken = signAccessToken({ sub, role });
    const { token: newRt, jti: newJti, exp } = signRefreshToken({ sub, role });
    await insertSession(newJti, sub, exp);

    res.cookie(REFRESH_COOKIE, newRt, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,                 // true in prod + https
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ accessToken, user: { id: sub, role } });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

// ------------------ LOGOUT ------------------
export async function logout(req: Request, res: Response) {
  const rt = req.cookies?.[REFRESH_COOKIE];

  if (rt) {
    let jti: string | undefined;

    // 1) prova verify con secret runtime
    try {
      const decoded = verifyRefreshToken(rt) as any;
      jti = decoded?.jti;
    } catch {
      // 2) se verify fallisce (chiavi ruotate), prova decode best-effort
      const decoded = jwt.decode(rt) as any | null;
      jti = decoded?.jti;
    }

    if (jti) {
      try {
        await revokeSession(jti);
      } catch (e) {
        console.error('[logout] revokeSession error:', e);
      }
    }
  }

  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  return res.json({ ok: true });
}

// ------------------ LOGOUT ALL ------------------
export async function logoutAll(req: Request, res: Response) {
  const userId = (req as any).user?.sub as number | undefined;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    await pool.query(
      'UPDATE sessioni SET revocato = TRUE WHERE utente = $1 AND revocato = FALSE',
      [userId]
    );
    // cancella anche il cookie su questo device
    res.clearCookie('rt', { path: '/api/auth' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[logoutAll] error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// ------------------ ME (protetta) ------------------
export async function me(req: Request, res: Response) {
  const { sub, role } = (req as any).user as { sub: number; role: string };
  return res.json({ id: sub, role });
}

// ------------------ Helpers DB ------------------
async function insertSession(jti: string, userId: number, expUnix: number) {
  await pool.query(
    'INSERT INTO sessioni (jti, utente, scadenza) VALUES ($1,$2,to_timestamp($3))',
    [jti, userId, expUnix]
  );
}

async function revokeSession(jti: string) {
  await pool.query('UPDATE sessioni SET revocato = TRUE WHERE jti = $1', [jti]);
}

async function isSessionValid(jti: string, userId: number) {
  const r = await pool.query(
    'SELECT revocato, scadenza FROM sessioni WHERE jti = $1 AND utente = $2',
    [jti, userId]
  );
  if (r.rowCount === 0) return false;
  const row = r.rows[0] as { revocato: boolean; scadenza: Date };
  return !row.revocato && row.scadenza > new Date();
}
