import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BookingService, BookingSegment } from '../../services/booking';
import { ReservationTimerService } from '../../services/reservation-timer';
import { CheckoutService } from '../../services/checkout';
import { Ticket, TicketData } from '../../shared/ticket/ticket';
import { Popup } from '../../shared/popup/popup';


@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, Ticket, Popup],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class Checkout implements OnInit, OnDestroy {
  tickets: TicketData[] = [];
  segments: BookingSegment[] = [];
  selectedSeatsCount = 0;
  totalAmount = 0;
  showPassengerTickets = true;
  
  remainingSeconds = 0;
  get remainingMinutesText() {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  acceptTerms = false;
  acceptPrivacy = false;
  acceptMarketing = false;

  selectedItinerary: any = null;
  bookingData: any = null;
  numeroPasseggeri = 1;

  private stripe!: Stripe;
  private elements!: StripeElements;
  clientSecret = '';
  paymentIntentId = '';
  orderId = '';
  loading = false;
  message = '';
  showSuccessModal = false;

  isOpenPopup = false;
  popupMessage = '';
  popupType: 'info' | 'warning' | 'error' | 'success' = 'info';
  fatalError = false;

  constructor(
    private router: Router,
    private booking: BookingService,
    private checkout: CheckoutService,
    private timer: ReservationTimerService
  ) {}

  async ngOnInit() {
    const st = this.booking.getState();
    if (!st || !this.booking.isSeatSelectionComplete()) {
      this.router.navigate(['/']);
      return;
    }
    this.selectedItinerary = st.itinerarioAndata || st.itinerarioRitorno || null;
    this.numeroPasseggeri = st.numeroPasseggeri;
    this.segments = st.segments;

    const pax = this.booking.getPassengers();
    const allSeats = st.segments.flatMap(seg => seg.seats.map(s => ({ seg, s })));
    this.tickets = allSeats.map(({ seg, s }) => ({
      seatNumber: s.seatNumber,
      seatClass: s.seatClass,
      seatPrice: s.seatPrice! + pax[s.passengerIndex]!.extraBags! * 25,
      firstName: pax[s.passengerIndex]?.firstName || '',
      lastName: pax[s.passengerIndex]?.lastName || '',
      dateOfBirth: pax[s.passengerIndex]?.dateOfBirth || '',
      extraBags: pax[s.passengerIndex]?.extraBags || 0,
      flightNumber: seg.volo.numero || '',
      from: seg.volo.partenza || '',
      to: seg.volo.arrivo || '',
      cityFrom: seg.volo.citta_partenza || '',
      cityTo: seg.volo.citta_arrivo || '',
      direction: seg.direction,
    }));
    this.selectedSeatsCount = this.tickets.length;
    this.calculateTotal();

    this.timer.ensureStarted(15 * 60);
    const dl = this.timer.getDeadline();
    if (dl) {
      const sec = Math.max(0, Math.floor((dl - Date.now()) / 1000));
      this.remainingSeconds = sec;
    }
    this.timer.remainingSeconds$.subscribe((v: number) => (this.remainingSeconds = v));

    await this.preparePayment();
  }

  ngOnDestroy(): void {
  }

  getSegmentLabel(seg: BookingSegment): string {
    const v = seg.volo;
    return `${v.numero} • ${v.partenza} → ${v.arrivo}`;
  }

  calculateTotal() {
    const seatsTotal = this.tickets.reduce((sum, t) => sum + t.seatPrice, 0);
    this.totalAmount = seatsTotal;
  }

  getTotalExtraBags(): number {
    return this.tickets.reduce((sum, t) => sum + t.extraBags, 0);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
  }

  addTickets() {
    this.checkout.insertTickets(this.tickets).subscribe({
      next: () => {
        this.loading = false;
        this.openSuccessModal();
      },
      error: (error) => {
        const msg = error?.error?.error || 'Errore durante la conferma del pagamento. Prenotazione scaduta o non valida.';
        this.fatalError = true;
        this.openPopup(msg, 'error', true);
        this.loading = false;
      }
    });
  }

  isPaymentReady(): boolean {
  return !!this.clientSecret && !!this.elements && this.acceptTerms && this.acceptPrivacy && !this.loading;
  }

  private generateOrderId(): string {
    return `ORD-${Date.now()}`;
  }

  private async preparePayment() {
    this.loading = true;
    this.message = '';
    try {
      const stripe = await loadStripe(environment.stripePublishableKey);
      if (!stripe) throw new Error('Stripe non inizializzato');
      this.stripe = stripe;

      this.orderId = this.generateOrderId();
      const amountCents = Math.round(this.totalAmount * 100);

      const res = await firstValueFrom(
        this.checkout.createPaymentIntent({
          orderId: this.orderId,
          amount: amountCents,
          currency: 'eur',
          customerEmail: 'test@example.com'
        })
      );

      this.clientSecret = res.clientSecret;
      this.paymentIntentId = res.paymentIntentId;

      this.elements = this.stripe.elements({ clientSecret: this.clientSecret });
      const paymentElement = this.elements.create('payment');
      paymentElement.mount('#payment-element');
    } catch (e: any) {
  this.message = e?.message || 'Errore nel pagamento.';
  this.openPopup(this.message, 'error', true);
    } finally {
      this.loading = false;
    }
  }

  async confirmPayment() {
    if (!this.stripe || !this.elements) return;
    this.loading = true;
    this.message = '';

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required'
    });

    if (error) {
  this.message = error?.message || 'Errore nel pagamento.';
  this.openPopup(this.message, 'error');
      this.loading = false;
      return;
    }

    try {
      const tries = 8;
      for (let i = 0; i < tries; i++) {
        const s = await firstValueFrom(this.checkout.getPaymentIntentStatus(this.paymentIntentId));
        if (s?.status === 'succeeded') {
          this.message = 'Pagamento riuscito!';
          this.addTickets();
          return;
        }
        if (s?.status === 'requires_payment_method' || s?.status === 'canceled') {
          this.message = 'Errore nel pagamento.';
          this.openPopup(this.message, 'error');
          this.loading = false;
          return;
        }
        await new Promise(r => setTimeout(r, 1500));
      }
  this.message = 'Pagamento in elaborazione... aggiorna tra poco.';
  this.openPopup(this.message, 'info');
    } catch {
  this.message = 'Errore nel verificare lo stato del pagamento.';
  this.openPopup(this.message, 'error');
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.router.navigate(['/posti']);
  }

  togglePassengerTickets() {
    this.showPassengerTickets = !this.showPassengerTickets;
  }

  openSuccessModal() {
    this.showSuccessModal = true;
  this.timer.reset();
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.router.navigate(['/']);
  }

  openPopup(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', fatal = false) {
    this.popupMessage = message;
    this.popupType = type;
    this.fatalError = fatal;
    this.isOpenPopup = true;
  }

  closePopup() {
    this.isOpenPopup = false;
    if (this.fatalError) {
      this.router.navigate(['/']);
    }
  }
}
