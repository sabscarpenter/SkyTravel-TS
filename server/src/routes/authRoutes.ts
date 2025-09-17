import { Router } from 'express';
import { email, register, login, logoutAll, refresh, logout, me } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const authRouter = Router();

authRouter.get('/email', email);
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/logout-all', requireAuth, logoutAll);
authRouter.post('/refresh', refresh);
authRouter.get('/me', requireAuth, me);

export default authRouter;
