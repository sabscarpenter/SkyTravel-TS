import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  @Output() onLoginSuccess = new EventEmitter<any>();
  @Output() onSwitchToRegister = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();

  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.email && this.password) {
      this.isLoading = true;
      this.errorMessage = '';
      
      this.authService.login(this.email, this.password).subscribe({
        next: () => {
          this.isLoading = false;
          this.onLoginSuccess.emit();
          this.close();
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Errore durante il login';
        }
      });
    }
  }

  switchToRegister() {
    this.onSwitchToRegister.emit();
  }

  close() {
    this.onClose.emit();
  }
}
