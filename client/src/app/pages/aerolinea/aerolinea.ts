import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AerolineaService, AerolineaInfo, Route, AerolineaStatistics, Flight, Aircraft } from '../../services/aerolinea';
import { AeroportiService, NazioniAeroporti } from '../../services/aeroporti';
import { NuovaRotta } from './nuova-rotta/nuova-rotta';
import { NuovoVolo } from './nuovo-volo/nuovo-volo';
import { Popup } from '../../shared/popup/popup';

@Component({
  selector: 'app-aerolinea',
  standalone: true,
  imports: [CommonModule, FormsModule, NuovaRotta, NuovoVolo, Popup],
  templateUrl: './aerolinea.html',
  styleUrls: ['./aerolinea.css']
})
export class Aerolinea implements OnInit{
  aerolineaInfo: AerolineaInfo | null = null;
  companyRoutes: Route[] = [];
  companyFlights: Flight[] = [];
  filteredFlights: Flight[] = [];
  companyAircrafts: Aircraft[] = [];
  selectedRouteFilter: string = 'all';
  bestRoutes: any = [];
  imageLoaded: boolean = false;
  airlineStatistics: AerolineaStatistics | null = null;
  airportsByCountry: NazioniAeroporti[] = [];
  private deletingRoutes = new Set<string>();
  @ViewChild('routeModal') routeModal?: NuovaRotta;
  @ViewChild('flightModal') flightModal?: NuovoVolo;

  // Popup (toast) state for errors/info like in passeggero
  isOpenPopup = false;
  popupMessage = '';
  popupType: 'info' | 'warning' | 'error' | 'success' = 'info';

  // Simple confirm overlay state for destructive actions
  isConfirmOpen = false;
  confirmMessage = '';
  private onConfirm?: () => void;

  constructor(private airlineService: AerolineaService, private aeroportiService: AeroportiService) {}

  ngOnInit(): void {
    this.loadCompanyData();
    this.loadRoutes();
    this.loadCompanyStatistics();
    this.loadBestRoutes();
    this.loadFlights();
    this.loadAircrafts();
    this.loadAirports();
  }

  loadCompanyData(): void {
    this.imageLoaded = false; // Reset del flag quando si caricano nuovi dati
    this.airlineService.getAirlineProfile().subscribe({
      next: (profile) => {
        console.log('Profilo ricevuto:', profile);
        this.aerolineaInfo = profile;
      },
      error: (error) => {
        console.error('Errore nel caricamento del profilo:', error);
      }
    });
  }

  loadAirports(): void {
    this.aeroportiService.getAeroporti().subscribe({
      next: (groups) => {
        this.airportsByCountry = groups;
      },
      error: (error) => {
        console.error('Errore nel caricamento degli aeroporti:', error);
      }
    });
  }

  loadCompanyStatistics(): void {
    this.airlineService.getAirlineStatistics().subscribe({
      next: (stats) => {
        console.log('Statistiche ricevute:', stats);
        this.airlineStatistics = stats;
      },
      error: (error) => {
        console.error('Errore nel caricamento delle statistiche:', error.error);
      }
    });
  }

  loadRoutes(): void {
    // Carica le tratte della compagnia
    console.log('Caricamento tratte per compagnia:', this.aerolineaInfo?.nome);
    this.airlineService.getAirlineRoutes().subscribe({
      next: (routes) => {
        console.log('Tratte ricevute:', routes);
        console.log('Numero di tratte:', routes.length);
        this.companyRoutes = routes;
      },
      error: (error) => {
        console.error('Errore nel caricamento delle tratte:', error);
        console.error('Dettagli errore:', error.error);
      // opzionale: mostra un popup non bloccante
      // this.openPopup('Errore nel caricamento delle tratte. Riprova più tardi.', 'error');
      }
    });
  }

  loadBestRoutes(): void {
    this.airlineService.getBestRoutes().subscribe({
      next: (routes) => {
        console.log('Migliori tratte ricevute:', routes);
        this.bestRoutes = routes;
      },
      error: (error) => {
        console.error('Errore nel caricamento delle migliori tratte:', error);
      }
    });
  }

  openNuovaRottaModal(): void {
    this.routeModal?.open();
  }

  loadFlights(): void {
    this.airlineService.getAirlineFlights().subscribe({
      next: (flights) => {
        console.log('Voli ricevuti:', flights);
        this.companyFlights = flights;
        this.filteredFlights = flights; // Inizializza con tutti i voli
        this.selectedRouteFilter = 'all'; // Reset del filtro
      },
      error: (error) => {
        console.error('Errore nel caricamento dei voli:', error);
      }
    });
  }

  loadAircrafts(): void {
    this.airlineService.getAirlineAircrafts().subscribe({
      next: (aircrafts) => {
        this.companyAircrafts = aircrafts;
      },
      error: (error) => {
        console.error('Errore nel caricamento degli aerei:', error);
      }
    });
  }

  openNuovoVoloModal(): void {
    this.flightModal?.open();
  }

  // Filtro voli per tratta
  onRouteFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedRouteFilter = target.value;
    
    if (this.selectedRouteFilter === 'all' || this.selectedRouteFilter === '') {
      // Mostra tutti i voli
      this.filteredFlights = this.companyFlights;
    } else {
      // Filtra i voli per la tratta selezionata
      this.filteredFlights = this.companyFlights.filter(flight => 
        flight.tratta_id === this.selectedRouteFilter
      );
    }
    console.log('Filtro applicato:', this.selectedRouteFilter, 'Voli filtrati:', this.filteredFlights.length);
  }

  // Ottiene il nome formattato della tratta (es: "FCO → MXP")
  getRouteDisplayName(route: Route): string {
    return `${route.partenza} → ${route.arrivo}`;
  }

  // Ottiene il nome formattato della tratta tramite ID
  getRouteDisplayByTrattaId(trattaId: string): string {
    const route = this.companyRoutes.find(r => r.numero === trattaId);
    return route ? this.getRouteDisplayName(route) : 'Tratta sconosciuta';
  }


  // Gestione caricamento immagine logo
  onImageLoad(): void {
    this.imageLoaded = true;
  }

  onImageError(): void {
    this.imageLoaded = false;
    // Opzionalmente, potresti impostare un'immagine di fallback
    console.warn('Errore nel caricamento del logo della compagnia');
  }

  /**
   * Ottiene l'URL completo per la foto profilo
   */
  getPhotoUrl(): string {
    if (this.aerolineaInfo?.foto) {
      return this.airlineService.getPhotoUrl(this.aerolineaInfo?.foto);
    }
    return ''; // fallback
  }

  isRouteDeleting(routeNumber: string): boolean {
    return this.deletingRoutes.has(routeNumber);
  }

  deleteRoute(route: Route): void {
    const code = route.numero;
    this.openConfirm(`Confermi l'eliminazione della tratta ${code}?`, () => {
      this.performDeleteRoute(route);
    });
  }

  private performDeleteRoute(route: Route) {
    const code = route.numero;
    this.deletingRoutes.add(code);
    this.airlineService.deleteAirlineRoute(code).subscribe({
      next: () => {
        this.deletingRoutes.delete(code);
        // Reset filtro se necessario
        if (this.selectedRouteFilter === code) {
          this.selectedRouteFilter = 'all';
        }
        this.loadRoutes();
      },
      error: (error) => {
        this.deletingRoutes.delete(code);
        console.error('Errore nell\'eliminazione della tratta:', error.error);
        this.openPopup(error.error?.message , 'error');
      }
    });
  }

  // Popup helpers
  openPopup(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') {
    this.popupMessage = message;
    this.popupType = type;
    this.isOpenPopup = true;
  }
  closePopup() { this.isOpenPopup = false; }

  // Confirm helpers
  openConfirm(message: string, onConfirm: () => void) {
    this.confirmMessage = message;
    this.onConfirm = onConfirm;
    this.isConfirmOpen = true;
  }
  acceptConfirm() {
    this.isConfirmOpen = false;
    const cb = this.onConfirm; this.onConfirm = undefined;
    if (cb) cb();
  }
  cancelConfirm() {
    this.isConfirmOpen = false;
    this.onConfirm = undefined;
  }
}
