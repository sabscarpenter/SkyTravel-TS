import { Router } from 'express';
import { compagnie, passeggeri, removeCompagnia, removePasseggero } from '../controllers/adminController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const adminRouter = Router();
adminRouter.get('/compagnie', requireAuth, requireRole('ADMIN'), compagnie);
adminRouter.get('/passeggeri', requireAuth, requireRole('ADMIN'), passeggeri);
adminRouter.delete('/compagnie/:id', requireAuth, requireRole('ADMIN'), removeCompagnia);
adminRouter.delete('/passeggeri/:id', requireAuth, requireRole('ADMIN'), removePasseggero);

export default adminRouter;
