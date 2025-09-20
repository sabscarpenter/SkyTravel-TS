import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  Role
} from '../utils/jwt';

// ------------------ CHECK EMAIL ------------------ 
export async function email(req: Request, res: Response) {
  const email = req.query.email;
  const result = await pool.query(
      'SELECT email FROM utenti WHERE LOWER(email)=LOWER($1)',
      [email]
    );
    if (result.rowCount) return res.status(400).json({ message: 'Email già registrata' });

  return res.status(200).json({ message: 'Email disponibile' });
}

// ------------------ REGISTER ------------------
export async function register(req: Request, res: Response) {
  const { email, password, dati } = req.body as {
    email: string;
    password: string;
    dati: {
      nome: string;
      cognome: string;
      codiceFiscale: string;
      dataNascita: string;
      sesso: 'M' | 'F';
    };
  };

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e password richieste' });
  }
  if (!dati?.nome || !dati?.cognome || !dati?.codiceFiscale || !dati?.dataNascita || !dati?.sesso) {
    return res.status(400).json({ message: 'Dati passeggero incompleti' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash(password, 12);

    await client.query('SELECT pg_advisory_xact_lock($1)', [1002]);
    const insUser = await client.query(
      `WITH prossimo AS (
         SELECT COALESCE((SELECT MAX(u.id) FROM utenti u WHERE u.id >= 100), 99) + 1 AS id
       )
       INSERT INTO utenti (id, email, password, foto)
       SELECT p.id, $1, $2, $3
       FROM prossimo p
       RETURNING id, email, foto`,
      [email, hash, null]
    );

    const userRow = insUser.rows[0] as { id: number; email: string; foto: string | null };

    await client.query(
      `INSERT INTO passeggeri (utente, nome, cognome, codice_fiscale, data_nascita, sesso)
       VALUES ($1, $2, $3, $4, $5::date, $6)`,
      [
        userRow.id,
        dati.nome,
        dati.cognome,
        dati.codiceFiscale,
        dati.dataNascita,
        dati.sesso,
      ]
    );

    await client.query('COMMIT');

    const role = deriveRoleFromId(userRow.id);
    const payload = { sub: userRow.id, role };

    const accessToken = signAccessToken(payload);
    const { token: refreshToken, jti, exp } = signRefreshToken(payload);
    await insertSession(jti, userRow.id, exp);

    res.cookie('rt', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      accessToken,
      user: { id: userRow.id, nome: '', email: userRow.email, role, foto: userRow.foto ?? '' }
    });
  } catch (e: any) {
    await client.query('ROLLBACK');
    if (e?.code === '23505') {
      return res.status(409).json({ message: 'Dati già esistenti (email o codice fiscale)' });
    }
    console.error('[register-full] error:', e);
    return res.status(500).json({ message: 'Errore server' });
  } finally {
    client.release();
  }
}

// ------------------ LOGIN ------------------
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };

  try {
    const result = await pool.query(
      'SELECT id, email, password FROM utenti WHERE LOWER(email)=LOWER($1)',
      [email]
    );
    if (!result.rowCount) return res.status(400).json({ message: 'Email non trovata' });

    const row = result.rows[0] as { id: number; email: string; password: string };
    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(400).json({ message: 'Credenziali non valide' });

    const u = await getUserById(row.id);

    const accessToken = signAccessToken({ sub: u.id, role: u.role });
    const { token: refreshToken, jti, exp } = signRefreshToken({ sub: u.id, role: u.role });
    await insertSession(jti, u.id, exp);

    res.cookie('rt', refreshToken, {
      httpOnly: true, sameSite: 'lax', secure: false,
      path: '/api/auth', maxAge: 7*24*60*60*1000
    });

    let nome = '';
    if (u.role === 'COMPAGNIA') {
      const r = await pool.query(
        'SELECT nome FROM compagnie WHERE utente = $1',
        [u.id]
      );
      nome = r.rows[0]?.nome ?? '';
    }
    return res.json({ accessToken, user: { id: u.id, nome, email: u.email, role: u.role, foto: u.foto ?? '' } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// ------------------ REFRESH ------------------
export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.['rt'];
  if (!token) return res.status(401).json({ message: 'Missing refresh token' });

  try {
    const decoded = verifyRefreshToken(token);
    const { sub } = decoded;
    const jti = decoded.jti;
    if (!jti) return res.status(401).json({ message: 'Missing refresh token' });

    console.log('refresh error:', jti);

    const valid = await isSessionValid(jti);
    if (!valid) return res.status(401).json({ message: 'Invalid refresh token' });

    const u = await getUserById(sub);

    const accessToken = signAccessToken({ sub: u.id, role: u.role });

    return res.json({ accessToken, user: { id: u.id, email: u.email, role: u.role, foto: u.foto ?? '' } });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

// ------------------ LOGOUT ------------------
export async function logout(req: Request, res: Response) {
  const rt = req.cookies?.['rt'];

  if (rt) {
    let jti: string | undefined;

    try {
      const decoded = verifyRefreshToken(rt) as any;
      jti = decoded?.jti;
    } catch {
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

  res.clearCookie('rt', { path: '/api/auth' });
  return res.json({ ok: true });
}

// ------------------ LOGOUT ALL ------------------
export async function logoutAll(req: Request, res: Response) {
  const id = req.user!.sub;

  try {
    await pool.query(
      'UPDATE sessioni SET revocato = TRUE WHERE utente = $1 AND revocato = FALSE',
      [id]
    );

    res.clearCookie('rt', { path: '/api/auth' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[logoutAll] error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// ------------------ ME (protetta) ------------------
export async function me(req: Request, res: Response) {
  const id = req.user!.sub;
  if (id === undefined || id === null) return res.status(400).json({ message: 'Unauthorized' });
  try {
    const u = await getUserById(id);
    let nome: string | undefined;
    if (u.role === 'COMPAGNIA') {
      const r = await pool.query(
        'SELECT nome FROM compagnie WHERE utente = $1',
        [u.id]
      );
      nome = r.rows[0]?.nome ?? '';
    }
    return res.json({ id: u.id, nome: nome, email: u.email, role: u.role, foto: u.foto ?? ''});
  } catch {
    return res.status(404).json({ message: 'User not found' });
  }
}

// ------------------ Helpers DB ------------------
async function getUserById(id: number): Promise<{ id:number; email:string; role:Role; foto:string | null }> {
  const r = await pool.query('SELECT id, email, foto FROM utenti WHERE id = $1', [id]);
  if (!r.rowCount) throw new Error('User not found');
  const row = r.rows[0] as { id:number; email:string; foto:string | null };
  const role = deriveRoleFromId(row.id);
  return { id: row.id, email: row.email, role: role, foto: row.foto };
}

export function deriveRoleFromId(id: number): Role {
  if (id === 0) return 'ADMIN';
  if (id >= 1 && id <= 99) return 'COMPAGNIA';
  return 'PASSEGGERO';
}

async function insertSession(jti: string, userId: number, expUnix: number) {
  await pool.query(
    'INSERT INTO sessioni (jti, utente, scadenza) VALUES ($1,$2,to_timestamp($3))',
    [jti, userId, expUnix]
  );
}

async function revokeSession(jti: string) {
  await pool.query('UPDATE sessioni SET revocato = TRUE WHERE jti = $1', [jti]);
}

async function isSessionValid(jti: string) {
  const r = await pool.query(
    'SELECT revocato, scadenza FROM sessioni WHERE jti = $1',
    [jti]
  );
  if (r.rowCount === 0) console.log('righe non trovate');
  const row = r.rows[0] as { revocato: boolean; scadenza: Date };
  if (row.revocato) console.log('revocato');
  if (row.scadenza < new Date()) console.log('scaduto');
  if (r.rowCount === 0) return false;
  return !row.revocato && row.scadenza > new Date();
}
