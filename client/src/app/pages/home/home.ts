import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TripType } from '../../services/booking';
import { AeroportiService } from '../../services/aeroporti';
import { NazioniAeroporti } from '../../services/aeroporti';

type Aeroporto = {
  iata: string;
  city: string;
  name: string;
};


@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Home {
  constructor(private router: Router, private aeroportiService: AeroportiService) {}
  
  ngOnInit(): void {
    this.loadDatiAeroporti();
  }

  nazioniAeroporti: NazioniAeroporti[] = [];

  dropdownPartenzaAperto = false;
  dropdownArrivoAperto   = false;

  partenzaNazione: string = '';
  arrivoNazione:   string = '';

  partenzaIata: string = '';
  arrivoIata:   string = '';

  tipoViaggio: TripType = 'andataRitorno';

  dataAndataISO = '';
  dataRitornoISO = '';
  dataAndataDisplay = '';
  dataRitornoDisplay = '';

  todayISO: string = this.toLocalISO(new Date());

  numeroPasseggeri = 1;

  get aeroportiPartenza() {
    return this.nazioniAeroporti.find(n => n.nazione === this.partenzaNazione)?.aeroporti ?? [];
  }
  get aeroportiArrivo() {
    return this.nazioniAeroporti.find(n => n.nazione === this.arrivoNazione)?.aeroporti ?? [];
  }

  private loadDatiAeroporti() {
    this.aeroportiService.getAeroporti().subscribe({
      next: (data) => {
        this.nazioniAeroporti = data;
        if (this.nazioniAeroporti.length > 0) {
          this.partenzaNazione = this.nazioniAeroporti[0].nazione;
        }
        if (this.nazioniAeroporti.length > 1) {
          this.arrivoNazione = this.nazioniAeroporti[1].nazione;
        } else if (this.nazioniAeroporti.length === 1) {
          this.arrivoNazione = this.nazioniAeroporti[0].nazione;
        }
      },
      error: (err) => {
        console.error('Errore nel caricamento degli aeroporti:', err);
      }
    });
  }

  scegliAeroportoPartenza(a: Aeroporto) {
    this.partenzaIata = a.iata;
    this.dropdownPartenzaAperto = false;
  }
  scegliAeroportoArrivo(a: Aeroporto) {
    this.arrivoIata = a.iata;
    this.dropdownArrivoAperto = false;
  }

  onTipoViaggioChange(tipo: TripType) {
    this.tipoViaggio = tipo;
    if (tipo === 'soloAndata') {
      this.dataRitornoISO = '';
      this.dataRitornoDisplay = '';
    }
  }

  swapCities() {
    [this.partenzaNazione, this.arrivoNazione] = [this.arrivoNazione, this.partenzaNazione];
    [this.partenzaIata, this.arrivoIata] = [this.arrivoIata, this.partenzaIata];
  }

  selezionaData(event: any, tipo: 'andata' | 'ritorno') {
    const iso = event?.target?.value;
    if (!iso) return;

    const display = this.formattaData(iso);
    if (tipo === 'andata') {
      this.dataAndataISO = iso;
      this.dataAndataDisplay = display;
      if (this.dataRitornoISO && this.dataRitornoISO < this.dataAndataISO) {
        this.dataRitornoISO = '';
        this.dataRitornoDisplay = '';
      }
    } else {
      this.dataRitornoISO = iso;
      this.dataRitornoDisplay = display;
    }

    const id = tipo === 'andata' ? 'cally-popover1' : 'cally-popover2';
    (document.getElementById(id) as any)?.hidePopover?.();
  }

  formattaData(iso: string): string {
    const d = new Date(iso);
    const dd = d.getDate().toString().padStart(2,'0');
    const mm = (d.getMonth()+1).toString().padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private toLocalISO(d: Date): string {
    const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dt.toISOString().slice(0, 10);
  }

  aumentaPasseggeri() { if (this.numeroPasseggeri < 9) this.numeroPasseggeri++; }
  diminuisciPasseggeri() { if (this.numeroPasseggeri > 1) this.numeroPasseggeri--; }

  cerca() {
    if (!this.partenzaIata || !this.arrivoIata) return;
    if (this.partenzaIata === this.arrivoIata) return;

    const partenzaCitta = this.getAirportCity(this.partenzaIata);
    const arrivoCitta = this.getAirportCity(this.arrivoIata);

    const payload = {
      tipoViaggio: this.tipoViaggio,
      partenza: this.partenzaIata,
      arrivo: this.arrivoIata,
      partenzaCitta: partenzaCitta,
      arrivoCitta: arrivoCitta,
      dataAndata: this.dataAndataISO,
      dataRitorno: this.tipoViaggio === 'andataRitorno' ? this.dataRitornoISO : '',
      passeggeri: this.numeroPasseggeri,
    };

    this.router.navigate(['/voli'], { state: payload });
  }

  chiudiDropdownCitta() {
    this.dropdownPartenzaAperto = false;
    this.dropdownArrivoAperto = false;
  }

  getAirportLabel(iata: string): string {
    for (const n of this.nazioniAeroporti) {
      const a = n.aeroporti.find(x => x.iata === iata);
      if (a) return `${a.city} (${a.iata}) — ${a.name}`;
    }
    return iata || '';
  }

  private getAirportCity(iata: string): string {
    for (const n of this.nazioniAeroporti) {
      const a = n.aeroporti.find(x => x.iata === iata);
      if (a) return a.city;
    }
    return '';
  }
}
