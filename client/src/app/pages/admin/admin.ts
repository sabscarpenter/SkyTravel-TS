import { Component } from '@angular/core';
import { NuovaCompagnia } from './nuova-compagnia/nuova-compagnia';
import { AdminService } from '../../services/admin';
import { Compagnia, Passeggero, CompagniaInAttesa } from '../../services/admin';
import { PasseggeroService } from '../../services/passeggero';


@Component({
  selector: 'app-admin',
  imports: [NuovaCompagnia],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin {
  // Placeholder data to be replaced by API wiring
  compagnie: Compagnia[] = [];
  passeggeri: Passeggero[] = [];
  compagnieInAttesa: CompagniaInAttesa[] = [];
  isLoadingCompagnie = false;
  isLoadingPasseggeri = false;
  isLoadingCompagnieInAttesa = false;

  // Search UI state
  searchQuery = '';
  passeggeriFiltrati: Passeggero[] = [];

  // Modal state
  isNuovaCompagniaOpen = false;

  constructor(private adminService: AdminService, private passeggeroService: PasseggeroService) {
    // initialize filtered list
  }

  ngOnInit() {
    // Load initial data here if needed
    this.loadCompagnie();
    this.loadPasseggeri();
    this.loadCompagnieInAttesa();
  }

  loadCompagnie() {
  this.isLoadingCompagnie = true;
  this.adminService.getCompagnie().subscribe({
      next: (response) => {
        this.compagnie = response;
    this.passeggeriFiltrati = this.passeggeri;
    this.isLoadingCompagnie = false;
      },
      error: (err) => {
        console.error('[admin] error loading compagnie:', err);
    this.isLoadingCompagnie = false;
      }
    });
  }

  loadCompagnieInAttesa() {
    this.isLoadingCompagnieInAttesa = true;
    this.adminService.getCompagnieInAttesa().subscribe({
      next: (response) => {
        this.compagnieInAttesa = response || [];
        this.isLoadingCompagnieInAttesa = false;
      },
      error: (response) => {
        console.error('[admin] error loading compagnie in attesa:', response);
        this.isLoadingCompagnieInAttesa = false;
      }
    });
  }

  loadPasseggeri() {
  this.isLoadingPasseggeri = true;
  this.adminService.getPasseggeri().subscribe({
      next: (response) => {
        this.passeggeri = response;
    if (!this.searchQuery) this.passeggeriFiltrati = response;
    this.isLoadingPasseggeri = false;
      },
      error: (err) => {
        console.error('[admin] error loading passeggeri:', err);
    this.isLoadingPasseggeri = false;
      }
    });
  }

  getPasseggeroPhoto(u: Passeggero): string {
    return u.foto ? this.passeggeroService.getPhotoUrl(u.foto) : '';
  }

  refreshCompagnie() { this.loadCompagnie(); }
  refreshPasseggeri() { this.loadPasseggeri(); }
  refreshCompagnieInAttesa() { this.loadCompagnieInAttesa(); }

  // Minimal UX: open create-company flow (to be wired by you)
  openNuovaCompagnia() {
    this.isNuovaCompagniaOpen = true;
  }

  onCompagniaCreata() {
    this.isNuovaCompagniaOpen = false;
    this.refreshCompagnie();
    this.refreshCompagnieInAttesa();
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
      this.passeggeriFiltrati = this.passeggeri;
      return;
    }

    // match by exact/partial id or email (case-insensitive)
    this.passeggeriFiltrati = this.passeggeri.filter(u => {
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const idMatch = String(u.utente).includes(q);
      return emailMatch || idMatch;
    });
  }

  removeCompagnia(c: Compagnia) {
    this.adminService.removeCompagnia(c.utente).subscribe({
      next: (response) => {
        this.refreshCompagnie();
      },
      error: (err) => {
        console.error('[admin] error removing company:', err);
      }
    });
  }

  removeCompagniaInAttesa(c: CompagniaInAttesa) {
    this.adminService.removeCompagniaInAttesa(c.utente).subscribe({
      next: () => this.refreshCompagnieInAttesa(),
      error: (err) => console.error('[admin] error removing pending company:', err)
    });
  }

  removePasseggero(u: Passeggero) {
    this.adminService.removePasseggero(u.utente).subscribe({
      next: (response) => {
        this.refreshPasseggeri();
      },
      error: (err) => {
        console.error('[admin] error removing passenger:', err);
      }
    });
  }
}
