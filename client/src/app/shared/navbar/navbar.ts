// src/app/shared/navbar/navbar.ts
import { Component, OnInit } from '@angular/core';
import { Login } from '../login/login';
import { Registrazione } from '../registrazione/registrazione';
import { Dati } from '../dati/dati';
import { AuthService, User } from '../../services/auth';
import { PasseggeroService } from '../../services/passeggero';
import { AerolineaService } from '../../services/aerolinea';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [Login, Registrazione, Dati, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit {
  isAuthenticated = false;
  user: User | null = null;

  isAuthPopupOpen = false;
  authMode: 'login' | 'register' | 'dati' = 'login';

  // Stato caricamento immagine profilo (placeholder fino al load)
  imageLoaded = false;

  constructor(
    private authService: AuthService,
    private passengerService: PasseggeroService,
    private airlineService: AerolineaService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkAuthStatus();
  }

  checkAuthStatus() {
    this.authService.me$().subscribe({
      next: (user: User | null) => {
        this.isAuthenticated = !!user;
        this.user = user;
        // Reset del placeholder ad ogni cambio utente/foto
        this.imageLoaded = false;
      },
      error: () => {
        this.isAuthenticated = false;
        this.user = null;
        this.imageLoaded = false;
      }
    });
  }

  toggleAuthPopup() {
    this.isAuthPopupOpen = !this.isAuthPopupOpen;
    if (this.isAuthPopupOpen) this.authMode = 'login';
  }

  closeAuthPopup() { this.isAuthPopupOpen = false; }
  switchToLogin() { this.authMode = 'login'; }
  switchToRegister() { this.authMode = 'register'; }
  switchToDati() { this.authMode = 'dati'; }

  onLoginSuccess(_: any) {
    this.checkAuthStatus();
    this.closeAuthPopup();
  }
  onRegisterSuccess(_: any) {
    this.checkAuthStatus();
  }
  onOpenDati(_: any) { this.switchToDati(); }
  onDatiComplete() {
    this.checkAuthStatus();
    this.closeAuthPopup();
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.isAuthenticated = false;
        this.user = null;
        // niente reload: lo stato si aggiorna
        this.router.navigate(['/']);
      },
      error: (error) => console.error('Errore durante il logout:', error)
    });
  }

  goToProfile() {
    this.user && this.user.id >= 100
      ? this.router.navigate(['/passeggero'])
      : this.router.navigate(['/aerolinea']);
  }

  goToHome() { this.router.navigate(['/home']); }

  getPhotoUrl(): string {
    if (this.user?.foto) {
      return this.user.id >= 100
        ? this.passengerService.getPhotoUrl(this.user.foto)
        : this.airlineService.getPhotoUrl(this.user.foto);
    }
    return '';
  }

  // Gestori load/error dell'immagine profilo
  onImageLoad() { this.imageLoaded = true; }
  onImageError() { this.imageLoaded = false; }
}