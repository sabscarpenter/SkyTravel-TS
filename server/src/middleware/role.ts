import { Request, Response, NextFunction } from 'express';
import { Role } from '../utils/role';

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as { role?: Role };
    if (!user?.role) return res.status(401).json({ message: 'Unauthorized' });
    if (!allowed.includes(user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
