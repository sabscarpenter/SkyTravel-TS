import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, shareReplay } from 'rxjs';
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
  private user$ = new BehaviorSubject<User | null>(null);
  private _me$?: Observable<User | null>;

  constructor(private http: HttpClient) {
  }

  // --- getters ---
  get token() { return localStorage.getItem('accessToken'); }
  get user()  { return this.user$.value; }
  get userChanges$() { return this.user$.asObservable(); }

  register(email: string, password: string, dati: DatiUtente) {
    return this.http.post<{ accessToken: string; user: User }>(
      `${this.apiUrl}/register`,
      { email, password, dati },
      { withCredentials: true }
    ).pipe(
      map(res => {
        localStorage.setItem('accessToken', res.accessToken);
        this.user$.next(res.user);
      })
    );
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
        localStorage.setItem('accessToken', res.accessToken);
        this.user$.next(res.user);
        console.log('utente:', res.user.id, res.user.email, res.user.role, res.user.foto);
      })
    );
  }

  /** Logout: cancella token locale e cookie refresh lato server */
  logout() {
    this.user$.next(null);
    this._me$ = undefined;
    localStorage.removeItem('accessToken');
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true });
  }

  logoutAll() {
    return this.http.post(`${this.apiUrl}/logout-all`, {}, { withCredentials: true }).pipe(
      finalize(() => {
        localStorage.removeItem('accessToken');
        this.user$.next(null);
        this._me$ = undefined;
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
    return this.http.post<{ accessToken?: string; user?: User }>(
      `${this.apiUrl}/refresh`, {}, { withCredentials: true }
    ).pipe(
      map(res => {
        if (!res.accessToken || !res.user) {
          throw new Error('Errore nel refresh token');
        }
        localStorage.setItem('accessToken', res.accessToken);
        this.user$.next(res.user);
        return true;
      })
    );
  }
}
