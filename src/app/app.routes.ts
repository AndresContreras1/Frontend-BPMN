import { Routes } from '@angular/router';

import { NoEncontradoComponent } from './pages/no-encontrado/no-encontrado.component';

// Las rutas más específicas van arriba y las genéricas abajo
export const routes: Routes = [
  { path: '**', component: NoEncontradoComponent },
];
