import { Router } from 'express';
import { compagnie, passeggeri, removeCompagnia, removePasseggero, aggiungi, compagnieInAttesa, removeCompagniaInAttesa } from '../controllers/adminController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// METODI PER IL CARICAMENTO DELLE IMMAGINI
const uploadsDir = path.join(process.cwd(), 'uploads', 'compagnie');
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

const adminRouter = Router();

adminRouter.get('/compagnie', requireAuth, requireRole('ADMIN'), compagnie);
adminRouter.get('/passeggeri', requireAuth, requireRole('ADMIN'), passeggeri);
adminRouter.delete('/compagnie/:id', requireAuth, requireRole('ADMIN'), removeCompagnia);
adminRouter.delete('/passeggeri/:id', requireAuth, requireRole('ADMIN'), removePasseggero);
adminRouter.post('/aggiungi', requireAuth, requireRole('ADMIN'), upload.single('file'), aggiungi);
adminRouter.get('/compagnie/attesa', requireAuth, requireRole('ADMIN'), compagnieInAttesa);
adminRouter.delete('/compagnie/attesa/:id', requireAuth, requireRole('ADMIN'), removeCompagniaInAttesa);

export default adminRouter;
