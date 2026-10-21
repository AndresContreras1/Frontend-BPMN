import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DiagramaSvgComponent } from '../../components/diagrama/diagrama-svg/diagrama-svg.component';
import { ColorIndicador } from '../../components/indicador/indicador.component';
import { ARCOS_EJEMPLO, MENSAJES_EJEMPLO, NODOS_EJEMPLO, POOLS_EJEMPLO } from './ejemplo-vacaciones';

/** Una tarjeta de la sección "Todo lo que pide un proceso". */
interface Funcion {
  /** Nombre del frente funcional. */
  titulo: string;
  /** Historias de usuario que cubre (por ejemplo "HU-01 a HU-03"). */
  hu: string;
  /** Descripción corta. */
  texto: string;
  /** Clase del ícono de Bootstrap Icons. */
  icono: string;
  /** Color de Bootstrap del círculo del ícono. */
  color: ColorIndicador;
}

/** Una diapositiva del carrusel "Los elementos del diagrama". */
interface Elemento {
  /** Nombre del elemento BPMN. */
  nombre: string;
  /** Historias de usuario relacionadas. */
  hu: string;
  /** Explicación corta del elemento. */
  texto: string;
  /** Clase del ícono de Bootstrap Icons. */
  icono: string;
}

/**
 * Página pública (solo invitados): presenta el sistema y lleva a registrar la empresa o a iniciar sesión.
 * El diagrama es el mismo componente del editor, alimentado con el ejemplo del enunciado.
 */
@Component({
  selector: 'app-bienvenida',
  imports: [RouterLink, DiagramaSvgComponent],
  templateUrl: './bienvenida.component.html',
  styleUrl: './bienvenida.component.scss',
})
export class BienvenidaComponent {
  // Datos del ejemplo del enunciado que se pasan al lienzo (ver ejemplo-vacaciones.ts)
  /** Pools del diagrama de ejemplo. */
  readonly pools = POOLS_EJEMPLO;
  /** Nodos (actividades, gateway, eventos) del ejemplo. */
  readonly nodos = NODOS_EJEMPLO;
  /** Flujos de secuencia del ejemplo. */
  readonly arcos = ARCOS_EJEMPLO;
  /** Flujos de mensaje del ejemplo. */
  readonly mensajes = MENSAJES_EJEMPLO;

  /** Tarjetas de funciones: el template las recorre con @for. */
  readonly funciones: Funcion[] = [
    { titulo: 'Empresas y usuarios', hu: 'HU-01 a HU-03', icono: 'bi-building', color: 'primary',
      texto: 'Cada empresa se registra con su administrador, invita a su equipo y asigna roles de administrador, editor o lector.' },
    { titulo: 'Procesos con historial', hu: 'HU-04 a HU-07', icono: 'bi-clock-history', color: 'info',
      texto: 'Cree, edite, publique y elimine procesos sin perder la trazabilidad: cada cambio queda en el historial.' },
    { titulo: 'Modelado del flujo', hu: 'HU-08 a HU-16', icono: 'bi-diagram-3', color: 'success',
      texto: 'Actividades, eventos, gateways exclusivos, paralelos e inclusivos y arcos con condiciones, validados en vivo.' },
    { titulo: 'Roles de proceso', hu: 'HU-17 a HU-20', icono: 'bi-person-workspace', color: 'warning',
      texto: 'Un catálogo de funciones responsables (Analista, Supervisor...) que no se puede borrar mientras esté en uso.' },
    { titulo: 'Pools y lanes', hu: 'HU-21 a HU-24', icono: 'bi-layout-three-columns', color: 'secondary',
      texto: 'Participantes internos y externos, lanes por rol y permisos para decidir quién cambia la estructura.' },
    { titulo: 'Mensajes entre pools', hu: 'HU-25 a HU-28', icono: 'bi-envelope-paper', color: 'danger',
      texto: 'Envíos y recepciones con su contenido, notificaciones a sistemas externos y la clave de correlación de cada caso.' },
  ];

  /** Diapositivas del carrusel de elementos del diagrama. */
  readonly elementos: Elemento[] = [
    { nombre: 'Actividad', hu: 'HU-08 a HU-10', icono: 'bi-square',
      texto: 'Una tarea del proceso. Vive en una lane, que define el rol responsable de hacerla.' },
    { nombre: 'Gateway', hu: 'HU-14 a HU-16', icono: 'bi-diamond',
      texto: 'Un punto de decisión o ramificación: exclusivo (un camino), paralelo (todos) o inclusivo (uno o varios).' },
    { nombre: 'Arco', hu: 'HU-11 a HU-13', icono: 'bi-arrow-right',
      texto: 'La secuencia del flujo entre elementos de un mismo pool. Nunca cruza de un pool a otro.' },
    { nombre: 'Pool y lane', hu: 'HU-21 a HU-24', icono: 'bi-layout-three-columns',
      texto: 'El pool es un participante (la empresa, un cliente, un sistema externo) y la lane agrupa lo de un mismo rol.' },
    { nombre: 'Mensaje y correlación', hu: 'HU-25 a HU-28', icono: 'bi-envelope',
      texto: 'La comunicación entre pools: un participante envía, otro recibe, y la correlación indica a qué caso pertenece.' },
  ];

  /** Pasos de "Cómo empezar"; el número de cada uno lo calcula el template con el índice. */
  readonly pasos = [
    { titulo: 'Registre su empresa', texto: 'Con su NIT y el administrador inicial.' },
    { titulo: 'Invite a su equipo', texto: 'Con el rol de acceso de cada persona.' },
    { titulo: 'Modele y publique', texto: 'El validador avisa los errores antes de publicar.' },
    { titulo: 'Comparta por NIT', texto: 'Otras empresas lo ven en solo lectura.' },
  ];
}
