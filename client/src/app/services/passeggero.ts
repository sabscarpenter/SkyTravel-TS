import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TicketData } from '../shared/ticket/ticket';

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

  private apiUrl = 'http://localhost:3000/api/passeggero';

  constructor(private http: HttpClient) { }

  getPassengerProfile(): Observable<PassengerInfo> {
    return this.http.get<PassengerInfo>(`${this.apiUrl}/profile`, { withCredentials: true });
  }

  getPhotoUrl(filename: string): string {
    if (!filename) return '';
    return `${this.apiUrl}/uploads/profile-pictures/${filename}`;
  }

  updateProfilePhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return this.http.post<any>(`${this.apiUrl}/update-photo`, formData, { withCredentials: true });
  }

  getPassengerReservations(): Observable<TicketData[]> {
    return this.http.get<TicketData[]>(`${this.apiUrl}/reservations`, { withCredentials: true });
  }

  getPassengerStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics`, { withCredentials: true });
  }

  aggiornaEmail(email: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/aggiorna-email`, { email }, { withCredentials: true });
  }

  aggiornaPassword(passwordAttuale: string, nuovaPassword: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/aggiorna-password`, { passwordAttuale, nuovaPassword }, { withCredentials: true });
  }

   // --- Stripe saved methods ---
  createStripeSetupIntent(): Observable<{ clientSecret: string }> {
    return this.http.post<{ clientSecret: string }>(
      `${this.apiUrl}/stripe/setup-intent`,
      {},
      { withCredentials: true }
    );
  }

  listStripePaymentMethods(): Observable<StripeSavedMethod[]> {
    return this.http.get<StripeSavedMethod[]>(
      `${this.apiUrl}/stripe/payment-methods`,
      { withCredentials: true }
    );
  }

  deleteStripePaymentMethod(pmId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/stripe/payment-methods/${pmId}`,
      { withCredentials: true }
    );
  }
}