import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TicketData } from '../shared/ticket/ticket';
import { environment } from '../../environments/environment';

export interface PassengerInfo {
  nome: string;
  cognome: string;
  email: string;
  codice_fiscale: string;
  data_nascita: string;
  sesso: string;
  foto: string;
}

export interface PassengerStats {
  totalFlights: number;
  visitedCountries: number;
  kilometersFlown: number;
  flightsThisYear: number;
}

export interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'american-express';
  lastFourDigits: string;
  expiryDate: string;
  holderName: string;
}

export interface StripeSavedMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

@Injectable({
  providedIn: 'root'
})
export class PasseggeroService {

  private apiUrl = `${environment.apiBase}/passeggero`;

  constructor(private http: HttpClient) { }

  getPassengerProfile(): Observable<PassengerInfo> {
    return this.http.get<PassengerInfo>(`${this.apiUrl}/profile`);
  }

  getPhotoUrl(filename: string): string {
    if (!filename) return '';
    return `${this.apiUrl}/uploads/passeggeri/${filename}`;
  }

  updateProfilePhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/update/foto`, formData);
  }

  getPassengerReservations(): Observable<TicketData[]> {
    return this.http.get<TicketData[]>(`${this.apiUrl}/reservations`);
  }

  getPassengerStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics`);
  }

  aggiornaEmail(email: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/aggiorna-email`, { email });
  }

  aggiornaPassword(passwordAttuale: string, nuovaPassword: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/aggiorna-password`, { passwordAttuale, nuovaPassword });
  }

  createStripeSetupIntent(): Observable<{ clientSecret: string }> {
    return this.http.post<{ clientSecret: string }>(
      `${this.apiUrl}/stripe/setup-intent`, {}
    );
  }

  listStripePaymentMethods(): Observable<StripeSavedMethod[]> {
    return this.http.get<StripeSavedMethod[]>(
      `${this.apiUrl}/stripe/payment-methods`
    );
  }

  deleteStripePaymentMethod(pmId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/stripe/payment-methods/${pmId}`
    );
  }
}