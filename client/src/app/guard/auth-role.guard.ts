import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authRoleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRole = route.data?.['role'] as ('ADMIN' | 'COMPAGNIA' | 'PASSEGGERO' | undefined);

  const user = auth.user;
  
  if (!user) return router.createUrlTree(['/']);
  if (requiredRole && user.role !== requiredRole) return router.createUrlTree(['/']);
  return true;
};
