import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NewFlightFormData } from '../pages/aerolinea/nuovo-volo/nuovo-volo';
import { environment } from '../../environments/environment';

export interface AerolineaInfo {
  nome: string;
  codice_iata: string;
  contatto: string;
  nazione: string;
  foto: string;
}

export interface Route {
  numero: string;
  partenza: string;
  arrivo: string;
  durata_min: number;
  lunghezza_km: number;
  partenza_nome: string;
  arrivo_nome: string;
}

export interface AerolineaStatistics {
  numero_destinazioni: number;
  numero_aerei: number;
  numero_voli_oggi: number;
  numero_passeggeri: number;
  ricavi_mensili: number;
  ricavi_totali: number;
}

export interface Flight {
  numero: string;
  partenza: string;
  arrivo: string;
  tratta_id: string;
  partenza_nome: string;
  arrivo_nome: string;
  aereo_nome: string;
  posti_disponibili: number;
}

export interface Aircraft {
  numero: string;
  modello: string;
  posti_economy: number;
  posti_business: number;
  posti_first: number;
  compagnia: string;
}

export interface AircraftModel {
  nome: string;
  sigla: string;
}

@Injectable({
  providedIn: 'root'
})
export class AerolineaService {

  private apiUrl = `${environment.apiBase}/compagnia`;

  constructor(private http: HttpClient) { }

  getAirlineProfile(): Observable<AerolineaInfo> {
    return this.http.get<AerolineaInfo>(`${this.apiUrl}/profile`);
  }

  getPhotoUrl(filename: string): string {
    if (!filename) return '';
    return `${this.apiUrl}/uploads/compagnie/${filename}`;
  }
  
  getAirlineRoutes(): Observable<Route[]> {
    return this.http.get<Route[]>(`${this.apiUrl}/routes`);
  }

  getAirlineStatistics(): Observable<AerolineaStatistics> {
    return this.http.get<AerolineaStatistics>(`${this.apiUrl}/statistics`);
  }

  getBestRoutes(): Observable<Route[]> {
    return this.http.get<Route[]>(`${this.apiUrl}/routes/best`);
  }

  getAirlineFlights(): Observable<Flight[]> {
    return this.http.get<Flight[]>(`${this.apiUrl}/flights`);
  }

  getAirlineAircrafts(): Observable<Aircraft[]> {
    return this.http.get<Aircraft[]>(`${this.apiUrl}/aircrafts`);
  }

  addAirlineAircraft(aircraft: { modello: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/aircrafts`, aircraft);
  }

  deleteAirlineAircraft(numero: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/aircrafts/${encodeURIComponent(numero)}`);
  }

  getAircraftModels(): Observable<AircraftModel[]> {
    return this.http.get<AircraftModel[]>(`${this.apiUrl}/models`);
  }

  addAirlineFlights(flight: NewFlightFormData): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/flights`, flight);
  }

  addAirlineRoute(route: Route): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/routes`, route);
  }

  deleteAirlineRoute(routeNumber: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/routes/${routeNumber}`);
  }

  setupCompany(data: { nome:string; codiceIATA:string; contatto:string; nazione:string; password:string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/setup`, data);
  }
}