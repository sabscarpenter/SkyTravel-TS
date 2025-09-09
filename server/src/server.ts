// server/src/server.ts
import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from 'path';
import { pool } from './db';
import { setJwtSecrets, generateRandomSecret } from './utils/jwt';
import authRoutes from './routes/authRoutes';
import passeggeroRouter from './routes/passeggeroRoutes';
import aeroportiRouter from './routes/aeroportiRoutes';
import soluzioniRouter from './routes/soluzioniRoutes';
import compagniaRouter from "./routes/compagniaRoutes";
import bookingRouter from "./routes/bookingRoutes";
import checkoutRouter from "./routes/checkoutRoutes";
import { stripeWebhook } from './controllers/checkoutController';
import { seedAdminIfMissing } from './admin';

dotenv.config();

async function invalidateAllSessions() {
  try {
    await pool.query('UPDATE sessioni SET revocato = TRUE WHERE revocato = FALSE');
    console.log('[sessions] tutte le sessioni revocate');
  } catch (e) {
    console.error('[sessions] errore revoke massiva:', e);
  }
}

function pickSecrets() {
  const rotate = process.env.ROTATE_SECRETS_ON_START === '1';
  if (rotate) {
    const access = generateRandomSecret();
    const refresh = generateRandomSecret();
    console.log('[jwt] rotate ON → uso secrets random ad ogni avvio');
    return { access, refresh, rotated: true };
  }
  const access = process.env.JWT_ACCESS_SECRET || generateRandomSecret();
  const refresh = process.env.JWT_REFRESH_SECRET || generateRandomSecret();
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    console.warn('[jwt] env non complete → uso fallback random (i token verranno invalidati a ogni avvio)');
  } else {
    console.log('[jwt] uso secrets da .env');
  }
  return { access, refresh, rotated: false };
}

async function bootstrap() {
  const { access, refresh, rotated } = pickSecrets();
  setJwtSecrets(access, refresh);
  if (rotated) await invalidateAllSessions();

  const app: Application = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:4200'],
    credentials: true,
  }));
  // Stripe webhook: registrare raw body prima del json parser generale
  app.post('/api/checkout/stripe-webhook', express.raw({ type: 'application/json' }), stripeWebhook);
  // Parser JSON per il resto delle route
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/passeggero/uploads/profile-pictures',
    express.static(path.join(process.cwd(), 'uploads', 'profile-pictures')));

  app.use('/api/auth', authRoutes);
  app.use('/api/passeggero', passeggeroRouter);
  app.use('/api/aeroporti', aeroportiRouter);
  app.use('/api/soluzioni', soluzioniRouter);
  app.use('/api/compagnia', compagniaRouter);
  app.use('/api/booking', bookingRouter);
  app.use('/api/checkout', checkoutRouter);

  app.get("/", (_req: Request, res: Response) => res.send("Backend funzionante!"));

  await seedAdminIfMissing();

  app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Errore bootstrap server:', err);
  process.exit(1);
});
