import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Punto de entrada: arranca Angular con el componente raíz y la configuración global;
// si algo falla al iniciar, el error se muestra en la consola
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
