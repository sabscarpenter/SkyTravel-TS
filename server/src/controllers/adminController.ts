// server/src/controllers/authController.ts
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
    console.log(JSON.stringify(result.rows));
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
