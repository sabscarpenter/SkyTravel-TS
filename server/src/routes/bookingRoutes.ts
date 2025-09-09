import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { getModelConfiguration, getOccupiedSeats, reserveSeats } from '../controllers/bookingController';

const bookingRouter = Router();

bookingRouter.get('/configuration', requireAuth, requireRole('PASSEGGERO', 'ADMIN'), getModelConfiguration);
bookingRouter.get('/seats', requireAuth, requireRole('PASSEGGERO', 'ADMIN'), getOccupiedSeats);
bookingRouter.post('/seats/reserve', requireAuth, requireRole('PASSEGGERO', 'ADMIN'), reserveSeats);

export default bookingRouter;