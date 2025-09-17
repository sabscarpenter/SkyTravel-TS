import { pool } from './db';
import bcrypt from 'bcrypt';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@esempio.it';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'admin';

export async function caricaAdmin() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query(
      'SELECT id FROM utenti WHERE id = 0 OR LOWER(email) = LOWER($1)',
      [ADMIN_EMAIL]
    );

    if (exists.rowCount && exists.rowCount > 0) {
      await client.query('ROLLBACK');
      console.log('[seed] admin già presente: skip');
      return;
    }

    const hash = await bcrypt.hash(ADMIN_PASS, 12);

    await client.query(
      `INSERT INTO utenti (id, email, password, foto)
       VALUES (0, $1, $2, NULL)`,
      [ADMIN_EMAIL, hash]
    );

    await client.query('COMMIT');
    console.log('[seed] admin creato (id=0, email=%s)', ADMIN_EMAIL);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[seed] errore seed admin:', e);
  }
}
