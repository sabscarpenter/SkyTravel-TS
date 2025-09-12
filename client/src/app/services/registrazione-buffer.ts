import { Injectable } from '@angular/core';

export interface RegistrationDraft {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class RegistrationBufferService {
  private draft: RegistrationDraft | null = null;

  setDraft(email: string, password: string) {
    this.draft = { email, password };
  }

  getDraft(): RegistrationDraft | null {
    return this.draft;
  }

  clear() {
    this.draft = null;
  }
}
