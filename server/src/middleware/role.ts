import { Request, Response, NextFunction } from 'express';
import { Role } from '../utils/jwt';

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowed.includes(req.user!.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
