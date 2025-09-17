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
import adminRouter from "./routes/adminRoutes";
import checkoutRouter from "./routes/checkoutRoutes";
import { stripeWebhook } from './controllers/checkoutController';
import { caricaAdmin } from './admin';

dotenv.config();

async function invalidateAllSessions() {
  try {
    await pool.query('UPDATE sessioni SET revocato = TRUE WHERE revocato = FALSE');
    console.log('[sessions] tutte le sessioni revocate');
  } catch (e) {
    console.error('[sessions] errore revoke massiva:', e);
  }
}

function pickSecrets(): { access: string | undefined; refresh: string | undefined; rotated: boolean } {
  if (process.env.ROTATE_SECRETS_ON_START === '1') {
    const access = generateRandomSecret();
    const refresh = generateRandomSecret();
    console.log('[jwt] rotate ON → uso secrets random ad ogni avvio');
    return { access, refresh, rotated: true };
  }
  const access: string | undefined = process.env.JWT_ACCESS_SECRET;
  const refresh: string | undefined = process.env.JWT_REFRESH_SECRET;
  console.log('[jwt] uso secrets da .env');
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
  app.post('/api/checkout/stripe-webhook', express.raw({ type: 'application/json' }), stripeWebhook);
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/passeggero/uploads/passeggeri',
  express.static(path.join(process.cwd(), 'uploads', 'passeggeri')));

  app.use('/api/admin/uploads/compagnie',
  express.static(path.join(process.cwd(), 'uploads', 'compagnie')));

  app.use('/api/auth', authRoutes);
  app.use('/api/passeggero', passeggeroRouter);
  app.use('/api/aeroporti', aeroportiRouter);
  app.use('/api/soluzioni', soluzioniRouter);
  app.use('/api/compagnia', compagniaRouter);
  app.use('/api/booking', bookingRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/checkout', checkoutRouter);

  app.get("/", (_req: Request, res: Response) => res.send("Backend funzionante!"));

  await caricaAdmin();

  app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Errore bootstrap server:', err);
  process.exit(1);
});
