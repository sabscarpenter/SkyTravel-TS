import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Itinerario } from '../../services/soluzioni';
import { BookingService, BookingSegment, PassengerInfo, SeatAssignment, ModelloConfigurazione } from '../../services/booking';
import { ReservationTimerService } from '../../services/reservation-timer';
import { Popup } from '../../shared/popup/popup';

export interface TicketTemporaneo {
  classe: 'first' | 'business' | 'economy';
  prezzo: number;
  posto: string;
  volo: string;
  nome: string;
  cognome: string;
  bagagli: number;
}

interface Seat {
  number: string;
  row: number;
  letter: string;
  class: 'first' | 'business' | 'economy';
  status: 'available' | 'occupied' | 'selected';
  price: number;
  passengerIndex?: number;
}

interface Booking {
  seats: Seat[];
  totalPrice: number;
}

@Component({
  selector: 'app-posti',
  imports: [FormsModule, CommonModule, Popup],
  templateUrl: './posti.html',
  styleUrl: './posti.css',
  standalone: true
})
export class Posti implements OnInit {
  modelloConfigurazione: ModelloConfigurazione | null = null;
  occupiedSeats: string[] = [];
  selectedSeats: Seat[] = [];
  seats: Seat[] = [];
  currentBooking: Booking = {
    seats: [],
    totalPrice: 0,
  };

  selectedItinerary: Itinerario | null = null;
  numeroPasseggeri: number = 1;
  requiredSeats: number = 1;
  bookingStep: string = '';

  passengers: PassengerInfo[] = [];
  currentSegment: BookingSegment | null = null;
  segmentPosition: { index: number; total: number } = { index: 0, total: 0 };
  hasBothDirections = false;

  isOpenPopup = false;
  popupMessage = '';
  popupType: 'info' | 'warning' | 'error' | 'success' = 'info';

  timerAlreadyStarted = false;
  remainingSeconds = 0;
  get remainingMinutesText() {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  constructor(private router: Router, private bookingService: BookingService, private timer: ReservationTimerService) {}

  ngOnInit() {
    const st = this.bookingService.getState();
    if (!st || (st.segments.length === 0)) {
      this.router.navigate(['/']);
      return;
    }

    this.passengers = this.bookingService.getPassengers();
    this.numeroPasseggeri = this.bookingService.getNumeroPasseggeri();
    this.requiredSeats = this.numeroPasseggeri;
    this.selectedItinerary = st.itinerarioAndata || st.itinerarioRitorno || null;
    this.currentSegment = this.bookingService.getCurrentSegment();
    this.segmentPosition = this.bookingService.getCurrentSegmentPosition();
    this.bookingStep = this.currentSegment?.direction || '';

    const dirs = new Set(st.segments.map(s => s.direction));
    this.hasBothDirections = dirs.has('andata') && dirs.has('ritorno');

    this.loadModelloConfigurazione();

    this.timer.reset();
    this.timerAlreadyStarted = false;
  }

  private onTimerExpired() {
    this.showPopup('Tempo scaduto: i posti riservati non sono più disponibili. Torna alla ricerca per ricominciare.', 'error');
    this.clearAllSelections();
  }

  private loadModelloConfigurazione() {
    this.bookingService.getModelloConfigurazione(this.currentSegment?.volo?.modello || '').subscribe({
      next: (data) => {
        this.modelloConfigurazione = data;
        this.loadSeats();
      },
      error: (err) => {
        console.error('Errore nel caricamento degli aeroporti:', err);
      }
    });
  }

  private loadSeats() {
    this.bookingService.listaPostiOccupati(this.currentSegment?.volo?.numero || '').subscribe({
      next: (data) => {
        this.occupiedSeats = data.occupied;
        this.generate();
      },
      error: (err) => {
        console.error('Errore nel caricamento dei posti occupati:', err);
      }
    });
  }

  getSeats(seatClass: 'first' | 'business' | 'economy'): Seat[] {
    return this.seats.filter(seat => seat.class === seatClass);
  }

  getFirstSeats(): number {
    return this.modelloConfigurazione?.posti_first || 0;
  }

  getBusinessSeats(): number {
    return this.modelloConfigurazione?.posti_business || 0;
  }

  getEconomySeats(): number {
    return this.modelloConfigurazione?.posti_economy || 0;
  }

  getTotalSeats(): number {
    return this.modelloConfigurazione?.totale_posti || 0;
  }

  getAvailableSeats(): number {
    return this.seats.filter(seat => seat.status === 'available').length;
  }

  getRowsForClass(seatClass: 'first' | 'business' | 'economy'): number[] {
    const seatsForClass = this.getSeats(seatClass);
    const rows = [...new Set(seatsForClass.map(seat => seat.row))];
    return rows.sort((a, b) => a - b);
  }

  getClassLayout(seatClass: 'first' | 'business' | 'economy'): string {
    if (!this.modelloConfigurazione) return '';

    switch (seatClass) {
      case 'first':
        switch (this.modelloConfigurazione.layout) {
          case '2-2': return '';
          case '3-3': return '';
          case '3-3-3': return '1-2-1';
          case '3-4-3': return '1-2-1';
          default: return '1-1';
        }
      case 'business':
        switch (this.modelloConfigurazione.layout) {
          case '2-2': return '';
          case '3-3': return '2-2';
          case '3-3-3': return '2-2-2';
          case '3-4-3': return '2-2-2';
          default: return '1-1';
        }
      case 'economy':
        return this.modelloConfigurazione.layout;
      default:
        return this.modelloConfigurazione.layout;
    }
  }

  getClassAislePositions(seatClass: 'first' | 'business' | 'economy'): number[] {
    const layout = this.getClassLayout(seatClass);
    
    switch (layout) {
      case '1-1': return [1];
      case '2-2': return [2];
      case '3-3': return [3];
      case '1-2-1': return [1, 3];
      case '2-2-2': return [2, 4];
      case '3-3-3': return [3, 6];
      case '3-4-3': return [3, 7];
      default: return [3];
    }
  }

  getSeatLetters(layout: string): string[] {
    switch(layout) {
      case '2-2': return ['A', 'B', 'J', 'K'];
      case '3-3': return ['A', 'B', 'C', 'H', 'J', 'K'];
      case '1-2-1': return ['A', 'E', 'F', 'K'];
      case '2-2-2': return ['A', 'B', 'E', 'F', 'J', 'K'];
      case '3-3-3': return ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'J', 'K'];
      case '3-4-3': return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
      default: return [];
    }
  }

  getGridTemplate(seatClass: 'first' | 'business' | 'economy'): string {
    const layout = this.getClassLayout(seatClass);

    switch (layout) {
      case '1-1':
        return '1fr 20px 1fr';
      case '2-2':
        return '1fr 1fr 20px 1fr 1fr';
      case '3-3':
        return '1fr 1fr 1fr 20px 1fr 1fr 1fr';
      case '1-2-1':
        return '1fr 15px 1fr 1fr 15px 1fr';
      case '2-2-2':
        return '1fr 1fr 10px 1fr 1fr 10px 1fr 1fr';
      case '3-3-3':
        return '1fr 1fr 1fr 15px 1fr 1fr 1fr 15px 1fr 1fr 1fr';
      case '3-4-3':
        return '1fr 1fr 1fr 15px 1fr 1fr 1fr 1fr 15px 1fr 1fr 1fr';
      default:
        return '1fr 1fr 1fr 20px 1fr 1fr 1fr';
    }
  }

  generate() {
    this.seats = [];
    
    if (!this.modelloConfigurazione) {
      return;
    }

    let row = 1;

    if (this.modelloConfigurazione.posti_first > 0) {
      const firstLayout = this.getClassLayout('first');
      const firstLetters = this.getSeatLetters(firstLayout);
      const firstSeatsPerRow = firstLetters.length;
      const firstRows = Math.ceil(this.modelloConfigurazione.posti_first / firstSeatsPerRow);
      let seatCounter = 0;

    
      
      for (let r = 0; r < firstRows; r++) {
        for (let l = 0; l < firstLetters.length && seatCounter < this.modelloConfigurazione.posti_first; l++) {
          this.seats.push({
            number: `${row}${firstLetters[l]}`,
            row: row,
            letter: firstLetters[l],
            class: 'first',
            status: this.occupiedSeats.includes(`${row}${firstLetters[l]}`) ? 'occupied' : 'available',
            price: Math.round(this.currentSegment!.volo!.distanza! * (0.10 - (0.03 * (this.selectedItinerary!.voli.length - 1))) * 3),
          });
          seatCounter++;
        }
        row++;
      }
    }

    if (this.modelloConfigurazione.posti_business > 0) {
      const businessLayout = this.getClassLayout('business');
      const businessLetters = this.getSeatLetters(businessLayout);
      const businessSeatsPerRow = businessLetters.length;
      const businessRows = Math.ceil(this.modelloConfigurazione.posti_business / businessSeatsPerRow);
      let seatCounter = 0;
      
      for (let r = 0; r < businessRows; r++) {
        for (let l = 0; l < businessLetters.length && seatCounter < this.modelloConfigurazione.posti_business; l++) {
          this.seats.push({
            number: `${row}${businessLetters[l]}`,
            row: row,
            letter: businessLetters[l],
            class: 'business',
            status: this.occupiedSeats.includes(`${row}${businessLetters[l]}`) ? 'occupied' : 'available',
            price: Math.round(this.currentSegment!.volo!.distanza! * (0.10 - (0.03 * (this.selectedItinerary!.voli.length - 1))) * 2),
          });
          seatCounter++;
        }
        row++;
      }
    }

    const economyLayout = this.getClassLayout('economy');
    const economyLetters = this.getSeatLetters(economyLayout);
    const economySeatsPerRow = economyLetters.length;
    const economyRows = Math.ceil(this.modelloConfigurazione.posti_economy / economySeatsPerRow);
    let seatCounter = 0;
    
    for (let r = 0; r < economyRows; r++) {
      for (let l = 0; l < economyLetters.length && seatCounter < this.modelloConfigurazione.posti_economy; l++) {
        this.seats.push({
          number: `${row}${economyLetters[l]}`,
          row: row,
          letter: economyLetters[l],
          class: 'economy',
          status: this.occupiedSeats.includes(`${row}${economyLetters[l]}`) ? 'occupied' : 'available',
          price: Math.round(this.currentSegment!.volo!.distanza! * (0.10 - (0.03 * (this.selectedItinerary!.voli.length - 1)))),
        });
        seatCounter++;
      }
      row++;
    }
  }

  getSeatsForRow(seatClass: 'first' | 'business' | 'economy', rowNumber: number): (Seat | null)[] {
    const layout = this.getClassLayout(seatClass);
    const letters = this.getSeatLetters(layout);
    const aislePositions = this.getClassAislePositions(seatClass);
    const seatsForClass = this.getSeats(seatClass);
    const rowSeats = seatsForClass.filter(seat => seat.row === rowNumber);
    
    const result: (Seat | null)[] = [];
    
    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i];
      const seat = rowSeats.find(s => s.letter === letter);
      
      result.push(seat || null);
      
      if (aislePositions.includes(i + 1)) {
        result.push(null);
      }
    }
    
    return result;
  }

  selectSeat(seat: Seat) {
    if (seat.status === 'occupied') return;
    
    if (this.timerAlreadyStarted && this.remainingSeconds <= 0) {
      this.showPopup('Tempo scaduto: non è più possibile selezionare posti. Torna alla ricerca per ricominciare.', 'error');
      return;
    }
    if (seat.status === 'selected') {
      seat.status = 'available';
      seat.passengerIndex = undefined;
      this.selectedSeats = this.selectedSeats.filter(s => s.number !== seat.number);
    } else {
      if (this.selectedSeats.length >= this.requiredSeats) {
        this.showPopup(`Puoi selezionare massimo ${this.requiredSeats} posto/i per ${this.numeroPasseggeri} passeggero/i.`, 'warning');
        return;
      }
      
      seat.status = 'selected';
      const used = new Set(this.selectedSeats.map(s => s.passengerIndex).filter(x => x !== undefined) as number[]);
      let idx = 0;
      while (used.has(idx) && idx < this.numeroPasseggeri) idx++;
      seat.passengerIndex = idx < this.numeroPasseggeri ? idx : undefined;
      this.selectedSeats.push(seat);
    }
    
    this.updateBooking();
  }

  removeSeat(seatNumber: string) {
    const seat = this.seats.find(s => s.number === seatNumber);
    if (seat) {
      seat.status = 'available';
      seat.passengerIndex = undefined;
      this.selectedSeats = this.selectedSeats.filter(s => s.number !== seatNumber);
      this.updateBooking();
    }
  }

  updateBooking() {
    this.currentBooking.seats = [...this.selectedSeats];
    this.currentBooking.totalPrice = this.calculateTotalPrice();
  }

  isBookingValid(): boolean {
    if (this.selectedSeats.length !== this.requiredSeats) return false;
    const idxs = this.selectedSeats.map(s => s.passengerIndex).filter((v): v is number => v !== undefined);
    if (idxs.length !== this.requiredSeats) return false;
    const uniq = new Set(idxs);
    return uniq.size === this.requiredSeats;
  }

  creaTicketData(): TicketTemporaneo[] {
    return this.selectedSeats.map(seat => ({
      classe: seat.class,
      prezzo: this.getSeatPrice(seat) + (this.passengers[seat.passengerIndex!].extraBags * 25),
      posto: seat.number,
      volo: this.currentSegment!.volo!.numero,
      nome: this.passengers[seat.passengerIndex!].firstName,
      cognome: this.passengers[seat.passengerIndex!].lastName,
      bagagli: this.passengers[seat.passengerIndex!].extraBags,
    }));
  }

  confirmBooking() {
    if (!this.isBookingValid()) {
      if (this.selectedSeats.length !== this.requiredSeats) {
        if (this.timerAlreadyStarted && this.remainingSeconds <= 0) {
          this.showPopup('Tempo scaduto: i posti non possono essere confermati. Torna alla ricerca per ricominciare.', 'error');
          return;
        }
        this.showPopup(`Devi selezionare esattamente ${this.requiredSeats} posto/i per ${this.numeroPasseggeri} passeggero/i.`, 'warning');
      }
      return;
    }

    let posti: string[] = [];
    for (const s of this.selectedSeats) {
      posti.push(s.number);
    }
    this.bookingService.trattieniPosti(this.creaTicketData()).subscribe({
      next: () => {
        if (!this.currentSegment) return;
        const assignments: SeatAssignment[] = this.selectedSeats.map(s => ({
          seatNumber: s.number,
          seatClass: s.class,
          passengerIndex: s.passengerIndex!,
          seatPrice: this.getSeatPrice(s),
        }));
        this.bookingService.setSeatsForCurrentSegment(assignments);
        if (!this.timerAlreadyStarted) {
          this.timerAlreadyStarted = true;
          this.timer.ensureStarted(15 * 60);
          this.timer.remainingSeconds$.subscribe((v: number) => {
          this.remainingSeconds = v;
          if (v === 0) {
            this.onTimerExpired();
          }
        });
        }

        if (this.bookingService.nextSegment()) {
          this.currentSegment = this.bookingService.getCurrentSegment();
          this.segmentPosition = this.bookingService.getCurrentSegmentPosition();
          this.seats = [];
          this.selectedSeats = [];
          this.modelloConfigurazione = null;
          this.loadModelloConfigurazione();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          this.router.navigate(['/checkout']);
        }
      },
      error: (err) => {
        console.error('Errore nel recupero delle prenotazioni:', err.error?.error);
        this.showPopup(err.error?.message, 'error');
        this.seats = [];
        this.selectedSeats = [];
        this.modelloConfigurazione = null;
        this.loadModelloConfigurazione();
      }
    });
  }

  getSeatPrice(seat: Seat): number {
    let basePrice = seat.price;
    let extraFee = 0;

    const isWindowOrAisle = this.isWindowSeat(seat.number) || this.isAisleSeat(seat.number);
    
    if (isWindowOrAisle && seat.class === 'economy') extraFee += 10;
    
    const totalPrice = basePrice + extraFee;
    return totalPrice;
  }

  getBagPrice(): number {
    return 25;
  }

  calculateTotalPrice(): number {
    let total = 0;
    
    for (const seat of this.selectedSeats) {
      total += this.getSeatPrice(seat);
      if (seat.passengerIndex !== undefined) {
        const p = this.passengers[seat.passengerIndex];
        if (p?.extraBags) total += p.extraBags * 25;
      }
    }
    
    return total;
  }

  clearAllSelections() {
    for (const seat of this.selectedSeats) {
      seat.status = 'available';
      seat.passengerIndex = undefined;
    }
    this.selectedSeats = [];
    this.currentBooking = {
      seats: [],
      totalPrice: 0,
    };
  }

 

  getSeatClass(seat: Seat): string {
    let baseClasses = 'w-7 h-7 rounded border-2 text-xs font-semibold transition-all duration-200 hover:scale-110 flex-shrink-0';
    
    switch (seat.status) {
      case 'available':
        switch (seat.class) {
          case 'first':
            return `${baseClasses} bg-red-500 border-red-600 text-white hover:bg-red-600`;
          case 'business':
            return `${baseClasses} bg-blue-600 border-blue-700 text-white hover:bg-blue-700`;
          case 'economy':
            return `${baseClasses} bg-green-500 border-green-600 text-white hover:bg-green-600`;
        }
      case 'occupied':
        return `${baseClasses} bg-gray-400 border-gray-500 text-gray-700 cursor-not-allowed`;
      case 'selected':
        return `${baseClasses} bg-blue-300 border-blue-400 text-white ring-2 ring-blue-200 ring-offset-2 shadow-lg`;
    }
  }

  getSeatType(seatNumber: string): string {
    const letter = seatNumber.slice(-1);
    if (!this.modelloConfigurazione) return 'N/A';

    const seat = this.seats.find(s => s.number === seatNumber);
    if (!seat) return 'N/A';

    const layout = this.getClassLayout(seat.class);
    const letters = this.getSeatLetters(layout);
    const letterIndex = letters.indexOf(letter);
    
    if (letterIndex === -1) return 'N/A';

    switch (layout) {
      case '1-1':
        return letterIndex === 0 ? 'Finestrino' : 'Finestrino';
      
      case '2-2':
        if (letterIndex === 0 || letterIndex === 3) return 'Finestrino';
        return 'Corridoio';
      
      case '3-3':
        if (letterIndex === 0 || letterIndex === 5) return 'Finestrino';
        if (letterIndex === 2 || letterIndex === 3) return 'Corridoio';
        return 'Centrale';
      
      case '2-2-2':
        if (letterIndex === 0 || letterIndex === 5) return 'Finestrino';
        if (letterIndex === 1 || letterIndex === 2 || letterIndex === 3 || letterIndex === 4) return 'Corridoio';
        return 'Centrale';
      
      case '3-3-3':
        if (letterIndex === 0 || letterIndex === 8) return 'Finestrino';
        if (letterIndex === 2 || letterIndex === 3 || letterIndex === 5 || letterIndex === 6) return 'Corridoio';
        return 'Centrale';
      
      case '1-2-1':
        if (letterIndex === 0 || letterIndex === 3) return 'Finestrino';
        return 'Corridoio';
      
      case '3-4-3':
        if (letterIndex === 0 || letterIndex === 9) return 'Finestrino';
        if (letterIndex === 2 || letterIndex === 3 || letterIndex === 6 || letterIndex === 7) return 'Corridoio';
        return 'Centrale';
      
      default:
        return 'N/A';
    }
  }

  isWindowSeat(seatNumber: string): boolean {
    const letter = seatNumber.slice(-1);
    const seat = this.seats.find(s => s.number === seatNumber);
    if (!seat) return false;

    const layout = this.getClassLayout(seat.class);
    const letters = this.getSeatLetters(layout);
    const letterIndex = letters.indexOf(letter);
    
    if (letterIndex === -1) return false;

    return letterIndex === 0 || letterIndex === letters.length - 1;
  }

  isAisleSeat(seatNumber: string): boolean {
    const letter = seatNumber.slice(-1);
    const seat = this.seats.find(s => s.number === seatNumber);
    if (!seat) return false;

    const layout = this.getClassLayout(seat.class);
    const letters = this.getSeatLetters(layout);
    const letterIndex = letters.indexOf(letter);
    const aislePositions = this.getClassAislePositions(seat.class);
    
    if (letterIndex === -1) return false;

    for (const aislePos of aislePositions) {
      if (letterIndex === aislePos - 1 || letterIndex === aislePos) {
        return true;
      }
    }
    
    return false;
  }

  getBookingProgress(): number {
    if (this.requiredSeats === 0) return 100;
    const percent = Math.round((this.selectedSeats.length / this.requiredSeats) * 100);
    return Math.min(100, percent);
  }

  getSeatFlowProgress(): number {
    const totalSegments = Math.max(1, this.segmentPosition.total || 1);
    const completedBefore = Math.max(0, this.segmentPosition.index || 0);
    const currentFraction = this.requiredSeats > 0 ? Math.min(1, this.selectedSeats.length / this.requiredSeats) : 1;
    const overall = ((completedBefore + currentFraction) / totalSegments) * 100;
    return Math.round(Math.min(100, Math.max(0, overall)));
  }

  setSeatPassenger(seat: Seat, idx: number) {
    if (seat.status !== 'selected') return;
    if (idx < 0 || idx >= this.numeroPasseggeri) return;
    seat.passengerIndex = idx;
  }

  showPopup(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') {
    this.popupMessage = message;
    this.popupType = type;
    this.isOpenPopup = true;
  }

  closePopup() {
    this.isOpenPopup = false;
  }

}