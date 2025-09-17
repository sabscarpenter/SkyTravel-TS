import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { SoluzioniService, Itinerario } from '../../services/soluzioni';
import { BookingService, TripType } from '../../services/booking';
import { Dettagli } from '../dettagli/dettagli';
import { Popup } from '../../shared/popup/popup';

@Component({
  selector: 'app-voli',
  imports: [CommonModule, FormsModule, Dettagli, Popup],
  templateUrl: './voli.html',
  styleUrl: './voli.css',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Voli implements OnInit {

  constructor(
    private soluzioniService: SoluzioniService,
    private router: Router,
    private location: Location,
    private booking: BookingService
  ) {}

  tipoViaggio: TripType = 'soloAndata';
  partenzaIata = '';
  arrivoIata = '';
  partenzaCitta = '';
  arrivoCitta = '';
  dataAndata = '';
  dataRitorno = '';
  numeroPasseggeri = 1;

  loading = false;
  error = '';

  isOpenPopup = false;
  popupMessage = '';
  popupType: 'info' | 'warning' | 'error' | 'success' = 'info';

  itinerariAndata: Itinerario[] = [];
  itinerariRitorno: Itinerario[] = [];
  private originalAndata: Itinerario[] = [];
  private originalRitorno: Itinerario[] = [];

  sortByAndata: 'none' | 'prezzo' | 'durata' | 'scali' = 'none';
  sortOrderAndata: 'asc' | 'desc' = 'asc';
  sortByRitorno: 'none' | 'prezzo' | 'durata' | 'scali' = 'none';
  sortOrderRitorno: 'asc' | 'desc' = 'asc';

  selectedAndata: Itinerario | null = null;
  selectedRitorno: Itinerario | null = null;

  get showPassengerForm(): boolean {
    return this.tipoViaggio === 'soloAndata'
      ? !!this.selectedAndata
      : !!this.selectedAndata && !!this.selectedRitorno;
  }

  ngOnInit() {
    const st = history.state;

    if (!st?.partenza || !st?.arrivo) {
      this.router.navigate(['/']);
      return;
    }

    this.tipoViaggio = st.tipoViaggio;
    this.partenzaIata = st.partenza;
    this.arrivoIata   = st.arrivo;
    this.partenzaCitta = st.partenzaCitta;
    this.arrivoCitta   = st.arrivoCitta;
    this.dataAndata    = st.dataAndata;
    this.dataRitorno   = st.dataRitorno;
    this.numeroPasseggeri = +st.passeggeri; 
    console.log('Stato ricevuto:', st);

    this.booking.start(this.tipoViaggio, this.numeroPasseggeri);
    this.cerca();
  }

  private cerca() {
    this.error = '';
    this.loading = true;
    this.itinerariAndata = [];
    this.itinerariRitorno = [];
    this.selectedAndata = null;
    this.selectedRitorno = null;
    this.sortByAndata = 'none';
    this.sortOrderAndata = 'asc';
    this.sortByRitorno = 'none';
    this.sortOrderRitorno = 'asc';

    if (this.tipoViaggio === 'soloAndata') {
      this.soluzioniService
      .cercaSoloAndata(this.partenzaIata, this.arrivoIata, this.dataAndata)
      .subscribe({
        next: data => {
        this.itinerariAndata = data;
        this.originalAndata = data.slice();
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.error = 'Errore ricerca voli.';
          this.openPopup('Errore nella ricerca dei voli. Riprova più tardi.', 'error');
          this.loading = false;
        }
      });
    } else {
      this.soluzioniService
      .cercaAndataRitorno(this.partenzaIata, this.arrivoIata, this.dataAndata, this.dataRitorno)
      .subscribe({
        next: (data: any) => {
          console.log('Dati ricevuti dall\'API:', data);
          this.itinerariAndata  = data?.andata || [];
          this.itinerariRitorno = data?.ritorno || [];
          this.originalAndata = this.itinerariAndata.slice();
          this.originalRitorno = this.itinerariRitorno.slice();
          console.log('Itinerari andata:', this.itinerariAndata);
          console.log('Itinerari ritorno:', this.itinerariRitorno);
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.error = 'Errore ricerca andata/ritorno.';
          this.openPopup('Errore nella ricerca dei voli andata/ritorno. Riprova più tardi.', 'error');
          this.loading = false;
        }
      });
    }
  }

  selezionaItinerarioSoloAndata(it: Itinerario) {
    this.selectedAndata = it;
    this.booking.setItinerary('solo', it);
  }

  deselezionaItinerarioSoloAndata() {
    this.selectedAndata = null;
    this.selectedRitorno = null;
    this.booking.clearItinerary('solo');
  }

  selezionaItinerarioAndata(it: Itinerario) {
    this.selectedAndata = it;
    this.booking.setItinerary('andata', it);
    if (this.tipoViaggio === 'soloAndata') {
      return;
    }
  }

  deselezionaItinerarioAndata() {
    this.selectedAndata = null;
    this.selectedRitorno = null;
    this.booking.clearItinerary('andata');
  }

  selezionaItinerarioRitorno(it: Itinerario) {
    if (this.tipoViaggio === 'andataRitorno' && !this.selectedAndata) {
    this.openPopup('Seleziona prima un itinerario di andata.', 'warning');
    return;
    }
    this.selectedRitorno = it;
    this.booking.setItinerary('ritorno', it);
  }

  deselezionaItinerarioRitorno() {
    this.selectedRitorno = null;
    this.booking.clearItinerary('ritorno');
  }

  tornaIndietro() {
    this.location.back();
  }

  private toDate(val?: string | Date): Date | null {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

    if (/^\d{2}:\d{2}$/.test(val)) {
      const [h, m] = val.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    }

    const norm = val.includes('T') ? val : val.replace(' ', 'T');
    const d = new Date(norm);
    return isNaN(d.getTime()) ? null : d;
  }

  formatOra(v?: string | Date): string {
    const d = this.toDate(v as any);
    if (!d) return '--:--';
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatData(v?: string | Date): string {
    const d = this.toDate(v as any);
    if (!d) return '--/--/----';
    return d.toLocaleDateString('it-IT');
  }

  calcolaDurataVolo(partenza?: string, arrivo?: string): string {
    const dp = this.toDate(partenza as any);
    const da = this.toDate(arrivo as any);
    if (!dp || !da) return '-- --';

    let diffMin = Math.round((da.getTime() - dp.getTime()) / 60000);
    if (diffMin < 0) diffMin += 24 * 60;

    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  calcolaScalo(prevArrivo?: string, nextPartenza?: string): string {
    const a = this.toDate(prevArrivo as any);
    const p = this.toDate(nextPartenza as any);
    if (!a || !p) return 'Scalo';

    let diffMin = Math.round((p.getTime() - a.getTime()) / 60000);
    if (diffMin < 0) diffMin += 24 * 60;

    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `Scalo di ${h}h ${m.toString().padStart(2, '0')}m`;
  }

  calcolaPrezzo(itinerario: Itinerario): number {
    let prezzo = 0;
    for (const volo of itinerario.voli) {
      prezzo += Math.round(volo.distanza * (0.10 - (0.03 * (itinerario.voli.length - 1))));
    }
    return prezzo;
  }

  private durataTotaleMinuti(it: Itinerario): number {
    if (!it.voli?.length) return 0;
    const start = this.toDate(it.voli[0].ora_partenza as any);
    const end = this.toDate(it.voli[it.voli.length - 1].ora_arrivo as any);
    if (!start || !end) return 0;
    let diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
    while (diffMin < 0) diffMin += 24 * 60;
    return diffMin;
  }

  private scaliCount(it: Itinerario): number {
    return Math.max(0, (it.voli?.length || 1) - 1);
  }

  applySortAndata() {
    if (this.sortByAndata === 'none') {
      this.itinerariAndata = this.originalAndata.slice();
      return;
    }
    const base = this.originalAndata.slice();
    base.sort((a, b) => {
      let va = 0, vb = 0;
      switch (this.sortByAndata) {
        case 'prezzo':
          va = this.calcolaPrezzo(a); vb = this.calcolaPrezzo(b); break;
        case 'durata':
          va = this.durataTotaleMinuti(a); vb = this.durataTotaleMinuti(b); break;
        case 'scali':
          va = this.scaliCount(a); vb = this.scaliCount(b); break;
      }
      const cmp = va - vb;
      return this.sortOrderAndata === 'asc' ? cmp : -cmp;
    });
    this.itinerariAndata = base;
  }

  toggleOrderAndata() {
    this.sortOrderAndata = this.sortOrderAndata === 'asc' ? 'desc' : 'asc';
    if (this.sortByAndata !== 'none') this.applySortAndata();
  }

  applySortRitorno() {
    if (this.sortByRitorno === 'none') {
      this.itinerariRitorno = this.originalRitorno.slice();
      return;
    }
    const base = this.originalRitorno.slice();
    base.sort((a, b) => {
      let va = 0, vb = 0;
      switch (this.sortByRitorno) {
        case 'prezzo':
          va = this.calcolaPrezzo(a); vb = this.calcolaPrezzo(b); break;
        case 'durata':
          va = this.durataTotaleMinuti(a); vb = this.durataTotaleMinuti(b); break;
        case 'scali':
          va = this.scaliCount(a); vb = this.scaliCount(b); break;
      }
      const cmp = va - vb;
      return this.sortOrderRitorno === 'asc' ? cmp : -cmp;
    });
    this.itinerariRitorno = base;
  }

  toggleOrderRitorno() {
    this.sortOrderRitorno = this.sortOrderRitorno === 'asc' ? 'desc' : 'asc';
    if (this.sortByRitorno !== 'none') this.applySortRitorno();
  }

  openPopup(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') {
    this.popupMessage = message;
    this.popupType = type;
    this.isOpenPopup = true;
  }

  closePopup() {
    this.isOpenPopup = false;
  }
}
