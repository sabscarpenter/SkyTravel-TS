import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NuovaCompagnia } from './nuova-compagnia/nuova-compagnia';
import { AdminService } from '../../services/admin';
import { Compagnia, Passeggero, CompagniaInAttesa } from '../../services/admin';
import { Popup } from '../../shared/popup/popup';
import { PasseggeroService } from '../../services/passeggero';


@Component({
  selector: 'app-admin',
  imports: [NuovaCompagnia, Popup],
  templateUrl: './admin.html',
})
export class Admin {
  @ViewChild(Popup) popup!: Popup;

  compagnie: Compagnia[] = [];
  passeggeri: Passeggero[] = [];
  compagnieInAttesa: CompagniaInAttesa[] = [];
  isLoadingCompagnie = false;
  isLoadingPasseggeri = false;
  isLoadingCompagnieInAttesa = false;

  searchQuery = '';
  passeggeriFiltrati: Passeggero[] = [];

  isNuovaCompagniaOpen = false;

  isOpenPopup = false;
  criticita = false;
  popupMessage = '';
  popupType: 'info' | 'warning' | 'error' | 'success' = 'info';

  constructor(private router: Router, private adminService: AdminService, private passeggeroService: PasseggeroService) {
  }

  ngOnInit() {
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

  openNuovaCompagnia() {
    this.isNuovaCompagniaOpen = true;
  }

  onCompagniaCreata() {
    this.isNuovaCompagniaOpen = false;
    this.openPopup('Compagnia creata con successo.', 'success', false);
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

    this.passeggeriFiltrati = this.passeggeri.filter(u => {
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const idMatch = String(u.utente).includes(q);
      return emailMatch || idMatch;
    });
  }

  removeCompagnia(c: Compagnia) {
    this.adminService.removeCompagnia(c.utente).subscribe({
      next: () => {
        this.openPopup('Compagnia rimossa con successo.', 'success', false);
        this.refreshCompagnie();
      },
      error: () => {
        this.openPopup('Errore durante la rimozione della compagnia.', 'error');
      }
    });
  }

  removeCompagniaInAttesa(c: CompagniaInAttesa) {
    this.adminService.removeCompagniaInAttesa(c.utente).subscribe({
      next: () => {
        this.openPopup('Compagnia in attesa rimossa con successo.', 'success', false);
        this.refreshCompagnieInAttesa();
      },
      error: () => {
        this.openPopup('Errore durante la rimozione della compagnia in attesa.', 'error');
      }
    });
  }

  removePasseggero(u: Passeggero) {
    this.adminService.removePasseggero(u.utente).subscribe({
      next: () => {
        this.openPopup('Passeggero rimosso con successo.', 'success', false);
        this.refreshPasseggeri();
      },
      error: () => {
        this.openPopup('Errore durante la rimozione del passeggero.', 'error');
      }
    });
  }

  openPopup(message: string, type: 'info' | 'warning' | 'error' | 'success', criticita = false) {
    this.popupMessage = message;
    this.popupType = type;
    this.criticita = criticita;
    this.isOpenPopup = true;
  }

  closePopup() {
    this.isOpenPopup = false;
    if (this.criticita) {
      this.router.navigate(['/']);
    }
  }
}
