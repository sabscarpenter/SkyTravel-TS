import { Router } from 'express';
import { register, login, logoutAll, refresh, logout, me } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const authRouter = Router();
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/logout-all', requireAuth, logoutAll);
authRouter.post('/refresh', refresh);
authRouter.get('/me', requireAuth, me);

export default authRouter;
