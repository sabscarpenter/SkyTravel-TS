// src/app/services/auth.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface User {
  id: number;
  email: string;
  foto?: string;
  role?: 'PASSEGGERO' | 'AEROLINEA';
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
  private apiUrl = 'http://localhost:5000/api/auth';
  private _me$?: Observable<User | null>;

  constructor(private http: HttpClient) {}

  register(email: string, password: string) {
    return this.http.post(`${this.apiUrl}/register`, { email, password }, { withCredentials: true });
  }

  datiUtente(dati: DatiUtente) {
    return this.http.post(`${this.apiUrl}/dati`, dati, { withCredentials: true });
  }

  login(email: string, password: string) {
    this._me$ = undefined;
    return this.http.post(`${this.apiUrl}/login`, { email, password }, { withCredentials: true });
  }

  logout() {
    this._me$ = undefined;
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true });
  }

  /** Idempotente, cached. Ritorna null se non autenticato. */
  me$(): Observable<User | null> {
    if (!this._me$) {
      this._me$ = this.http.get<User>(`${this.apiUrl}/me`, { withCredentials: true })
        .pipe(shareReplay(1));
    }
    return this._me$;
  }
}
