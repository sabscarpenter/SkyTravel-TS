import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

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

// GET /api/passeggero/profile
passeggeroRouter.get('/profile', (_req: Request, res: Response) => {
  // TODO: replace with DB query using authenticated user
  const profile = {
    nome: 'Mario',
    cognome: 'Rossi',
    email: 'mario.rossi@example.com',
    codice_fiscale: 'RSSMRA80A01H501U',
    data_nascita: '1980-01-01',
    sesso: 'M',
    foto: '',
  };
  res.json(profile);
});

// POST /api/passeggero/update-photo
passeggeroRouter.post('/update-photo', upload.single('profile_picture'), (req: Request, res: Response) => {
  const filename = (req.file && req.file.filename) || '';
  res.json({ message: 'Foto profilo aggiornata', filename });
});

// GET /api/passeggero/reservations
passeggeroRouter.get('/reservations', (_req: Request, res: Response) => {
  // Sample data adhering to TicketData interface
  const data = [
    {
      firstName: 'Mario',
      lastName: 'Rossi',
      dateOfBirth: '1980-01-01',
      flightNumber: 'SKY123',
      from: 'FCO',
      to: 'AMS',
      cityFrom: 'Roma',
      cityTo: 'Amsterdam',
      departureDate: '2025-10-01',
      departureTime: '10:30',
      direction: 'andata',
      seatNumber: '12A',
      seatClass: 'economy',
      seatPrice: 129.99,
      extraBags: 1,
    },
  ];
  res.json(data);
});

// GET /api/passeggero/statistics
passeggeroRouter.get('/statistics', (_req: Request, res: Response) => {
  const stats = {
    totalFlights: 12,
    visitedCountries: 5,
    kilometersFlown: 8450,
    flightsThisYear: 4,
  };
  res.json(stats);
});

// PUT /api/passeggero/aggiorna-email
passeggeroRouter.put('/aggiorna-email', (req: Request, res: Response) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'Email mancante' });
  // TODO: validate and persist
  res.json({ message: 'Email aggiornata con successo' });
});

// PUT /api/passeggero/aggiorna-password
passeggeroRouter.put('/aggiorna-password', (req: Request, res: Response) => {
  const { passwordAttuale, nuovaPassword } = req.body || {};
  if (!passwordAttuale || !nuovaPassword) {
    return res.status(400).json({ message: 'Password mancanti' });
  }
  // TODO: verify and persist
  res.json({ message: 'Password aggiornata con successo' });
});

// POST /api/passeggero/stripe/setup-intent (stub)
passeggeroRouter.post('/stripe/setup-intent', (_req: Request, res: Response) => {
  // Stub client secret
  res.json({ clientSecret: 'seti_mock_client_secret' });
});

// GET /api/passeggero/stripe/payment-methods (stub)
passeggeroRouter.get('/stripe/payment-methods', (_req: Request, res: Response) => {
  res.json([
    { id: 'pm_1', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
  ]);
});

// DELETE /api/passeggero/stripe/payment-methods/:pmId (stub)
passeggeroRouter.delete('/stripe/payment-methods/:pmId', (req: Request, res: Response) => {
  const { pmId } = req.params;
  // TODO: delete pm from provider
  res.json({ message: `Metodo ${pmId} rimosso` });
});
