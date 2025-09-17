import { Component, ViewChild, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../../services/admin';
import { Popup } from '../../../shared/popup/popup';

@Component({
  selector: 'app-nuova-compagnia',
  standalone: true,
  imports: [CommonModule, Popup],
  templateUrl: './nuova-compagnia.html'
})
export class NuovaCompagnia {
  @ViewChild(Popup) popup!: Popup;

  @Input() autoOpen = false;
  @Output() created = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isOpen = false;
  submitting = false;

  email = '';
  password = '';
  logoFile: File | null = null;
  logoPreview: string | null = null;

  isOpenPopup = false;
  criticita = false;
  completa = false;
  popupMessage = '';
  popupType: 'info' | 'warning' | 'error' | 'success' = 'info';

  constructor(private router: Router, private adminService: AdminService) {}

  ngOnInit() {
    if (this.autoOpen) this.open();
  }

  open(): void {
    this.isOpen = true;

    this.email = '';
    this.password = '';
    this.logoFile = null;
    this.logoPreview = null;
    this.isOpenPopup = false;
    this.criticita = false;
    this.completa = false;
    this.popupMessage = '';
  }

  close(): void {
    this.isOpen = false;
    this.closed.emit();
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
    if (this.completa) this.close();
    if (this.criticita) {
      this.router.navigate(['/']);
    }
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    this.logoFile = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.logoPreview = null;
    }
  }

  private isValidEmail(email: string): boolean {
    return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
  }

  onCreateClick(): void {
    if (!this.email || !this.isValidEmail(this.email)) {
      this.openPopup('Inserisci un\'email valida.', 'error');
      return;
    }
    if (!this.password || this.password.length < 6) {
      this.openPopup('La password deve avere almeno 6 caratteri.', 'error');
      return;
    }
    if (!this.logoFile) {
      this.openPopup('Seleziona un\'immagine per la compagnia.', 'error');
      return;
    }
    
    this.submitting = true;
    this.adminService.aggiungiCompagnia(this.email, this.password, this.logoFile).subscribe({
      next: () => {
        this.submitting = false;
        this.openPopup('Compagnia creata con successo!', 'success', false, true);
        this.created.emit();
      },
      error: (response) => {
        this.submitting = false;
        this.openPopup(response?.error?.message, 'error', true);
      }
    });
  }
}
