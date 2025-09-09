// server/src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';

export async function compagnie(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT u.id, c.nome, c.codice_IATA, u.email, c.nazione FROM utenti u JOIN compagnie c ON u.id = c.utente ORDER BY u.id');
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}