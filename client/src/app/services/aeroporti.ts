import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Aeroporto {
	iata: string;
	name: string;
	city: string;
	country?: string;
}

export interface NazioniAeroporti {
    nazione: string;
    aeroporti: Aeroporto[];
}

@Injectable({
  providedIn: 'root'
})
export class AeroportiService {

  private apiUrl = `${environment.apiBase}/aeroporti`;

  constructor(private http: HttpClient) { }

  getAeroporti(): Observable<NazioniAeroporti[]> {
    return this.http
      .get<NazioniAeroporti[]>(`${this.apiUrl}/list`)
      .pipe(
        map((res) =>
          res.map((item) => ({
            nazione: item.nazione,
            aeroporti: item.aeroporti,
          }))
        )
      );
  }
}