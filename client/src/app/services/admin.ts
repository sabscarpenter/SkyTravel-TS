import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

export interface CompagniaInAttesa {
  utente: number;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = `${environment.apiBase}/admin`;

  constructor(private http: HttpClient) {}

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

  aggiungiCompagnia(email: string, password: string, file: File) {
    const form = new FormData();
    form.append('email', email);
    form.append('password', password);
    form.append('file', file);
    return this.http.post<void>(`${this.apiUrl}/aggiungi`, form);
  }

  getCompagnieInAttesa(): Observable<CompagniaInAttesa[]> {
    return this.http.get<CompagniaInAttesa[]>(`${this.apiUrl}/compagnie/attesa`);
  }

  removeCompagniaInAttesa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/compagnie/attesa/${id}`);
  }
}
