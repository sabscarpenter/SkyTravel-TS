import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, of, switchMap, throwError, timer } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

export type Role = 'ADMIN' | 'COMPAGNIA' | 'PASSEGGERO';

export interface User {
  id: number;
  email: string;
  role: Role;
}

interface DecodedToken {
  sub: number;
  role: Role;
  exp: number;
  iat: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth';
  private accessToken$ = new BehaviorSubject<string | null>(localStorage.getItem('accessToken'));
  private user$ = new BehaviorSubject<User | null>(null);
  private refreshTimer: any;

  constructor(private http: HttpClient) {
    const token = this.accessToken$.value;
    if (token) this.setAccessToken(token);
  }

  get token() { return this.accessToken$.value; }
  get user() { return this.user$.value; }

  /** Login: salva access token e user */
  login(email: string, password: string) {
    return this.http.post<{ accessToken: string; user: User }>(
      `${this.apiUrl}/login`,
      { email, password },
      { withCredentials: true } // invia/riceve cookie refresh
    ).pipe(
      map(res => {
        this.setAccessToken(res.accessToken);
        this.user$.next(res.user);
        return res.user;
      })
    );
  }

  /** Logout: cancella token locale e cookie refresh lato server */
  logout() {
    this.clearRefreshTimer();
    this.accessToken$.next(null);
    this.user$.next(null);
    localStorage.removeItem('accessToken');
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true });
  }

  /** Chiede un nuovo access token usando il refresh token nel cookie */
  refresh() {
    return this.http.post<{ accessToken: string; user: User }>(
      `${this.apiUrl}/refresh`,
      {},
      { withCredentials: true }
    ).pipe(
      map(res => {
        this.setAccessToken(res.accessToken);
        this.user$.next(res.user);
        return true;
      })
    );
  }

  /** Ritorna info utente correntemente autenticato (se già salvato) */
  me() {
    return of(this.user$.value);
  }

  // --- Helpers ---

  private setAccessToken(token: string) {
    this.accessToken$.next(token);
    localStorage.setItem('accessToken', token);

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const user: User = { id: decoded.sub, email: '', role: decoded.role };
      this.user$.next(user);

      // programma un refresh automatico 1 minuto prima della scadenza
      const expiresAt = decoded.exp * 1000;
      const delay = Math.max(0, expiresAt - Date.now() - 60_000);
      this.scheduleRefresh(delay);
    } catch (err) {
      console.error('Token malformato', err);
    }
  }

  private scheduleRefresh(delayMs: number) {
    this.clearRefreshTimer();
    this.refreshTimer = timer(delayMs).pipe(
      switchMap(() => this.refresh())
    ).subscribe({
      error: () => this.logout().subscribe()
    });
  }

  private clearRefreshTimer() {
    if (this.refreshTimer) {
      this.refreshTimer.unsubscribe();
      this.refreshTimer = null;
    }
  }
}
