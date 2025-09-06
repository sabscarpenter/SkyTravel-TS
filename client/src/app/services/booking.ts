import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Itinerario, Volo } from './soluzioni';
import { TicketTemporaneo } from '../pages/posti/posti';

/**
 * Type of trip for the booking flow.
 * - 'soloAndata' => one-way (single direction)
 * - 'andataRitorno' => round-trip (outbound + return)
 */
export type TripType = 'soloAndata' | 'andataRitorno';

/**
 * Personal details for a single passenger, entered once and reused
 * across all segments in the booking.
 */
export interface PassengerInfo {
	firstName: string;
	lastName: string;
	dateOfBirth: string; // ISO yyyy-MM-dd
	extraBags: number;
}

/**
 * A seat chosen for a passenger on a specific flight segment.
 * Includes class and optional computed price used at checkout.
 */
export interface SeatAssignment {
	seatNumber: string;
	seatClass: 'economy' | 'business' | 'first';
	passengerIndex: number; // index into passengers array
	seatPrice?: number; // computed price for checkout summary
}

/**
 * One logical leg for which seats must be selected.
 * It corresponds to a single Volo (a direct flight) within the selected
 * itinerary (andata/ritorno or solo). For multi-leg itineraries, there will
 * be multiple segments.
 */
export interface BookingSegment {
	id: string; // unique per segment, e.g. numero + index
	volo: Volo;
	direction: 'andata' | 'ritorno' | 'solo';
	segmentIndex: number; // 0..N-1 per itinerario
	seats: SeatAssignment[]; // length should match passengers length
}

/**
 * Client-side booking state kept during the multi-step flow.
 * Holds selected itineraries, passengers, the generated list of segments
 * (legs) and the current segment position for seat selection.
 */
export interface BookingState {
	tripType: TripType;
	numeroPasseggeri: number;
	passengers: PassengerInfo[]; // inseriti una volta sola
	itinerarioAndata?: Itinerario;
	itinerarioRitorno?: Itinerario;
	segments: BookingSegment[]; // generati a partire dagli itinerari
	currentSegmentPos: number; // indice del segmento su cui scegliere i posti
}

/**
 * Aircraft seating model returned by the backend to build the seat map.
 * Defines seat counts per class and the seat layout pattern (e.g. 3-3, 3-4-3).
 */
export interface ModelloConfigurazione {
	nome: string;
	totale_posti: number;
	posti_economy: number;
	posti_business: number;
	posti_first: number;
	layout: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
	private state: BookingState | null = null;
	private apiUrl = 'http://localhost:3000/api/booking';

	constructor(private http: HttpClient) {}

	/** Avvia una nuova prenotazione a partire dai parametri di ricerca */
	start(tripType: TripType, numeroPasseggeri: number) {
		this.state = {
			tripType,
			numeroPasseggeri,
			passengers: Array.from({ length: Math.max(1, numeroPasseggeri) }, () => ({
				firstName: '',
				lastName: '',
				dateOfBirth: '',
				extraBags: 0,
			})),
			segments: [],
			currentSegmentPos: 0,
		};
	}

	/** Imposta l'itinerario selezionato per andata/ritorno/solo e rigenera i segmenti */
	setItinerary(direction: 'andata' | 'ritorno' | 'solo', it: Itinerario) {
		if (!this.state) return;
		if (direction === 'solo') {
			this.state.tripType = 'soloAndata'; // tecnicamente è solo, ma trattiamo come flusso singolo
			this.state.itinerarioAndata = it;
			this.state.itinerarioRitorno = undefined;
		} else if (direction === 'andata') {
			this.state.itinerarioAndata = it;
		} else if (direction === 'ritorno') {
			this.state.itinerarioRitorno = it;
		}
		this.recomputeSegments();
	}

	/** Inserisce/aggiorna la lista dei passeggeri (una volta sola) */
	setPassengers(list: PassengerInfo[]) {
		if (!this.state) return;
		this.state.passengers = list.map(p => ({
			firstName: p.firstName?.trim() || '',
			lastName: p.lastName?.trim() || '',
			dateOfBirth: p.dateOfBirth || '',
			extraBags: p.extraBags ?? 0,
		}));
	}

	/**
	 * Rimuove l'itinerario selezionato per la direzione indicata e rigenera i segmenti
	 */
	clearItinerary(direction: 'andata' | 'ritorno' | 'solo') {
		if (!this.state) return;
		if (direction === 'solo') {
			this.state.itinerarioAndata = undefined;
			this.state.itinerarioRitorno = undefined;
		} else if (direction === 'andata') {
			this.state.itinerarioAndata = undefined;
		} else if (direction === 'ritorno') {
			this.state.itinerarioRitorno = undefined;
		}
		this.recomputeSegments();
	}

	/** Salva le assegnazioni posti per il segmento corrente */
	setSeatsForCurrentSegment(assignments: SeatAssignment[]) {
		if (!this.state) return;
		const seg = this.getCurrentSegment();
		if (!seg) return;
		seg.seats = assignments;
	}

	/** Passa al prossimo segmento; ritorna true se ci sono altri segmenti */
	nextSegment(): boolean {
		if (!this.state) return false;
		if (this.state.currentSegmentPos < this.state.segments.length - 1) {
			this.state.currentSegmentPos++;
			return true;
		}
		return false;
	}

	/** Ritorna al segmento precedente */
	prevSegment(): boolean {
		if (!this.state) return false;
		if (this.state.currentSegmentPos > 0) {
			this.state.currentSegmentPos--;
			return true;
		}
		return false;
	}

	/** Stato readonly per i componenti */
	getState(): BookingState | null {
		return this.state;
	}

	getPassengers(): PassengerInfo[] {
		return this.state?.passengers ?? [];
	}

	getNumeroPasseggeri(): number {
		return this.state?.numeroPasseggeri ?? 1;
	}

	getSegments(): BookingSegment[] {
		return this.state?.segments ?? [];
	}

	getCurrentSegment(): BookingSegment | null {
		if (!this.state) return null;
		return this.state.segments[this.state.currentSegmentPos] ?? null;
	}

	getCurrentSegmentPosition(): { index: number; total: number } {
		if (!this.state) return { index: 0, total: 0 };
		return { index: this.state.currentSegmentPos, total: this.state.segments.length };
	}

	getModelloConfigurazione(nome: string): Observable<ModelloConfigurazione> {
		const params = new HttpParams().set('nome', nome);
		return this.http.get<ModelloConfigurazione>(`${this.apiUrl}/configurazione`, { params });
	}

	isSeatSelectionComplete(): boolean {
		if (!this.state) return false;
		return this.state.segments.every(seg => seg.seats.length === this.state!.numeroPasseggeri);
	}

	reset() {
		this.state = null;
	}

	private recomputeSegments() {
		if (!this.state) return;
		const segments: BookingSegment[] = [];

		const pushItinerary = (direction: 'solo' | 'andata' | 'ritorno', it?: Itinerario) => {
			if (!it) return;
			it.voli.forEach((v, idx) => {
				segments.push({
					id: `${direction}-${v.numero || 'SEG'}-${idx}`,
					volo: v,
					direction,
					segmentIndex: idx,
					seats: [],
				});
			});
		};

		if (this.state.itinerarioAndata && !this.state.itinerarioRitorno) {
			pushItinerary('solo', this.state.itinerarioAndata);
		} else {
			pushItinerary('andata', this.state.itinerarioAndata);
			pushItinerary('ritorno', this.state.itinerarioRitorno);
		}

		this.state.segments = segments;
		this.state.currentSegmentPos = 0;
	}

	listaPostiOccupati(volo: string): Observable<{ occupied: string[] }> {
    	return this.http.get<{ occupied: string[] }>(`${this.apiUrl}/posti`, { params: { volo } });
  	}

	trattieniPosti(ticketsData: TicketTemporaneo[]): Observable<TicketTemporaneo[]> {
    	return this.http.post<TicketTemporaneo[]>(`${this.apiUrl}/trattieni`, ticketsData);
  	}
}

