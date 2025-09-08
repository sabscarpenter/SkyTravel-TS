import { Router } from 'express';
import { register, login, refresh, logout, me } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const authRouter = Router();
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, me);

export default authRouter;
