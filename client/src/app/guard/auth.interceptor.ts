// app/auth.interceptor.ts
import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { AuthService } from '../services/auth';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

let isRefreshing = false;
const refreshDone$ = new Subject<boolean>();
const EXCLUDED = ['/auth/login', '/auth/refresh', '/auth/logout'];

function isExcluded(url: string) {
  return EXCLUDED.some(p => url.includes(p));
}

function attachToken(req: HttpRequest<any>, token: string | null) {
  return token && !isExcluded(req.url)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const token = auth.token;

  // non allegare Authorization a /auth/*
  const initial = attachToken(req, token);

  return next(initial).pipe(
    catchError((err: HttpErrorResponse) => {
      // niente refresh per errori diversi da 401 o su /auth/*
      if (err.status !== 401 || isExcluded(req.url)) {
        return throwError(() => err);
      }

      // evita retry infinito: segna la request come già ritentata
      const alreadyRetried = req.headers.get('x-retried') === '1';

      if (!isRefreshing && !alreadyRetried) {
        isRefreshing = true;

        return auth.refresh().pipe(
          switchMap(() => {
            isRefreshing = false;
            refreshDone$.next(true);
            const newToken = auth.token;
            // ripeti la richiesta UNA sola volta
            const retry = attachToken(
              req.clone({ setHeaders: { 'x-retried': '1' } }),
              newToken
            );
            return next(retry);
          }),
          catchError((refreshErr) => {
            isRefreshing = false;
            refreshDone$.next(false);
            auth.logout().subscribe(); // svuota token, cookie server-side
            return throwError(() => refreshErr);
          })
        );
      } else {
        // coda: aspetta che il refresh finisca
        return refreshDone$.pipe(
          filter(ok => ok !== undefined),
          take(1),
          switchMap(ok => {
            if (!ok || alreadyRetried) {
              auth.logout().subscribe();
              return throwError(() => err);
            }
            const newToken = auth.token;
            const retry = attachToken(
              req.clone({ setHeaders: { 'x-retried': '1' } }),
              newToken
            );
            return next(retry);
          })
        );
      }
    })
  );
};
