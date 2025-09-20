import { Component, EventEmitter, Output } from '@angular/core';
import { AerolineaService } from '../../services/aerolinea';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-dati-compagnia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dati-compagnia.html',
  styleUrl: './dati-compagnia.css'
})
export class DatiCompagnia {
  @Output() onComplete = new EventEmitter<any>();
  @Output() onClose = new EventEmitter<void>();

  nome: string = '';
  codiceIATA: string = '';
  contatto: string = '';
  nazione: string = '';
  email: string = '';
 
  newPassword: string = '';
  confirmPassword: string = '';

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  get isFormValid(): boolean {
    return !!(
      this.nome.trim() &&
      this.codiceIATA.trim().length === 2 &&
      /^[A-Z]{2}$/.test(this.codiceIATA.toUpperCase()) &&
      this.isPhoneValid &&
      this.nazione.trim()
    );
  }

  get isPhoneValid(): boolean {
    const raw = this.contatto.trim();
    if (!raw) return false;
    if (!/^[+]?([0-9 ]+)$/.test(raw)) return false;
    const digits = raw.replace(/\s+/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }

  get isPasswordSectionValid(): boolean {
    return !!(
      this.newPassword &&
      this.confirmPassword &&
      this.newPassword.length >= 8 &&
      this.newPassword === this.confirmPassword
    );
  }

  onIataInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    this.codiceIATA = el.value.toUpperCase().slice(0, 2);
  }

  constructor(private airlineService: AerolineaService) {}

  async submit() {
  if (!this.isFormValid) { this.errorMessage = 'Compila tutti i campi obbligatori.'; return; }
  if (!this.isPasswordSectionValid) { this.errorMessage = 'Password obbligatoria: minimo 8 caratteri e devono coincidere.'; return; }
    this.errorMessage = ''; this.successMessage = ''; this.isLoading = true;
    try {
      const payload = {
        nome: this.nome.trim(),
        codiceIATA: this.codiceIATA.toUpperCase(),
        contatto: this.contatto.trim(),
        nazione: this.nazione.trim(),
        password: this.newPassword
      };
      const res = await this.airlineService.setupCompany(payload).toPromise();
      this.successMessage = 'Profilo compagnia creato';
      this.onComplete.emit(res || payload);
    } catch (e: any) {
      this.errorMessage = e?.error?.message || e?.message || 'Errore salvataggio';
    } finally {
      this.isLoading = false;
    }
  }

  close() { this.onClose.emit(); }
}
