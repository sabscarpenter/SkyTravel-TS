import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin';

@Component({
  selector: 'app-nuova-compagnia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nuova-compagnia.html',
  styleUrl: './nuova-compagnia.css'
})
export class NuovaCompagnia {
  @Input() autoOpen = false;
  @Output() created = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isOpen = false;
  submitting = false;

  // Form state
  email = '';
  password = '';
  logoFile: File | null = null;
  logoPreview: string | null = null;

  // Popup (toast) state
  popup = {
    visible: false,
    message: '',
    type: 'info' as 'info' | 'warning' | 'error' | 'success'
  };

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    if (this.autoOpen) this.open();
  }

  open(): void {
    this.isOpen = true;
    // reset form
    this.email = '';
    this.password = '';
    this.logoFile = null;
    this.logoPreview = null;
    this.popup.visible = false;
    this.popup.message = '';
  }

  close(): void {
    this.isOpen = false;
    this.closed.emit();
  }

  // File input handler
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

  // Popup helpers
  showPopup(type: 'info' | 'warning' | 'error' | 'success', message: string): void {
    this.popup.type = type;
    this.popup.message = message;
    this.popup.visible = true;
  }

  closePopup(): void {
    const wasSuccess = this.popup.type === 'success';
    this.popup.visible = false;
    if (wasSuccess) {
      this.created.emit();
      this.close();
    }
  }

  getPopupTitle(): string {
    switch (this.popup.type) {
      case 'info': return 'Informazione';
      case 'warning': return 'Attenzione';
      case 'success': return 'Operazione riuscita';
      case 'error':
      default: return 'Errore';
    }
  }

  private isValidEmail(email: string): boolean {
    return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
  }

  onCreateClick(): void {
    if (!this.email || !this.isValidEmail(this.email)) {
      this.showPopup('error', 'Inserisci un\'email valida.');
      return;
    }
    if (!this.password || this.password.length < 6) {
      this.showPopup('error', 'La password deve avere almeno 6 caratteri.');
      return;
    }
    if (!this.logoFile) {
      this.showPopup('error', 'Seleziona un\'immagine per la compagnia.');
      return;
    }
    
    this.submitting = true;
    this.adminService.aggiungiCompagnia(this.email, this.password, this.logoFile).subscribe({
      next: () => {
        this.submitting = false;
        this.showPopup('success', 'Compagnia registrata con successo.');
      },
      error: (err) => {
        this.submitting = false;
        const msg: string = err?.error?.error || 'Errore durante la registrazione della compagnia.';
        const m = (msg || '').toLowerCase();
        const isDuplicate = m.includes('violates unique constraint') || m.includes('duplicate') || m.includes('esiste gi\u00E0');
        if (isDuplicate) {
          this.showPopup('error', 'Esiste gi\u00E0 una compagnia registrata con questa email.');
        } else {
          this.showPopup('error', msg);
        }
        console.error('[nuova-compagnia] create error:', err);
      }
    });
  }
}
