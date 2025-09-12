// app/auth.interceptor.ts
import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { AuthService } from '../services/auth';
import { Subject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

let isRefreshing = false;
const refreshDone$ = new Subject<boolean>();

const EXCLUDED = [
  '/auth/register',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
];

function pathIn(url: string, list: string[]): boolean {
  try {
    const u = new URL(url, window.location.origin);
    const p = u.pathname;
    return list.some(item => p === item);
  } catch {
    return list.some(item => url === item || url.endsWith(item));
  }
}

function needsAuthHeader(url: string) {
  return !pathIn(url, EXCLUDED);
}

function shouldSkipRefresh(url: string) {
  return pathIn(url, EXCLUDED);
}

function attachToken(req: HttpRequest<any>, token: string | null) {
  return token && needsAuthHeader(req.url)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const token = auth.token;

  const initial = attachToken(req, token);

  return next(initial).pipe(
    catchError((err: HttpErrorResponse) => {
      // Se non è 401 o se l'endpoint è nella lista NO_REFRESH → non provare il refresh
      if (err.status !== 401 || shouldSkipRefresh(req.url)) {
        return throwError(() => err);
      }

      // evita retry infinito
      const alreadyRetried = req.headers.get('x-retried') === '1';

      if (!isRefreshing && !alreadyRetried) {
        isRefreshing = true;

        return auth.refresh().pipe(
          switchMap(() => {
            isRefreshing = false;
            refreshDone$.next(true);
            const newToken = auth.token;
            const retry = attachToken(
              req.clone({ setHeaders: { 'x-retried': '1' } }),
              newToken
            );
            return next(retry);
          }),
          catchError((refreshErr) => {
            isRefreshing = false;
            refreshDone$.next(false);
            auth.logout().subscribe(); // svuota stato locale e cookie lato server
            return throwError(() => refreshErr);
          })
        );
      } else {
        // coda: aspetta l’esito del refresh in corso
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
