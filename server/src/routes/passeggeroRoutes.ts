import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { getProfile, updateProfilePhoto, getReservations, getStatistics, updateEmail, updatePassword} from '../controllers/passeggeroController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// METODI PER IL CARICAMENTO DELLE IMMAGINI
const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
fs.mkdirSync(uploadsDir, { recursive: true });

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

// ----------------------------------------------------
const passeggeroRouter = Router();

passeggeroRouter.get('/profile', requireAuth, requireRole('PASSEGGERO'), getProfile);
passeggeroRouter.post('/update-photo', requireAuth, requireRole('PASSEGGERO'), upload.single('profile_picture'), updateProfilePhoto); // DA CONTROLLARE
passeggeroRouter.get('/reservations', requireAuth, requireRole('PASSEGGERO'), getReservations);
passeggeroRouter.get('/statistics', requireAuth, requireRole('PASSEGGERO'), getStatistics);
passeggeroRouter.put('/aggiorna-email', requireAuth, requireRole('PASSEGGERO'), updateEmail);
passeggeroRouter.put('/aggiorna-password', requireAuth, requireRole('PASSEGGERO'), updatePassword);

// ------------------ DA IMPLEMENTARE ------------------

// POST /api/passeggero/stripe/setup-intent (stub)
passeggeroRouter.post('/stripe/setup-intent', requireAuth, requireRole('PASSEGGERO'), async (_req: Request, res: Response) => {
  // Stub client secret
  res.json({ clientSecret: 'seti_mock_client_secret' });
});

// GET /api/passeggero/stripe/payment-methods (stub)
passeggeroRouter.get('/stripe/payment-methods', requireAuth, requireRole('PASSEGGERO'), async (_req: Request, res: Response) => {
  res.json([
    { id: 'pm_1', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
  ]); 
});

// DELETE /api/passeggero/stripe/payment-methods/:pmId (stub)
passeggeroRouter.delete('/stripe/payment-methods/:pmId', requireAuth, requireRole('PASSEGGERO'), async (req: Request, res: Response) => {
  const { pmId } = req.params;
  // TODO: delete pm from provider
  res.json({ message: `Metodo ${pmId} rimosso` });
});

export default passeggeroRouter;