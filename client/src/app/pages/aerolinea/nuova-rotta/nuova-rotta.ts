import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Aeroporto, NazioniAeroporti } from '../../../services/aeroporti';
import { AerolineaService, Route } from '../../../services/aerolinea';

@Component({
  selector: 'app-nuova-rotta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nuova-rotta.html',
  styleUrl: './nuova-rotta.css'
})
export class NuovaRotta {
  @Output() created = new EventEmitter<void>();
  @Input() airports: NazioniAeroporti[] = [];
  @Input() companyIata: string = '';
  isOpen = false;

  // Selected values from the dropdowns
  selectedDepartIata: string = '';
  selectedArriveIata: string = '';
  distance_km: number = 0;
  duration_hours: number = 0;
  duration_minutes: number = 0;
  submitting = false;
  errorMsg = '';

  // Popup (toast) state for errors/info
  popup = {
    visible: false,
    message: '',
    type: 'info' as 'info' | 'warning' | 'error' | 'success'
  };

  // Flattened list for easy rendering
  get airportsFlat(): Aeroporto[] {
    const out: Aeroporto[] = [];
    for (const group of this.airports || []) {
      if (group?.aeroporti?.length) out.push(...group.aeroporti);
    }
    return out;
  }

  // Auto-generated route code: IATAcompagnia-IATAandata-IATAritorno
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
    this.popup.visible = false;
    this.popup.message = '';
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

    // Basic validation
    if (!(payload.numero && payload.partenza && payload.arrivo && payload.durata_min > 0 && payload.lunghezza_km > 0)) {
      this.showPopup('error', 'Compila tutti i campi obbligatori.');
      return;
    }
    if (payload.partenza === payload.arrivo) {
      this.showPopup('error', 'La partenza e l\'arrivo non possono essere uguali.');
      return;
    }

    this.submitting = true;
    this.airlineService.addAirlineRoute(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.showPopup('success', 'Tratta creata con successo.');
      },
      error: (err: any) => {
        this.submitting = false;
        const msg: string = err?.error?.error || 'Errore durante la creazione della tratta.';
        // Mostra sempre il popup sopra il modal, con messaggio dedicato se è un errore di chiave duplicata
        const m = msg.toLowerCase();
        const isDuplicate = m.includes('violates unique constraint') || m.includes('duplicate key')
        if (isDuplicate) {
          this.showPopup('error', 'Esiste già una tratta con questo codice.');
        } else {
          this.showPopup('error', msg);
        }
        console.error('Create route error:', err);
      }
    });
  }

  // Gestisce l'input della distanza
  onDistanceInput(val: string): void {
    const n = parseInt(val, 10);
    this.distance_km = isNaN(n) || n < 0 ? 0 : n;
  }

  // Gestisce l'input delle ore di durata
  onDurationHoursInput(val: string): void {
    const n = parseInt(val, 10);
    this.duration_hours = Math.max(0, isNaN(n) ? 0 : n);
  }

  // Gestisce l'input dei minuti di durata
  onDurationMinutesInput(val: string): void {
    const n = parseInt(val, 10);
    const mins = Math.max(0, isNaN(n) ? 0 : n);
    this.duration_minutes = Math.min(59, mins);
  }

  // Popup helpers
  showPopup(type: 'info' | 'warning' | 'error' | 'success', message: string): void {
    this.popup.type = type;
    this.popup.message = message;
    this.popup.visible = true;
  }

  closePopup(): void {
    const wasSuccess = this.popup.type === 'success';
    this.popup.visible = false;
    if (wasSuccess) {
      this.created.emit();
      this.close();
    }
  }

  getPopupTitle(): string {
    switch (this.popup.type) {
      case 'info': return 'Informazione';
      case 'warning': return 'Attenzione';
      case 'success': return 'Operazione riuscita';
      case 'error':
      default: return 'Errore';
    }
  }
}
