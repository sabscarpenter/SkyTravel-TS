import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { RegistrationBufferService } from '../../services/registrazione-buffer';

@Component({
  selector: 'app-registrazione',
  imports: [CommonModule, FormsModule],
  templateUrl: './registrazione.html',
  styleUrl: './registrazione.css'
})
export class Registrazione {
  @Output() onRegisterSuccess = new EventEmitter<any>();
  @Output() onSwitchToLogin = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();
  @Output() onOpenDatiPasseggero = new EventEmitter<any>();

  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isLoading: boolean = false;
  acceptTerms: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private buffer: RegistrationBufferService) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  get isFormValid(): boolean {
    return !!(this.email && this.password && this.confirmPassword && 
           this.passwordsMatch && this.acceptTerms);
  }

  onSubmit() {
    if (!this.isFormValid) return;
    this.isLoading = true;
    this.errorMessage = '';

    this.buffer.setDraft(this.email, this.password);
    this.isLoading = false;

    // Mostra step Dati Passeggero
    this.onOpenDatiPasseggero.emit({ email: this.email });
  }

  switchToLogin() {
    this.onSwitchToLogin.emit();
  }

  close() {
    this.onClose.emit();
  }
}
