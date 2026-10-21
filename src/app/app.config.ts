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

/** Configuración global de la app: aquí se registran los servicios que Angular debe tener disponibles. */
export const appConfig: ApplicationConfig = {
  providers: [
    // Detección de cambios con zone.js; eventCoalescing agrupa eventos seguidos para hacer menos revisiones
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Activa el router con las rutas de app.routes.ts
    provideRouter(routes),
    // El token se agrega primero, el 401 se procesa al volver la respuesta y la barra de carga cuenta cada petición
    // (withFetch usa la API fetch del navegador en lugar de XMLHttpRequest)
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor, cargaInterceptor])),
    // Idioma por defecto de pipes de fecha y número: español de Colombia
    { provide: LOCALE_ID, useValue: 'es-CO' },
  ],
};
