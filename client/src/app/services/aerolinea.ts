import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NewFlightFormData } from '../pages/aerolinea/nuovo-volo/nuovo-volo';

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
  compagnia: string;
}

@Injectable({
  providedIn: 'root'
})
export class AerolineaService {

  private apiUrl = 'http://localhost:5000/api/compagnia';

  constructor(private http: HttpClient) { }

  getAirlineProfile(): Observable<AerolineaInfo> {
    return this.http.get<AerolineaInfo>(`${this.apiUrl}/profile`, { withCredentials: true });
  }

  getPhotoUrl(filename: string): string {
    if (!filename) return '';
    return `${this.apiUrl}/uploads/loghi/${filename}`;
  }
  
  getAirlineRoutes(): Observable<Route[]> {
    return this.http.get<Route[]>(`${this.apiUrl}/routes`, { withCredentials: true });
  }

  getAirlineStatistics(): Observable<AerolineaStatistics> {
    return this.http.get<AerolineaStatistics>(`${this.apiUrl}/statistics`, { withCredentials: true });
  }

  getBestRoutes(): Observable<Route[]> {
    return this.http.get<Route[]>(`${this.apiUrl}/routes/best`, { withCredentials: true });
  }

  getAirlineFlights(): Observable<Flight[]> {
    return this.http.get<Flight[]>(`${this.apiUrl}/flights`, { withCredentials: true });
  }

  getAirlineAircrafts(): Observable<Aircraft[]> {
    return this.http.get<Aircraft[]>(`${this.apiUrl}/aircrafts`, { withCredentials: true });
  }

  addAirlineFlights(flight: NewFlightFormData): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/flights`, flight, { withCredentials: true });
  }

  addAirlineRoute(route: Route): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/routes`, route, { withCredentials: true });
  }

  deleteAirlineRoute(routeNumber: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/routes/${routeNumber}`, { withCredentials: true });
  }

}