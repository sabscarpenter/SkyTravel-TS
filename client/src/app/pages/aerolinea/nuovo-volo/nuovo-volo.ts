import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Aircraft, Route, AerolineaService } from '../../../services/aerolinea';
import { Popup } from '../../../shared/popup/popup';

export interface NewFlightFormData {
  routeNumber: string;
  aircraftNumber: string;
  frequency: 'giornaliero' | 'settimanale';
  departureTime: string;
  days: string[] | null;
  startDate: string;
  weeksCount: number;
}

@Component({
  selector: 'app-nuovo-volo',
  standalone: true,
  imports: [CommonModule, Popup],
  templateUrl: './nuovo-volo.html',
  styleUrl: './nuovo-volo.css'
})
export class NuovoVolo {
  @Output() created = new EventEmitter<NewFlightFormData>();
  @Input() routes: Route[] = [];
  @Input() aircrafts: Aircraft[] = [];

  selectedFrequency: string = '';
  selectedAircraft: string = '';
  selectedRoute: string = '';
  departureTime: string = '';
  startDate: string = '';
  weeksCount: number = 1;
  selectedDays: Set<string> = new Set();
  isOpen = false;
  submitting = false;
  private lastCreatedPayload: NewFlightFormData | null = null;
  isOpenPopup = false;
  popupMessage = '';
  popupType: 'info' | 'warning' | 'error' | 'success' = 'info';
  criticita = false;
  completa = false;
  
  constructor(private airlineService: AerolineaService) {}

  open(): void {
    this.isOpen = true;
  this.isOpenPopup = false;
  this.popupMessage = '';
  this.criticita = false;
  this.completa = false;
    this.selectedFrequency = '';
    this.selectedAircraft = '';
    this.selectedRoute = '';
    this.departureTime = '';
    this.startDate = '';
    this.weeksCount = 1;
  }

  close(): void {
    this.isOpen = false;
  }

  onCreateClick(): void {
    if (!this.selectedRoute || !this.selectedAircraft || !this.selectedFrequency || !this.departureTime || !this.startDate) {
  this.openPopup('Compila tutti i campi obbligatori.', 'error');
      return;
    }
    if (this.selectedFrequency === 'settimanale' && this.selectedDays.size === 0) {
  this.openPopup('Seleziona almeno un giorno della settimana.', 'error');
      return;
    }

    const payload: NewFlightFormData = {
      routeNumber: this.selectedRoute,
      aircraftNumber: this.selectedAircraft,
      frequency: this.selectedFrequency as 'giornaliero' | 'settimanale',
      departureTime: this.departureTime,
      days: this.selectedFrequency === 'settimanale' ? Array.from(this.selectedDays) : null,
      startDate: this.startDate,
      weeksCount: this.weeksCount
    };

    console.log('Payload per la creazione del volo:', payload);

    this.submitting = true;
    this.airlineService.addAirlineFlights(payload).subscribe({
      next: () => {
        this.submitting = false;
        this.lastCreatedPayload = payload;
  this.openPopup('Creazione completata: volo aggiunto.', 'success', false, true);
      },
      error: (err) => {
        this.submitting = false;
        const raw = err?.error?.error || err?.message || 'Errore durante la creazione dei voli.';
        const m = String(raw).toLowerCase();
        const isDuplicate = m.includes('violates unique constraint') || m.includes('duplicate key');
        const msg = isDuplicate ? 'Alcuni voli esistono già per questi parametri.' : raw;
  this.openPopup(msg, 'error');
        console.error('Errore creazione volo:', err);
      }
    });
  }

  onToggleDay(dayCode: string, checked: boolean): void {
    if (checked) {
      this.selectedDays.add(dayCode);
    } else {
      this.selectedDays.delete(dayCode);
    }
  }

  onWeeksChange(value: string): void {
    const n = Number.parseInt(value || '1', 10);
    this.weeksCount = Number.isFinite(n) && n > 0 ? n : 1;
  }

  openPopup(message: string, type: 'info' | 'warning' | 'error' | 'success', criticita = false, completa = false) {
    this.popupMessage = message;
    this.popupType = type;
    this.criticita = criticita;
    this.completa = completa;
    this.isOpenPopup = true;
  }

  closePopup() {
    this.isOpenPopup = false;
    if (this.completa) {
      if (this.lastCreatedPayload) {
        this.created.emit(this.lastCreatedPayload);
      }
      this.lastCreatedPayload = null;
      this.close();
    }
  }

}
