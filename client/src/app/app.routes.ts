// app.routes.ts
import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Voli } from './pages/voli/voli';
import { Passeggero } from './pages/passeggero/passeggero';
import { Aerolinea } from './pages/aerolinea/aerolinea';
import { Posti } from './pages/posti/posti';
import { Checkout } from './pages/checkout/checkout';
import { Dettagli } from './pages/dettagli/dettagli';
import { authRoleGuard } from './guard/auth-role.guard';

export const routes: Routes = [
  { path: '', component: Home },

  { path: 'voli', component: Voli },

  { path: 'passeggero',
    component: Passeggero,
    canActivate: [authRoleGuard],
    data: { role: 'PASSEGGERO' }
  },

  { path: 'aerolinea',
    component: Aerolinea,
    canActivate: [authRoleGuard],
    data: { role: 'COMPAGNIA' }
  },

  { path: 'dettagli',
    component: Dettagli,
    canActivate: [authRoleGuard],
    data: { role: 'PASSEGGERO' }
  },

  { path: 'posti',
    component: Posti,
    canActivate: [authRoleGuard],
    data: { role: 'PASSEGGERO' }
  },

  { path: 'checkout',
    component: Checkout,
    canActivate: [authRoleGuard],
    data: { role: 'PASSEGGERO' }
  },

  { path: '**', redirectTo: '' }
];
