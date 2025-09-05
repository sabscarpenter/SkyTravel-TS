import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const r = Router();

r.get('/only-admin', requireAuth, requireRole('ADMIN'), (req, res) => {
  res.json({ secret: 'ciao admin' });
});

r.get('/only-compagnie', requireAuth, requireRole('COMPAGNIA'), (req, res) => {
  res.json({ data: 'rotta compagnia' });
});

r.get('/only-passeggeri', requireAuth, requireRole('PASSEGGERO'), (req, res) => {
  res.json({ data: 'rotta passeggero' });
});

export default r;
