import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        // prova a fare refresh e ripeti la richiesta
        return auth.refresh().pipe(
          switchMap(() => {
            const newToken = auth.token;
            const retry = newToken
              ? req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
              : req;
            return next(retry);
          }),
          catchError(() => {
            auth.logout().subscribe();
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
