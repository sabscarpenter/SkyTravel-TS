import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { insertTickets, createPaymentIntent, getPaymentIntent } from '../controllers/checkoutController';

const checkoutRouter = Router();

checkoutRouter.post('/insert-tickets', requireAuth, requireRole('PASSEGGERO'), insertTickets); 
checkoutRouter.post('/create-payment-intent', requireAuth, requireRole('PASSEGGERO'), createPaymentIntent);
checkoutRouter.get('/payment-intent/:pi_id', requireAuth, requireRole('PASSEGGERO'), getPaymentIntent);

export default checkoutRouter;