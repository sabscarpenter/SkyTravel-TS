import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenExpiredError } from '../utils/jwt';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  const token = auth.slice(7); // dopo "Bearer "
  try {
    const payload = verifyAccessToken(token); // { sub, role }
    req.user = payload;
    return next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      // il client dovrà chiamare /auth/refresh e poi ritentare
      return res.status(401).json({ message: 'Access token expired', code: 'ACCESS_TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid access token' });
  }
}
