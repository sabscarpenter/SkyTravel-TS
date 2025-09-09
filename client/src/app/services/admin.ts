import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, shareReplay, switchMap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Compagnia {
    utente: number;
    nome: string;
    email: string;
    nazione: string;
}

export interface Passeggero {
    utente: number;
    email: string;
    nome: string;
    cognome: string;
    foto?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = `${environment.apiBase}/admin`;

  constructor(private http: HttpClient) {}

  // Metodi per interagire con l'API
  getCompagnie(): Observable<Compagnia[]> {
    return this.http.get<Compagnia[]>(`${this.apiUrl}/compagnie`);
  }

  getPasseggeri(): Observable<Passeggero[]> {
    return this.http.get<Passeggero[]>(`${this.apiUrl}/passeggeri`);
  }

  removeCompagnia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/compagnie/${id}`);
  }

  removePasseggero(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/passeggeri/${id}`);
  }
}
