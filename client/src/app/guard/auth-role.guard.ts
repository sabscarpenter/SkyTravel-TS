// src/app/guard/auth-role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService, User } from '../services/auth';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

function matchRole(user: User | null, required?: 'PASSEGGERO' | 'AEROLINEA'): boolean {
  if (!user) return false;
  if (!required) return true;
  // Preferisci un vero campo ruoli dal backend.
  // Se vuoi mantenere la tua logica basata su id:
  if (required === 'AEROLINEA') return user.id >= 10 && user.id <= 99;
  if (required === 'PASSEGGERO') return user.id >= 100;
  return false;
}

export const authRoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRole = route.data?.['role'] as ('PASSEGGERO' | 'AEROLINEA' | undefined);

  return auth.me$().pipe(
    map(user => (matchRole(user, requiredRole) ? true : router.createUrlTree(['/']))),
    catchError(() => of(router.createUrlTree(['/'])))
  );
};
