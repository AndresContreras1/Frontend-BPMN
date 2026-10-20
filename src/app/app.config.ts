import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEsCo from '@angular/common/locales/es-CO';
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { cargaInterceptor } from './core/interceptors/carga.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

// Fechas y números en español de Colombia (DatePipe, DecimalPipe)
registerLocaleData(localeEsCo);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // El token se agrega primero, el 401 se procesa al volver la respuesta y la barra de carga cuenta cada petición
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor, cargaInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-CO' },
  ],
};
