import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { map } from 'rxjs/operators';

export const authRoleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRole = route.data?.['role'] as ('ADMIN' | 'COMPAGNIA' | 'PASSEGGERO' | undefined);
  
  const user = auth.user;
  if (user) {
    if (requiredRole && user.role !== requiredRole) return router.createUrlTree(['/']);
    return true;
  }
  if (auth.token) {
    return auth.me$().pipe(
      map(u => {
        if (!u) return router.createUrlTree(['/']);
        if (requiredRole && u.role !== requiredRole) return router.createUrlTree(['/']);
        return true;
      })
    );
  }
  return router.createUrlTree(['/']);
};
