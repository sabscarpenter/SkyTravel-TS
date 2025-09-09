import { Router } from 'express';
import { compagnie } from '../controllers/adminController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const adminRouter = Router();
adminRouter.get('/compagnie', requireAuth, requireRole('ADMIN'), compagnie);

export default adminRouter;
