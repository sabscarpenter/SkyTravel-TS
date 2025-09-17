import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Itinerario, Volo } from './soluzioni';
import { TicketTemporaneo } from '../pages/posti/posti';
import { environment } from '../../environments/environment';

export type TripType = 'soloAndata' | 'andataRitorno';

export interface PassengerInfo {
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	extraBags: number;
}

export interface SeatAssignment {
	seatNumber: string;
	seatClass: 'economy' | 'business' | 'first';
	passengerIndex: number;
	seatPrice?: number;
}

export interface BookingSegment {
	id: string;
	volo: Volo;
	direction: 'andata' | 'ritorno' | 'solo';
	segmentIndex: number;
	seats: SeatAssignment[];
}

export interface BookingState {
	tripType: TripType;
	numeroPasseggeri: number;
	passengers: PassengerInfo[];
	itinerarioAndata?: Itinerario;
	itinerarioRitorno?: Itinerario;
	segments: BookingSegment[];
	currentSegmentPos: number;
}

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
	private apiUrl = `${environment.apiBase}/booking`;

	constructor(private http: HttpClient) {}

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

	setItinerary(direction: 'andata' | 'ritorno' | 'solo', it: Itinerario) {
		if (!this.state) return;
		if (direction === 'solo') {
			this.state.tripType = 'soloAndata';
			this.state.itinerarioAndata = it;
			this.state.itinerarioRitorno = undefined;
		} else if (direction === 'andata') {
			this.state.itinerarioAndata = it;
		} else if (direction === 'ritorno') {
			this.state.itinerarioRitorno = it;
		}
		this.recomputeSegments();
	}

	setPassengers(list: PassengerInfo[]) {
		if (!this.state) return;
		this.state.passengers = list.map(p => ({
			firstName: p.firstName?.trim() || '',
			lastName: p.lastName?.trim() || '',
			dateOfBirth: p.dateOfBirth || '',
			extraBags: p.extraBags ?? 0,
		}));
	}

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

	setSeatsForCurrentSegment(assignments: SeatAssignment[]) {
		if (!this.state) return;
		const seg = this.getCurrentSegment();
		if (!seg) return;
		seg.seats = assignments;
	}

	nextSegment(): boolean {
		if (!this.state) return false;
		if (this.state.currentSegmentPos < this.state.segments.length - 1) {
			this.state.currentSegmentPos++;
			return true;
		}
		return false;
	}

	prevSegment(): boolean {
		if (!this.state) return false;
		if (this.state.currentSegmentPos > 0) {
			this.state.currentSegmentPos--;
			return true;
		}
		return false;
	}

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
		return this.http.get<ModelloConfigurazione>(`${this.apiUrl}/configuration`, { params });
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
    	return this.http.get<{ occupied: string[] }>(`${this.apiUrl}/seats`, { params: { volo } });
  	}

	trattieniPosti(ticketsData: TicketTemporaneo[]): Observable<TicketTemporaneo[]> {
    	return this.http.post<TicketTemporaneo[]>(`${this.apiUrl}/seats/reserve`, ticketsData);
  	}
}

