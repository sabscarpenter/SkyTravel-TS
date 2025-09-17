import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';

export async function compagnie(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT u.id AS utente, c.nome, u.email, c.nazione FROM utenti u JOIN compagnie c ON u.id = c.utente ORDER BY u.id');
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function passeggeri(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT u.id AS utente, u.email, p.nome, p.cognome, u.foto FROM utenti u JOIN passeggeri p ON u.id = p.utente ORDER BY u.id');
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removeCompagnia(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid company ID' });

  try {
    await pool.query('DELETE FROM utenti WHERE id = $1', [id]);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removePasseggero(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid passenger ID' });

  try {
    await pool.query('DELETE FROM utenti WHERE id = $1', [id]);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function aggiungi(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const file = req.file as Express.Multer.File | undefined;

  if (!email || !password || !file) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query(
      'SELECT 1 FROM utenti WHERE LOWER(email)=LOWER($1)',
      [email]
    );
    if (exists.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Email già registrata' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query('SELECT pg_advisory_xact_lock($1)', [1001]);

    const insCompany = await client.query(
      `
      WITH max_id AS (
        SELECT COALESCE(
                 (SELECT MAX(u.id) FROM utenti u WHERE u.id BETWEEN 10 AND 99),
                 9
               ) AS m
      ),
      prossimo AS (
        SELECT (m + 1) AS id FROM max_id
      )
      INSERT INTO utenti (id, email, password, foto)
      SELECT p.id, $1, $2, $3
      FROM prossimo p
      WHERE p.id <= 99
      RETURNING id
      `,
      [email, hashedPassword, file.filename]
    );

    if (insCompany.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Range ID compagnie esaurito' });
    }

    await client.query('COMMIT');

    return res.status(201).json({ message: 'Compagnia creata con successo!', id: insCompany.rows[0].id });
  } catch (err: any) {
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
}

export async function compagnieInAttesa(req: Request, res: Response) {
  try {
    const result = await pool.query(`SELECT u.id AS utente, u.email 
                                     FROM utenti u 
                                     WHERE u.id BETWEEN 10 AND 99 AND NOT EXISTS (
                                       SELECT 1 FROM compagnie c WHERE c.utente = u.id
                                     )
                                     ORDER BY u.id`);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function removeCompagniaInAttesa(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid company ID' });
  if (id < 10 || id > 99) return res.status(400).json({ message: 'ID non valido per una compagnia in attesa' });
  try {
    await pool.query('DELETE FROM utenti WHERE id = $1', [id]);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
