import { Usuario } from './usuario.model';

/** NIT con el mismo formato que valida el backend: 5 a 15 dígitos y, opcional, el dígito de verificación. */
export const PATRON_NIT = /^[0-9]{5,15}(-[0-9])?$/;

/** Empresa registrada en la aplicación. */
export interface Empresa {
  /** Identificador de la empresa. */
  id: number;
  /** Nombre de la empresa. */
  nombre: string;
  /** NIT (identificación tributaria). */
  nit: string;
  /** Correo de contacto. */
  correoContacto: string;
  /** Fecha de creación (texto ISO que envía la API). */
  creadoEn: string;
}

/** HU-01: datos del registro; el correo y la contraseña son las credenciales del representante. */
export interface RegistroEmpresaRequest {
  /** Nombre de la empresa. */
  nombre: string;
  /** NIT de la empresa. */
  nit: string;
  /** Correo de contacto; también sirve para iniciar sesión. */
  correoContacto: string;
  /** Nombre de quien representa a la empresa (será el administrador). */
  nombreRepresentante: string;
  /** Contraseña del administrador. */
  password: string;
}

/** Respuesta del registro: la empresa creada y su usuario administrador. */
export interface RegistroEmpresaResponse {
  /** Empresa creada. */
  empresa: Empresa;
  /** Usuario administrador creado junto con la empresa. */
  administrador: Usuario;
}
