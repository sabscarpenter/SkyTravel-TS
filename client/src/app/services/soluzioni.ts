import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Volo {
  numero: string;
  compagnia: string;
  partenza: string;
  arrivo: string;
  citta_partenza: string;
  citta_arrivo: string;
  ora_partenza: string;
  ora_arrivo: string;
  modello: string;
  distanza: number;
}

export interface Itinerario {
  durata_totale: string;
  voli: Volo[];
}

export interface RoundTripResult {
  andata: Itinerario[];
  ritorno: Itinerario[];
}

@Injectable({ providedIn: 'root' })
export class SoluzioniService {
  private apiUrl = `${environment.apiBase}/soluzioni`;

  constructor(private http: HttpClient) {}

  private normalizeDate(date: string): string {
    return date + "T00:00:00";
  }

  cercaSoloAndata(partenza: string, arrivo: string, data: string): Observable<Itinerario[]> {
    const params = new HttpParams()
      .set('partenza', partenza)
      .set('arrivo', arrivo)
      .set('data_andata', this.normalizeDate(data));
    return this.http.get<Itinerario[]>(`${this.apiUrl}/ricerca`, { params });
  }

  cercaAndataRitorno(
    partenza: string,
    arrivo: string,
    dataAndata: string,
    dataRitorno: string
  ): Observable<RoundTripResult> {
    const params = new HttpParams()
      .set('partenza', partenza)
      .set('arrivo', arrivo)
      .set('data_andata', this.normalizeDate(dataAndata))
      .set('data_ritorno', this.normalizeDate(dataRitorno));
    return this.http.get<RoundTripResult>(`${this.apiUrl}/ricerca`, { params });
  }
}
