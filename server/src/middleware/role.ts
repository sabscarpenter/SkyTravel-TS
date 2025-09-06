import { Request, Response, NextFunction } from 'express';
import { Role } from '../utils/role'; // 'ADMIN' | 'COMPAGNIA' | 'PASSEGGERO'

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: 'Unauthorized' });
    if (!allowed.includes(role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
