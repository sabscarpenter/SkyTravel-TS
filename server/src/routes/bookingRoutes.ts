import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { getModelConfiguration, getOccupiedSeats, reserveSeats } from '../controllers/bookingController';

const bookingRouter = Router();

bookingRouter.get('/configuration', requireAuth, requireRole('PASSEGGERO'), getModelConfiguration);
bookingRouter.get('/seats', requireAuth, requireRole('PASSEGGERO'), getOccupiedSeats);
bookingRouter.post('/seats/reserve', requireAuth, requireRole('PASSEGGERO'), reserveSeats);

export default bookingRouter;