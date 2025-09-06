import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling  } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './guard/auth.interceptor';
import { AuthService } from './services/auth';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: 'APP_BOOTSTRAP', // nome arbitrario
      multi: true,
      useFactory: (auth: AuthService) => {
        return () => auth.bootstrap(); // <-- ritorna Promise<void>
      },
      deps: [AuthService],
    },
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      })
    ),
    provideHttpClient()
  ]
};
