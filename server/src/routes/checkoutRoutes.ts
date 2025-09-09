import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { insertTickets, createPaymentIntent, getPaymentIntent } from '../controllers/checkoutController';

const checkoutRouter = Router();

checkoutRouter.post('/insert-tickets', requireAuth, requireRole('PASSEGGERO', 'ADMIN'), insertTickets); 
checkoutRouter.post('/create-payment-intent', requireAuth, requireRole('PASSEGGERO', 'ADMIN'), createPaymentIntent);
checkoutRouter.get('/payment-intent/:pi_id', requireAuth, requireRole('PASSEGGERO', 'ADMIN'), getPaymentIntent);

export default checkoutRouter;