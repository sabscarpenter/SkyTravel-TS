import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { getProfile, updateProfilePhoto, getReservations, 
         getStatistics, updateEmail, updatePassword, 
         createSetupIntent, listPaymentMethods, deletePaymentMethod 
} from '../controllers/passeggeroController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';


// METODI PER IL CARICAMENTO DELLE IMMAGINI
const uploadsDir = path.join(process.cwd(), 'uploads', 'passeggeri');
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Invalid file type'));
  },
});

const passeggeroRouter = Router();

passeggeroRouter.get('/profile', requireAuth, requireRole('PASSEGGERO'), getProfile);
passeggeroRouter.post('/update/foto', requireAuth, requireRole('PASSEGGERO'), upload.single('file'), updateProfilePhoto); 
passeggeroRouter.get('/reservations', requireAuth, requireRole('PASSEGGERO'), getReservations);
passeggeroRouter.get('/statistics', requireAuth, requireRole('PASSEGGERO'), getStatistics);
passeggeroRouter.put('/aggiorna-email', requireAuth, requireRole('PASSEGGERO'), updateEmail);
passeggeroRouter.put('/aggiorna-password', requireAuth, requireRole('PASSEGGERO'), updatePassword);
passeggeroRouter.post('/stripe/setup-intent', requireAuth, requireRole('PASSEGGERO'), createSetupIntent);
passeggeroRouter.get('/stripe/payment-methods', requireAuth, requireRole('PASSEGGERO'), listPaymentMethods);
passeggeroRouter.delete('/stripe/payment-methods/:pmId', requireAuth, requireRole('PASSEGGERO'), deletePaymentMethod);

export default passeggeroRouter;