import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TicketData } from '../shared/ticket/ticket';
import { environment } from '../../environments/environment';

interface CreateIntentRequest {
  orderId: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private apiUrl = `${environment.apiBase}/checkout`;

  constructor(private http: HttpClient) {}

  insertTickets(ticketsData: TicketData[]): Observable<TicketData[]> {
    return this.http.post<TicketData[]>(`${this.apiUrl}/insert-tickets`, ticketsData);
  }

  createPaymentIntent(body: CreateIntentRequest): Observable<{ clientSecret: string; paymentIntentId: string }> {
    return this.http.post<{ clientSecret: string; paymentIntentId: string }>(
      `${this.apiUrl}/create-payment-intent`, body
    );
  }

  getPaymentIntentStatus(piId: string): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(
      `${this.apiUrl}/payment-intent/${piId}`
    );
  }
}
