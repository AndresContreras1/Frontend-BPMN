import { Usuario } from './usuario.model';

/** NIT con el mismo formato que valida el backend: 5 a 15 dígitos y, opcional, el dígito de verificación. */
export const PATRON_NIT = /^[0-9]{5,15}(-[0-9])?$/;

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
