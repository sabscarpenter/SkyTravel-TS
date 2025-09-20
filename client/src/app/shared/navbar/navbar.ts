// src/app/shared/navbar/navbar.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Login } from '../login/login';
import { Registrazione } from '../registrazione/registrazione';
import { DatiPasseggero } from '../dati-passeggero/dati-passeggero';
import { DatiCompagnia } from '../dati-compagnia/dati-compagnia';
import { AuthService, User } from '../../services/auth';
import { PasseggeroService } from '../../services/passeggero';
import { AerolineaService } from '../../services/aerolinea';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [Login, Registrazione, DatiPasseggero, DatiCompagnia, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit, OnDestroy {
  isAuthenticated = false;
  user: User | null = null;

  isAuthPopupOpen = false;
  authMode: 'login' | 'register' | 'datiPasseggero' = 'login';
 
  imageLoaded = false;
 
  showCompanySetup = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private passengerService: PasseggeroService,
    private airlineService: AerolineaService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkAuthStatus();
    this.authService.userChanges$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        this.user = u;
        this.isAuthenticated = !!u;
        if (u?.role === 'COMPAGNIA') {
          this.loadCompanyProfile();
        }
      });
    }
  
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  checkAuthStatus() {
    this.authService.me$().subscribe({
      next: (user: User) => {
        this.isAuthenticated = !!user;
        this.user = user;
        if (user?.foto !== undefined && user?.foto !== '') {
          this.imageLoaded = true;
        } else {
          this.imageLoaded = false;
        }
        if (user?.role === 'COMPAGNIA') {
          this.loadCompanyProfile();
        }
      },
      error: () => {
        this.isAuthenticated = false;
        this.user = null;
        this.imageLoaded = false;
      }
    });
  }

  private loadCompanyProfile() {
    this.airlineService.getAirlineProfile().subscribe({
      next: () => { 
        this.showCompanySetup = false;
      },
      error: (err: any) => {
        console.warn('[loadCompanyProfile] errore profilo', err?.status, err?.error);
        if (err.status === 404) {
          this.showCompanySetup = true;
        }
      }
    });
  }

  onCompanyComplete() {
    this.showCompanySetup = false;
    this.authService.invalidateMeCache();
    this.checkAuthStatus();
  }

  toggleAuthPopup() {
    this.isAuthPopupOpen = !this.isAuthPopupOpen;
    if (this.isAuthPopupOpen) this.authMode = 'login';
  }

  closeAuthPopup() { this.isAuthPopupOpen = false; }
  switchToLogin() { this.authMode = 'login'; }
  switchToRegister() { this.authMode = 'register'; }
  switchToDatiPasseggero() { this.authMode = 'datiPasseggero'; }

  onLoginSuccess() {
    this.checkAuthStatus();
    this.closeAuthPopup();
  }

  onRegisterSuccess() {
    this.checkAuthStatus();
  }

  onOpenDatiPasseggero() { this.switchToDatiPasseggero(); }

  onDatiPasseggeroComplete() {
    this.checkAuthStatus();
    this.closeAuthPopup();
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.isAuthenticated = false;
        this.user = null;
        this.router.navigate(['/']);
      },
      error: (error) => console.error('Errore durante il logout:', error)
    });
  }

  logoutAll() {
    this.authService.logoutAll().subscribe({
      next: () => {
        this.isAuthenticated = false;
        this.user = null;
        this.router.navigate(['/']);
      },
      error: (error) => console.error('Errore durante il logout da tutti i dispositivi:', error)
    });
  }

  goToProfile() {
    this.user && this.user.role === 'PASSEGGERO'
      ? this.router.navigate(['/passeggero'])
      : this.router.navigate(['/aerolinea']);
  }

  goToAdminDashboard() { this.router.navigate(['/admin']); }

  goToHome() { this.router.navigate(['/home']); }

  getPhotoUrl(): string {
    if (this.user?.foto) {
      return this.user.id >= 100
        ? this.passengerService.getPhotoUrl(this.user.foto)
        : this.airlineService.getPhotoUrl(this.user.foto);
    }
    return '';
  }

  onImageLoad() { this.imageLoaded = true; }
  onImageError() { this.imageLoaded = false; }
}