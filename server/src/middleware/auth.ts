import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing/invalid Authorization header' });
  }
  const token = auth.substring('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = payload; // attach payload
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
