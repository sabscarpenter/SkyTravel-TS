import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

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
  @Output() onOpenDati = new EventEmitter<any>();

  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isLoading: boolean = false;
  acceptTerms: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService) {}

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
    if (this.isFormValid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      this.authService.register(this.email, this.password).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          const userData = {
            email: this.email,
            ...response
          };
          localStorage.setItem('user', JSON.stringify(userData));

          // Notifica il successo della registrazione
          this.onRegisterSuccess.emit(response);
          
          this.onOpenDati.emit(userData);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.error || 'Errore durante la registrazione';
        }
      });
    }
  }

  switchToLogin() {
    this.onSwitchToLogin.emit();
  }

  close() {
    this.onClose.emit();
  }
}
