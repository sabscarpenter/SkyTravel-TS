import { CommonModule } from '@angular/common';
import { Component, HostListener, Input } from '@angular/core';

export interface TicketData {
  // Dati passeggero
  firstName: string;
  lastName: string;
  dateOfBirth?: string;

  // Dati volo
  flightNumber: string;
  from: string;
  to: string;
  cityFrom: string;
  cityTo: string;
  departureDate?: string; // ISO or printable
  departureTime?: string; // optional (HH:mm)
  direction?: 'andata' | 'ritorno' | 'solo';

  // Dati posto / biglietto
  seatNumber: string;
  seatClass: 'economy' | 'business' | 'first';
  seatPrice: number;
  extraBags: number;
}

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket.html',
  styleUrls: ['./ticket.css']
})
export class Ticket {
  @Input() item?: TicketData;
  @Input() items: TicketData[] = [];

  @Input() elevated = true;

  current = 0;
  loop: boolean = true;

  ngOnInit() {
    if (this.items?.length > 0) {
      this.current = 0;
      this.item = this.items[this.current];
    }
  }

  get hasMultiple(): boolean {
    return Array.isArray(this.items) && this.items.length > 1;
  }

  get hasPrev(): boolean {
    return this.loop || this.current > 0;
  }
  get hasNext(): boolean {
    return this.loop || (this.items?.length ? this.current < this.items.length - 1 : false);
  }

  prev() {
    if (!this.hasMultiple && !this.loop) return;
    if (!this.items?.length) return;

    if (this.current === 0) {
      if (!this.loop) return;
      this.current = this.items.length - 1;
    } else {
      this.current--;
    }
    this.applyIndex();
  }

  next() {
    if (!this.hasMultiple && !this.loop) return;
    if (!this.items?.length) return;

    if (this.current === this.items.length - 1) {
      if (!this.loop) return;
      this.current = 0;
    } else {
      this.current++;
    }
    this.applyIndex();
  }

  goTo(i: number) {
    if (!this.items?.length) return;
    if (i < 0 || i >= this.items.length) return;
    this.current = i;
    this.applyIndex();
  }

  private applyIndex() {
    this.item = this.items[this.current];
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (!this.items?.length) return;
    if (e.key === 'ArrowLeft') this.prev();
    if (e.key === 'ArrowRight') this.next();
  }

  private touchStartX = 0;
  private touchStartY = 0;

  onTouchStart(ev: TouchEvent) {
    if (!ev.touches?.length) return;
    this.touchStartX = ev.touches[0].clientX;
    this.touchStartY = ev.touches[0].clientY;
  }
  onTouchEnd(ev: TouchEvent) {
    const t = ev.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;

    if (Math.abs(dy) > Math.abs(dx)) return; 

    const TH = 40; // px
    if (dx > TH) this.prev();
    else if (dx < -TH) this.next();
  }

  // === Helpers stile/format ===
  get sideBarClass(): string {
    const cl = this.item?.seatClass;
    if (cl === 'first') return 'bg-red-600';
    if (cl === 'business') return 'bg-blue-600';
    return 'bg-green-600';
  }

  get cardGradientClasses(): string {
    const cl = this.item?.seatClass;
    if (cl === 'first') return 'from-red-50 to-red-100 border-red-200';
    if (cl === 'business') return 'from-blue-50 to-blue-100 border-blue-200';
    return 'from-green-50 to-green-100 border-green-200';
  }

  get seatClassBadgeClass(): string {
    const cl = this.item?.seatClass;
    if (cl === 'first') return 'bg-red-600';
    if (cl === 'business') return 'bg-blue-600';
    return 'bg-green-600';
  }

  get priceTextClass(): string {
    const cl = this.item?.seatClass;
    if (cl === 'first') return 'text-red-600';
    if (cl === 'business') return 'text-blue-600';
    return 'text-green-600';
  }

  get closeButtonHoverClass(): string {
    const cl = this.item?.seatClass;
    if (cl === 'first') return 'hover:bg-red-100 hover:border-red-200';
    if (cl === 'business') return 'hover:bg-blue-100 hover:border-blue-200';
    return 'hover:bg-green-100 hover:border-green-200';
  }

  formatCurrency(value?: number): string {
    if (value == null) return '';
    try {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
    } catch {
      return `€${value}`;
    }
  }

  fullName(): string {
    return `${this.item?.firstName || ''} ${this.item?.lastName || ''}`.trim();
  }

  get buttonToneClass(): string {
    const cls = (this.item?.seatClass || '').toLowerCase();
    switch (cls) {
      case 'business':
        return 'bg-purple-600/90 hover:bg-purple-700 text-white';
      case 'first':
      case 'first class':
        return 'bg-amber-600/90 hover:bg-amber-700 text-white';
      default: // economy ecc.
        return 'bg-sky-600/90 hover:bg-sky-700 text-white';
    }
  }

  private shiftClock(timeHHmm: string, deltaMin: number): string | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(timeHHmm);
    if (!m) return null;

    let h = parseInt(m[1], 10);
    let mins = parseInt(m[2], 10);

    let total = h * 60 + mins + deltaMin;

    total = (total % 1440 + 1440) % 1440;

    const hh = Math.floor(total / 60).toString().padStart(2, '0');
    const mm = (total % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  boardingTime(item: { departureTime?: string } | null | undefined): string {
    const t = item?.departureTime;
    const shifted = t ? this.shiftClock(t, -15) : null;
    return shifted ?? (t ?? '');
  }
}
