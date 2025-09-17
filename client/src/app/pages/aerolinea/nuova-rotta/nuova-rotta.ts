import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Aeroporto, NazioniAeroporti } from '../../../services/aeroporti';
import { AerolineaService, Route } from '../../../services/aerolinea';
import { Popup } from '../../../shared/popup/popup';

@Component({
  selector: 'app-nuova-rotta',
  standalone: true,
  imports: [CommonModule, Popup],
  templateUrl: './nuova-rotta.html'
})
export class NuovaRotta {
  @Output() created = new EventEmitter<void>();
  @Input() airports: NazioniAeroporti[] = [];
  @Input() companyIata: string = '';
  isOpen = false;

  selectedDepartIata: string = '';
  selectedArriveIata: string = '';
  distance_km: number = 0;
  duration_hours: number = 0;
  duration_minutes: number = 0;
  submitting = false;
  errorMsg = '';
  isOpenPopup = false;
  popupMessage = '';
  popupType: 'info' | 'warning' | 'error' | 'success' = 'info';
  criticita = false;
  completa = false;

  get airportsFlat(): Aeroporto[] {
    const out: Aeroporto[] = [];
    for (const group of this.airports || []) {
      if (group?.aeroporti?.length) out.push(...group.aeroporti);
    }
    return out;
  }

  get routeCode(): string {
    const comp = (this.companyIata).toUpperCase();
    const dep = (this.selectedDepartIata).toUpperCase();
    const arr = (this.selectedArriveIata).toUpperCase();
    return [comp, dep, arr].filter(Boolean).join('-');
  }

  open(): void {
    this.isOpen = true;
    this.selectedDepartIata = '';
    this.selectedArriveIata = '';
    this.distance_km = 0;
    this.duration_hours = 0;
    this.duration_minutes = 0;
    this.errorMsg = '';
  this.isOpenPopup = false;
  this.popupMessage = '';
  this.criticita = false;
  this.completa = false;
  }

  close(): void {
    this.isOpen = false;
  }

  constructor(private airlineService: AerolineaService) {}

  private get duration_min(): number {
    const h = Math.max(0, Number(this.duration_hours) || 0);
    const m = Math.max(0, Math.min(59, Number(this.duration_minutes) || 0));
    return h * 60 + m;
  }

  onCreateClick(): void {
    this.errorMsg = '';
    const payload: Route = {
      numero: this.routeCode,
      partenza: this.selectedDepartIata,
      arrivo: this.selectedArriveIata,
      durata_min: this.duration_min,
      lunghezza_km: Number(this.distance_km) || 0,
      partenza_nome: '',
      arrivo_nome: ''
    };

    if (!(payload.numero && payload.partenza && payload.arrivo && payload.durata_min > 0 && payload.lunghezza_km > 0)) {
      this.openPopup('Compila tutti i campi obbligatori.', 'error');
      return;
    }
    if (payload.partenza === payload.arrivo) {
      this.openPopup('La partenza e l\'arrivo non possono essere uguali.', 'error');
      return;
    }

    this.submitting = true;
    this.airlineService.addAirlineRoute(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.openPopup('Tratta creata con successo.', 'success', false, true);
      },
      error: (err: any) => {
        this.submitting = false;
        const msg: string = err?.error?.error || 'Errore durante la creazione della tratta.';
        const m = msg.toLowerCase();
        const isDuplicate = m.includes('violates unique constraint') || m.includes('duplicate key')
        if (isDuplicate) {
          this.openPopup('Esiste già una tratta con questo codice.', 'error');
        } else {
          this.openPopup(msg, 'error');
        }
        console.error('Create route error:', err);
      }
    });
  }

  onDistanceInput(val: string): void {
    const n = parseInt(val, 10);
    this.distance_km = isNaN(n) || n < 0 ? 0 : n;
  }

  onDurationHoursInput(val: string): void {
    const n = parseInt(val, 10);
    this.duration_hours = Math.max(0, isNaN(n) ? 0 : n);
  }

  onDurationMinutesInput(val: string): void {
    const n = parseInt(val, 10);
    const mins = Math.max(0, isNaN(n) ? 0 : n);
    this.duration_minutes = Math.min(59, mins);
  }

  openPopup(message: string, type: 'info' | 'warning' | 'error' | 'success', criticita = false, completa = false): void {
    this.popupMessage = message;
    this.popupType = type;
    this.criticita = criticita;
    this.completa = completa;
    this.isOpenPopup = true;
  }

  closePopup(): void {
    this.isOpenPopup = false;
    if (this.completa) {
      this.created.emit();
      this.close();
    }
  }
}
