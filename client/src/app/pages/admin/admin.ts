import { Component } from '@angular/core';

type Company = {
  codice_iata: string;
  nome: string;
  nazione?: string;
  contatto?: string | null;
};

type User = {
  id: number;
  email: string;
  nome?: string | null;
  ruolo?: string | null;
};

@Component({
  selector: 'app-admin',
  imports: [],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin {
  // Placeholder data to be replaced by API wiring
  companies: Company[] = [];
  users: User[] = [];

  // Search UI state
  searchQuery = '';
  filteredUsers: User[] = [];

  constructor() {
    // initialize filtered list
    this.filteredUsers = this.users;
  }

  // Minimal UX: open create-company flow (to be wired by you)
  openNuovaCompagnia() {
    // Placeholder for modal or navigation
    // TODO: wire to your modal/component or router
    console.log('[admin] richiesta creazione nuova compagnia');
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const q = (target?.value || '').trim();
    this.searchQuery = q;
    this.applyUserFilter();
  }

  clearSearch() {
    this.searchQuery = '';
    this.applyUserFilter();
  }

  private applyUserFilter() {
    const q = this.searchQuery.toLowerCase();
    if (!q) {
      this.filteredUsers = this.users;
      return;
    }

    // match by exact/partial id or email (case-insensitive)
    this.filteredUsers = this.users.filter(u => {
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const idMatch = String(u.id).includes(q);
      return emailMatch || idMatch;
    });
  }
}
