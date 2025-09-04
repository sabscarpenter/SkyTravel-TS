import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService, PassengerInfo } from '../../services/booking';
import { AuthService } from '../../services/auth';
import { User } from '../../services/auth';
import { Popup } from '../../shared/popup/popup';

@Component({
  selector: 'app-dettagli',
  standalone: true,
  imports: [CommonModule, FormsModule, Popup],
  templateUrl: './dettagli.html',
  styleUrl: './dettagli.css'
})
export class Dettagli implements OnInit {
  passengers: PassengerInfo[] = [];
  numeroPasseggeri = 1;

  isAuthenticated = false;
  user: User | null = null;

  // Popup (toast) per errori/avvisi
  isOpenPopup = false;
  popupMessage = '';
  popupType: 'info' | 'warning' | 'error' | 'success' = 'info';
  criticita: boolean = false;

  constructor(private booking: BookingService, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    const st = this.booking.getState();
    this.numeroPasseggeri = this.booking.getNumeroPasseggeri();
    if (!st) {
      this.booking.start('soloAndata', this.numeroPasseggeri);
    }
    const existing = this.booking.getPassengers();
    this.passengers = existing.length
      ? existing.map(p => ({ ...p }))
      : Array.from({ length: this.numeroPasseggeri }, () => ({ firstName: '', lastName: '', dateOfBirth: '', extraBags: 0 }));
  }

  isValid(): boolean {
    return this.passengers.length === this.numeroPasseggeri && this.passengers.every(p => p.firstName.trim() && p.lastName.trim() && p.dateOfBirth) && this.passengers.every(p => p.extraBags! >= 0);
  }

  proceed() {
    if (!this.isValid()) return;
    this.authService.me$().subscribe({
          next: (user: User | null) => {
            this.isAuthenticated = !!user;
            this.user = user;
            if (user!.role === 'PASSEGGERO') {
              this.booking.setPassengers(this.passengers);
              this.router.navigate(['/posti']);
            }
          },
          error: (response) => {
            this.isAuthenticated = false;
            this.user = null;
            this.openPopup('Utente non autenticato, si prega di effettuare il login.', 'warning', true);
          }
        });
  }

  cancel() {
    this.booking.reset();
    this.router.navigate(['/']);
  }

  // Popup helpers
  openPopup(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', criticita: boolean = false) {
    this.popupMessage = message;
    this.popupType = type;
    this.criticita = criticita;
    this.isOpenPopup = true;
  }

  closePopup(criticita: boolean) {
    this.isOpenPopup = false;
    if (criticita || this.criticita) {
      this.router.navigate(['/']);
    }
  }
}
