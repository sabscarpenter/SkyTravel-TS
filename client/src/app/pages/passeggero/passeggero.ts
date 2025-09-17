import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import { PasseggeroService, PassengerInfo, PassengerStats } from '../../services/passeggero';
import { Ticket, TicketData } from '../../shared/ticket/ticket';
import { Popup } from '../../shared/popup/popup';
import type { StripeSavedMethod } from '../../services/passeggero';


type ReservationGroup = {
  key: string;
  flightNumber: string;
  from: string;
  to: string;
  cityFrom?: string;
  cityTo?: string;
  departureDate?: string;
  departureTime?: string;
  direction?: 'andata' | 'ritorno' | 'solo';
  tickets: TicketData[];
};

@Component({
  selector: 'app-passeggero',
  standalone: true,
  imports: [CommonModule, FormsModule, Ticket, Popup],
  templateUrl: './passeggero.html',
  styleUrls: ['./passeggero.css']
})
export class Passeggero {
  @ViewChild(Popup) popup!: Popup;
  @ViewChild(Ticket) ticket!: Ticket;

  passengerInfo: PassengerInfo | null = null;
  user: any = null;

  reservations: TicketData[] = [];
  isTicketModalOpen: boolean = false;
  reservationGroups: ReservationGroup[] = [];
  selectedTicket: TicketData | null = null;
  selectedTickets: TicketData[] | null = null;

  passengerStatistics: PassengerStats | null = null;

  isPhotoUpdatePopupOpen: boolean = false;
  selectedFile: File | null = null;
  photoPreview: string | null = null;
  isUploading: boolean = false;
  imageLoaded: boolean = false;
  previewLoaded: boolean = false;

  private kmForBronze: number = 1000;
  private kmForSilver: number = 5000;
  private kmForGold: number = 10000;
  private kmForPlatinum: number = 20000;
  currentLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | null = null;

  email: string = '';
  emailPassword: string = '';
  passwordAttuale: string = '';
  nuovaPassword: string = '';

  isOpenPopup = false;
  criticita = false;
  popupMessage = '';
  popupType: 'info' | 'warning' | 'error' | 'success' = 'info';

  private stripe!: Stripe;
  private elements!: StripeElements;
  private paymentElement?: any;

  stripeMethods: StripeSavedMethod[] = [];
  addMethodModalOpen = false;
  addingMethod = false;
  payingWith?: string;

  constructor(private router: Router, private passengerService: PasseggeroService) {}

  ngOnInit(): void {
    this.loadProfileInfo();
    this.loadReservations();
    this.loadStatistics();
    this.refreshStripeMethods();
  }

  loadReservations(): void {
    this.passengerService.getPassengerReservations().subscribe({
      next: (response) => {
        this.reservations = response || [];
        this.reservationGroups = this.groupReservations(this.reservations);
        console.log('Prenotazioni caricate:', this.reservations);
        console.log('Gruppi volo:', this.reservationGroups);
      },
      error: (response) => {
        this.openPopup(response.error?.message, 'error');
        console.error('Errore nel recupero delle prenotazioni:', response.error?.error);
      }
    });
  }

  private groupReservations(list: TicketData[]): ReservationGroup[] {
    const map = new Map<string, ReservationGroup>();

    for (const r of list) {
      const key = `${r.flightNumber}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          flightNumber: r.flightNumber,
          from: r.from,
          to: r.to,
          cityFrom: r.cityFrom,
          cityTo: r.cityTo,
          departureDate: r.departureDate,
          departureTime: r.departureTime,
          direction: r.direction,
          tickets: [],
        });
      }
      map.get(key)!.tickets.push(r);
    }

    const toMillis = (date?: string, time?: string): number | null => {
      if (!date) return null;
      const [Y, M, D] = date.split('-').map(n => parseInt(n, 10));
      if (!Y || !M || !D) return null;

      let h = 0, m = 0;
      if (time) {
        const [hh, mm] = time.split(':');
        h = parseInt(hh ?? '0', 10);
        m = parseInt(mm ?? '0', 10);
      }
      return new Date(Y, M - 1, D, h, m).getTime();
    };

    const nowMs = Date.now();

    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      const ta = toMillis(a.departureDate, a.departureTime);
      const tb = toMillis(b.departureDate, b.departureTime);

      const aPast = ta !== null && ta < nowMs;
      const bPast = tb !== null && tb < nowMs;

      if (aPast !== bPast) return aPast ? 1 : -1;

      if (ta !== tb) {
        if (ta === null) return 1;
        if (tb === null) return -1;
        return ta - tb;
      }

      return (a.flightNumber || '').localeCompare(b.flightNumber || '');
    });

    return groups;
  }

  openTicketModal(tickets: TicketData[] | TicketData) {
    if (Array.isArray(tickets)) {
      this.selectedTickets = tickets;
      this.selectedTicket = null;
    } else {
      this.selectedTicket = tickets;
      this.selectedTickets = null;
    }
    this.isTicketModalOpen = true;
    this.lockBodyScroll();
  }

  closeTicketModal() {
    this.selectedTicket = null;
    this.selectedTickets = null;
    this.isTicketModalOpen = false;
    this.unlockBodyScroll();
  }

  openPopup(message: string, type: 'info' | 'warning' | 'error' | 'success', criticita = false) {
    this.popupMessage = message;
    this.popupType = type;
    this.criticita = criticita;
    this.isOpenPopup = true;
  }

  closePopup() {
    this.isOpenPopup = false;
    if (this.criticita) {
      this.router.navigate(['/']);
    }
  }

  setCurrentLevel(): void {
    const totalKm = this.passengerStatistics?.kilometersFlown || 0;
    if (totalKm >= this.kmForPlatinum) {
      this.currentLevel = 'Platinum';
    } else if (totalKm >= this.kmForGold) {
      this.currentLevel = 'Gold';
    } else if (totalKm >= this.kmForSilver) {
      this.currentLevel = 'Silver';
    } else if (totalKm >= this.kmForBronze) {
      this.currentLevel = 'Bronze';
    } else {
      this.currentLevel = null;
    }
  }

  getNextLevel(): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | null {
    if (this.currentLevel === 'Bronze') return 'Silver';
    if (this.currentLevel === 'Silver') return 'Gold';
    if (this.currentLevel === 'Gold') return 'Platinum';
    return 'Bronze';
  }

  getKmForNextLevel(): number | null {
    if (this.currentLevel === 'Bronze') return this.kmForSilver - (this.passengerStatistics?.kilometersFlown || 0);
    if (this.currentLevel === 'Silver') return this.kmForGold - (this.passengerStatistics?.kilometersFlown || 0);
    if (this.currentLevel === 'Gold') return this.kmForPlatinum - (this.passengerStatistics?.kilometersFlown || 0);
    return this.kmForBronze; 
  }

  getProgressPercentage(): number {
    const km = this.passengerStatistics?.kilometersFlown || 0;

    if (km >= this.kmForPlatinum) {
      return 100;
    }

    let base = 0;
    let target = this.kmForBronze;

    if (km >= this.kmForGold) {
      base = this.kmForGold;
      target = this.kmForPlatinum;
    } else if (km >= this.kmForSilver) {
      base = this.kmForSilver;
      target = this.kmForGold;
    } else if (km >= this.kmForBronze) {
      base = this.kmForBronze;
      target = this.kmForSilver;
    } else {
      base = 0;
      target = this.kmForBronze;
    }

    const denom = Math.max(1, target - base);
    const raw = ((km - base) / denom) * 100;

    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  loadProfileInfo(): void {
    this.passengerService.getPassengerProfile().subscribe({
      next: (response) => {
        this.passengerInfo = response;
        console.log('Profilo caricato:', this.passengerInfo);
      },
      error: (response) => {
        this.openPopup(response.error?.message, 'error');
        console.error('Errore nel recupero del profilo del passeggero:', response.error?.error);
      }
    });
  }

  loadStatistics(): void {
    this.passengerService.getPassengerStatistics().subscribe({
      next: (response) => {
        console.log('Statistiche caricate:', response);
        this.passengerStatistics = response;
        this.setCurrentLevel();
      },
      error: (response) => {
        this.openPopup(response.error?.message, 'error');
        console.error('Errore nel recupero delle statistiche:', response.error?.error);
      }
    });
  }

  getBirthDate(): string {
    const dateString: string | undefined = this.passengerInfo?.data_nascita;
    if (dateString) {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    }
    return '';
  }

  onImageLoad(): void {
    this.imageLoaded = true;
  }

  onImageError(): void {
    this.imageLoaded = false;
  }

  getPhotoUrl(): string {
    if (this.passengerInfo?.foto) {
      return this.passengerService.getPhotoUrl(this.passengerInfo?.foto);
    }
    return '';
  }

  openPhotoUpdatePopup(): void {
    this.isPhotoUpdatePopupOpen = true;
    this.previewLoaded = false;
  }

  closePhotoUpdatePopup(): void {
    this.isPhotoUpdatePopupOpen = false;
    this.selectedFile = null;
    this.photoPreview = null;
    this.isUploading = false;
    this.previewLoaded = false;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
 
      if (!file.type.startsWith('image/')) {
      this.openPopup('Seleziona un file immagine valido', 'warning');
      return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        this.openPopup('Il file deve essere inferiore a 5MB', 'warning');
        return;
      }

      this.selectedFile = file;

      this.previewLoaded = false;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  updateProfilePhoto(): void {
    if (!this.selectedFile) return;

    this.isUploading = true;

    this.passengerService.updateProfilePhoto(this.selectedFile).subscribe({
      next: (response) => {
        this.loadProfileInfo();
        this.closePhotoUpdatePopup();
        this.openPopup(response.message, 'success');
      },
      error: (response) => {
        this.openPopup(response.error?.message, 'error');
        console.error('Errore nel caricamento della foto profilo:', response.error?.error);
        this.isUploading = false;
      }
    });
  }

  isValidEmail(email: string): boolean {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  onSubmitEmail() {
    this.passengerService.aggiornaEmail(this.email).subscribe({
      next: (response) => {
        this.openPopup(response.message, 'success');
      },
      error: (error) => {
        this.openPopup(error.error?.message, 'error');
        console.error('Errore nell\'aggiornamento email:', error);
      }
    });
  }

  onSubmitPassword() {
    this.passengerService.aggiornaPassword(this.passwordAttuale, this.nuovaPassword).subscribe({
      next: (response) => {
        this.openPopup(response.message, 'success');
      },
      error: (error) => {
        this.openPopup(error.error?.message, 'error');
        console.error('Errore nell\'aggiornamento password:', error);
      }
    });
  }

  onPreviewLoad(): void { this.previewLoaded = true; }
  onPreviewError(): void { this.previewLoaded = false; }

  refreshStripeMethods() {
    this.passengerService.listStripePaymentMethods().subscribe({
      next: (response) => this.stripeMethods = response || [],
      error: (response) => { 
        this.openPopup(response.error?.message, 'error');
        console.error('Errore nel recupero metodi di pagamento:', response.error?.error);
       }
    });
  }

  
  async openAddMethodModal() {
    if (this.addMethodModalOpen) return;
    this.addMethodModalOpen = true;

    try {
      const stripe = await loadStripe(environment.stripePublishableKey);
      if (!stripe) {
        this.openPopup('Stripe non inizializzato (pk pubblica mancante?)', 'error');
        this.addMethodModalOpen = false;
        return;
      }
      this.stripe = stripe;
      
      const resp = await firstValueFrom(this.passengerService.createStripeSetupIntent());
      const clientSecret = resp?.clientSecret;

      if (!clientSecret) {
        this.openPopup('SetupIntent senza clientSecret. Controlla l’endpoint backend.', 'error');
        this.addMethodModalOpen = false;
        return;
      }

      this.elements = this.stripe.elements({ clientSecret });
      this.paymentElement = this.elements.create('payment', { layout: 'tabs' as any });
      this.paymentElement.mount('#payment-element');
    } catch (err: any) {
      this.openPopup(err?.message, 'error');
      this.addMethodModalOpen = false;
    }
  }

  closeAddMethodModal() {
    try {
      this.paymentElement?.unmount();
    } catch {}
    this.paymentElement = undefined as any;
    this.elements = undefined as any;
    this.addMethodModalOpen = false;
    this.addingMethod = false;
  }

  async confirmAddMethod() {
  if (!this.stripe || !this.elements) return;
  this.addingMethod = true;

  const { error } = await this.stripe.confirmSetup({
    elements: this.elements,
    confirmParams: { return_url: window.location.href },
    redirect: 'if_required'
  });

  if (error) {
    this.openPopup(error.message!, 'error');
    this.addingMethod = false;
    return;
  }
  this.openPopup('Metodo salvato con successo', 'success');
  this.addingMethod = false;
  this.closeAddMethodModal();
  this.refreshStripeMethods();
  }

  removeSavedMethod(pmId: string) {
  this.passengerService.deleteStripePaymentMethod(pmId).subscribe({
    next: (response) => { this.openPopup(response.message, 'success'); this.refreshStripeMethods(); },
    error: (response) => { this.openPopup(response.error.message, 'error'); console.error('Errore nel rimuovere metodo di pagamento:', response.error?.error); }
  });
  }

  
  private bodyScrollY = 0;

  private getScrollbarWidth(): number {
    try {
      return window.innerWidth - document.documentElement.clientWidth;
    } catch {
      return 0;
    }
  }

  private lockBodyScroll() {
    try {
      const body = document.body as HTMLBodyElement;
      this.bodyScrollY = window.scrollY || window.pageYOffset || 0;
      const sbw = this.getScrollbarWidth();

      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${this.bodyScrollY}px`;
      body.style.width = '100%';
      if (sbw > 0) {
        body.style.paddingRight = `${sbw}px`;
      }
    } catch {}
  }

  private unlockBodyScroll() {
    try {
      const body = document.body as HTMLBodyElement;
      const y = this.bodyScrollY;
      body.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.paddingRight = '';
      window.scrollTo(0, y || 0);
      this.bodyScrollY = 0;
    } catch {}
  }

  private toMillis(date?: string, time?: string): number | null {
    if (!date) return null;
    const [Y, M, D] = date.split('-').map(n => parseInt(n, 10));
    if (!Y || !M || !D) return null;
    let h = 0, m = 0;
    if (time) {
      const [hh, mm] = time.split(':');
      h = parseInt(hh ?? '0', 10);
      m = parseInt(mm ?? '0', 10);
    }
    return new Date(Y, M - 1, D, h, m).getTime();
  }

  isGroupPast(g: ReservationGroup): boolean {
    const ms = this.toMillis(g.departureDate, g.departureTime);
    return ms !== null && ms < Date.now();
  }
}
