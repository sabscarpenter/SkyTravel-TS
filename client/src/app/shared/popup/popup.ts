import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type PopupType = 'info' | 'warning' | 'error' | 'success';

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './popup.html'
})
export class Popup {
  @Input() message = '';
  @Input() type: PopupType = 'info';

  @Output() onClose = new EventEmitter<void>();

  close() { this.onClose.emit(); }

  getTitle(): string {
    switch (this.type) {
      case 'info': return 'Informazione';
      case 'warning': return 'Attenzione';
      case 'success': return 'Operazione completata';
      case 'error': return 'Errore';
      default: return 'Avviso';
    }
  }
}
