import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventEmitter, Output } from '@angular/core';
import { AuthService, DatiUtente } from '../../services/auth';
import { RegistrationBufferService } from '../../services/registrazione-buffer';


/**
 * Component for collecting additional user information after registration.
 * This form allows users to complete their profile with personal details
 * required for flight booking and travel documentation.
 * 
 * @component InfoFormComponent
 * @description Displays a form for user to input personal information including
 * name, surname, fiscal code, birth date, and gender. Email is pre-filled from registration.
 * 
 * @author Generated for Flight Booking Application
 * @version 1.0.0
 */
@Component({
  selector: 'app-dati-passeggero',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dati-passeggero.html',
  styleUrl: './dati-passeggero.css'
})
export class DatiPasseggero {

  @Output() onComplete = new EventEmitter<any>();
  @Output() onClose = new EventEmitter<void>();
  
  nome: string = '';
  cognome: string = '';
  codiceFiscale: string = '';
  dataNascita: string = '';
  sesso: string = '';

  email: string = '';

  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  /**
   * Constructor for InfoFormComponent
   * @param {Router} router - Angular router for navigation
   */
  constructor(
    private authService: AuthService,
    private buffer: RegistrationBufferService
  ) {
    this.loadUserEmail();
  }

  /**
   * Validates if the form is complete and valid
   * @returns {boolean} True if all required fields are filled and valid
   */
  get isFormValid(): boolean {
    return !!(
      this.nome.trim() &&
      this.cognome.trim() &&
      this.codiceFiscale.trim().length === 16 &&
      this.dataNascita &&
      this.sesso &&
      this.email.trim()
    );
  }

  /**
   * Validates Italian fiscal code format
   * @param {string} cf - The fiscal code to validate
   * @returns {boolean} True if fiscal code format is valid
   * @private
   */
  private validateFiscalCode(cf: string): boolean {
    const fiscalCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    return fiscalCodeRegex.test(cf.toUpperCase());
  }

  /**
   * Formats fiscal code input to uppercase as user types
   * @param {Event} event - Input event
   */
  onFiscalCodeInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.codiceFiscale = target.value.toUpperCase();
  }

  /**
   * Validates birth date to ensure user is at least 18 years old
   * @param {string} birthDate - Birth date in YYYY-MM-DD format
   * @returns {boolean} True if user is at least 18 years old
   * @private
   */
  private validateAge(birthDate: string): boolean {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  }

  private loadUserEmail(): void {
    const draft = this.buffer.getDraft();
    this.email = draft?.email ?? '';
  }

  /**
   * Handles form submission
   * Validates all fields and saves user information
   * @returns {Promise<void>}
   */
  async onSubmit(): Promise<void> {
    if (!this.isFormValid) { this.errorMessage = 'Per favore, compila tutti i campi obbligatori.'; return; }
    if (!this.validateFiscalCode(this.codiceFiscale)) { this.errorMessage = 'Il formato del codice fiscale non è valido.'; return; }
    if (!this.validateAge(this.dataNascita)) { this.errorMessage = 'Devi avere almeno 18 anni per registrarti.'; return; }

    const draft = this.buffer.getDraft();
    if (!draft) {
      this.errorMessage = 'Sessione di registrazione scaduta. Riprova.';
      return;
    }

    this.isLoading = true; this.errorMessage = ''; this.successMessage = '';

    const dati: DatiUtente = {
      nome: this.nome.trim(),
      cognome: this.cognome.trim(),
      codiceFiscale: this.codiceFiscale.toUpperCase(),
      dataNascita: this.dataNascita,
      sesso: this.sesso,
    };

    this.authService.register(draft.email, draft.password, dati).subscribe({
      next: () => {
        this.isLoading = false;
        this.buffer.clear();
        this.close();
        window.location.reload();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Errore durante la registrazione';
      }
    });
  }

  /**
   * Handles form close
   */
  close(): void {
    this.onClose.emit();
  }
}
