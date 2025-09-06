import { Router } from 'express';
import { register, login, refresh, logout, me } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const r = Router();
r.post('/register', register);
r.post('/login', login);
r.post('/refresh', refresh);
r.post('/logout', logout);
r.get('/me', requireAuth, me);

export default r;
