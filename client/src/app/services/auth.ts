import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, shareReplay, switchMap, timer } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';

export type Role = 'ADMIN' | 'COMPAGNIA' | 'PASSEGGERO';

export interface User {
  id: number;
  email: string;
  foto?: string;
  role?: Role;
}

interface DecodedToken {
  sub: number;
  role: Role;
  exp: number;
  iat: number;
}

export interface DatiUtente {
  nome: string;
  cognome: string;
  codiceFiscale: string;
  dataNascita: string;
  sesso: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiBase}/auth`;
  private accessToken$ = new BehaviorSubject<string | null>(localStorage.getItem('accessToken'));
  private user$ = new BehaviorSubject<User | null>(null);
  private refreshTimer: any;
  private _me$?: Observable<User | null>;

  // margini anti-storm (ms)
  private static readonly SKEW_MS   = 5_000;   // tolleranza orologio
  private static readonly BUFFER_MS = 60_000;  // refresh 60s prima
  private static readonly MIN_MS    = 5_000;   // mai < 5s

  constructor(private http: HttpClient) {
    // Ricostruzione veloce al boot
    const saved = this.accessToken$.value;
    if (saved) this.setAccessToken(saved);
  }

  bootstrap(): Promise<void> {
    const saved = localStorage.getItem('accessToken');
    if (!saved) return Promise.resolve();
    try {
      const d = jwtDecode<DecodedToken>(saved);
      const expMs = d.exp * 1000;
      const almostExpired = expMs - Date.now() < AuthService.BUFFER_MS;
      if (almostExpired) {
        return new Promise(resolve => {
          this.refresh().subscribe({ next: () => resolve(), error: () => resolve() });
        });
      } else {
        // già fatto nel ctor, ma riproponiamo per sicurezza
        this.setAccessToken(saved);
        return Promise.resolve();
      }
    } catch {
      this.logout().subscribe();
      return Promise.resolve();
    }
  }

  // --- getters ---
  get token() { return this.accessToken$.value; }
  get user()  { return this.user$.value; }
  get userChanges$() { return this.user$.asObservable(); }

  // --- API ---

  register(email: string, password: string) {
    return this.http.post(`${this.apiUrl}/register`, { email, password }, { withCredentials: true });
  }

  datiUtente(dati: DatiUtente) {
    return this.http.post(`${this.apiUrl}/dati`, dati, { withCredentials: true });
  }

  /** Login: salva access token e user */
  login(email: string, password: string) {
    this._me$ = undefined;
    return this.http.post<{ accessToken: string; user: User }>(
      `${this.apiUrl}/login`,
      { email, password },
      { withCredentials: true }
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
    this._me$ = undefined;
    localStorage.removeItem('accessToken');
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true });
  }

  logoutAll() {
    return this.http.post(`${this.apiUrl}/logout-all`, {}, { withCredentials: true }).pipe(
      finalize(() => {
        this.clearRefreshTimer();
        this.accessToken$.next(null);
        this.user$.next(null);
        this._me$ = undefined;
        localStorage.removeItem('accessToken');
      })
    );
  }

  /** Idempotente, cached. Ritorna null se non autenticato. */
  me$(): Observable<User | null> {
    if (!this._me$) {
      this._me$ = this.http.get<User>(`${this.apiUrl}/me`, { withCredentials: false })
        .pipe(shareReplay(1));
    }
    return this._me$;
  }

  /** Chiede un nuovo access token usando il refresh token nel cookie */
  refresh() {
    return this.http.post<{ accessToken: string; user?: User }>(
      `${this.apiUrl}/refresh`, {}, { withCredentials: true }
    ).pipe(
      map(res => {
        this.setAccessToken(res.accessToken);
        if (res.user) this.user$.next(res.user);
        return true;
      })
    );
  }

  // --- Helpers ---

  private setAccessToken(token: string) {
    this.accessToken$.next(token);
    localStorage.setItem('accessToken', token);

    try {
      const decoded = jwtDecode<DecodedToken>(token);

      // se l'email non è nel token, mantieni quella nota (o vuota)
      const currentEmail = this.user?.email ?? '';
      const user: User = { id: decoded.sub, email: currentEmail, role: decoded.role };
      this.user$.next(user);

      const now = Date.now();
      const expMs = decoded.exp * 1000;
      let delay = expMs - now - AuthService.BUFFER_MS;
      if (delay <= AuthService.SKEW_MS) delay = AuthService.MIN_MS;

      this.scheduleRefresh(delay);
    } catch (err) {
      console.error('Token malformato', err);
      this.logout().subscribe();
    }
  }

  private scheduleRefresh(delayMs: number) {
    this.clearRefreshTimer();
    const safeDelay = Math.max(AuthService.MIN_MS, delayMs);

    this.refreshTimer = timer(safeDelay)
      .pipe(switchMap(() => this.refresh()))
      .subscribe({
        next: () => { /* ok: setAccessToken() ha già rischedulato */ },
        error: () => { this.logout().subscribe(); }
      });
  }

  private clearRefreshTimer() {
    if (this.refreshTimer) {
      this.refreshTimer.unsubscribe();
      this.refreshTimer = null;
    }
  }
}
