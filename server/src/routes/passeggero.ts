import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { pool } from '../db';

// Ensure upload directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
fs.mkdirSync(uploadsDir, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Invalid file type'));
  },
});

export const passeggeroRouter = Router();

// GET /api/passeggero/profile?email=...
passeggeroRouter.get('/profile', async (req: Request, res: Response) => {
  try {
    const { id } = req.query as { email?: string; id?: string };
    if (!id) return res.status(400).json({ message: 'Fornisci id' });

    // Adatta i nomi colonne/tabelle al tuo schema reale
    const q = `SELECT u.id, u.email, p.nome, p.cognome, p.codice_fiscale, p.data_nascita, p.sesso, u.foto
                FROM utenti u
                JOIN passeggeri p ON p.utente = u.id
                WHERE u.id = $1`;

    const params = [id];
    const { rows } = await pool.query(q, params);

    if (!rows.length) return res.status(404).json({ message: 'Passeggero non trovato' });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: 'Errore recupero profilo', error: err.message });
  }
});

// POST /api/passeggero/update-photo
passeggeroRouter.post('/update-photo', upload.single('profile_picture'), (req: Request, res: Response) => {
  const filename = (req.file && req.file.filename) || '';
  res.json({ message: 'Foto profilo aggiornata', filename });
});

// GET /api/passeggero/reservations
passeggeroRouter.get('/reservations', async (_req: Request, res: Response) => {
  try {
    const params = [100]; // Replace with actual passenger ID
    const query = `SELECT b.*, v.*, t.*, ap.citta AS citta_partenza, aa.citta AS citta_arrivo
                  FROM biglietti b
                  JOIN voli v ON b.volo = v.numero
                  JOIN tratte t ON v.tratta = t.numero
                  JOIN aeroporti ap ON t.partenza = ap."codice_IATA"
                  JOIN aeroporti aa ON t.arrivo = aa."codice_IATA"
                  WHERE b.utente = $1`;
    const { rows } = await pool.query(query, params);

    const reservations = [];
    for (const row of rows) {
      let seat_class = row.classe_posto === 'E' ? 'economy' : row.classe_posto === 'B' ? 'business' : 'first';
      reservations.push({
        firstName: row.nome,
        lastName: row.cognome,
        flightNumber: row.volo,
        from: row.partenza,
        to: row.arrivo,
        cityFrom: row.citta_partenza,
        cityTo: row.citta_arrivo,
        departureDate: row.data_partenza,
        departureTime: row.ora_partenza,
        seatNumber: row.posto,
        seatClass: seat_class,
        seatPrice: row.prezzo,
        extraBags: row.bagagli
      });
    }
    res.json(reservations);
  } catch (err: any) {
    res.status(500).json({ message: 'Errore recupero prenotazioni', error: err.message });
  }
});

// GET /api/passeggero/statistics
passeggeroRouter.get('/statistics', async (_req: Request, res: Response) => {
  try {
    const params = [100]; // Replace with actual passenger ID

    let query = `SELECT COUNT(DISTINCT t.arrivo) AS visited_countries, COALESCE(SUM(t.distanza), 0) AS total_km, COUNT(v.numero) AS total_flights
                 FROM biglietti b
                 JOIN voli v ON b.volo = v.numero
                 JOIN tratte t ON v.tratta = t.numero
                 WHERE b.utente = $1`;
    let result = await pool.query(query, params);

    query = `SELECT COUNT(*) AS flights_this_year FROM biglietti b
             JOIN voli v ON b.volo = v.numero
             WHERE b.utente = $1 AND EXTRACT(YEAR FROM v.data_ora_partenza) = EXTRACT(YEAR FROM CURRENT_DATE)`;
    let flights_this_year = await pool.query(query, params);

    const stats = {
      totalFlights: result.rows[0].total_flights,
      visitedCountries: result.rows[0].visited_countries,
      kilometersFlown: result.rows[0].total_km,
      flightsThisYear: flights_this_year.rows[0].flights_this_year,
    };
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ message: 'Errore recupero statistiche', error: err.message });
  }
});

// PUT /api/passeggero/aggiorna-email
passeggeroRouter.put('/aggiorna-email', async (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'Email mancante' });
  if (!/\S+@\S+\.\S+/.test(email)) return res.status(404).json({ message: 'Email non valida' });
  try {
    const query = 'SELECT * FROM utenti WHERE email = $1';
    const { rows } = await pool.query(query, [email]);
    if (rows.length) return res.status(405).json({ message: 'Email già in uso' });
    
    const q = 'UPDATE utenti SET email = $1 WHERE id = $2';
    const params = [email, 100]; // Sostituisci 100 con l'ID reale dell'utente
    await pool.query(q, params);
    res.json({ message: 'Email aggiornata con successo' });
  } catch (err) {
    return res.status(500).json({ message: 'Errore aggiornamento email', error: (err as Error).message });
  }
});

// PUT /api/passeggero/aggiorna-password
passeggeroRouter.put('/aggiorna-password', async (req: Request, res: Response) => {
  const { passwordAttuale, nuovaPassword } = req.body || {};
  if (!passwordAttuale || !nuovaPassword) {
    return res.status(400).json({ message: 'Password mancanti' });
  }
  // TODO: verify and persist
  res.json({ message: 'Password aggiornata con successo' });
});

// POST /api/passeggero/stripe/setup-intent (stub)
passeggeroRouter.post('/stripe/setup-intent', async (_req: Request, res: Response) => {
  // Stub client secret
  res.json({ clientSecret: 'seti_mock_client_secret' });
});

// GET /api/passeggero/stripe/payment-methods (stub)
passeggeroRouter.get('/stripe/payment-methods', async (_req: Request, res: Response) => {
  res.json([
    { id: 'pm_1', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
  ]); 
});

// DELETE /api/passeggero/stripe/payment-methods/:pmId (stub)
passeggeroRouter.delete('/stripe/payment-methods/:pmId', async (req: Request, res: Response) => {
  const { pmId } = req.params;
  // TODO: delete pm from provider
  res.json({ message: `Metodo ${pmId} rimosso` });
});
