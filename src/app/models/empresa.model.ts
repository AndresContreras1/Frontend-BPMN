import { Usuario } from './usuario.model';

export interface Empresa {
  id: number;
  nombre: string;
  nit: string;
  correoContacto: string;
  creadoEn: string;
}

/** HU-01: datos del registro; el correo y la contraseña son las credenciales del representante. */
export interface RegistroEmpresaRequest {
  nombre: string;
  nit: string;
  correoContacto: string;
  nombreRepresentante: string;
  password: string;
}

export interface RegistroEmpresaResponse {
  empresa: Empresa;
  administrador: Usuario;
}
