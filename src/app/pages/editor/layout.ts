import { Lane } from '../../models/lane.model';
import { Nodo } from '../../models/nodo.model';
import { Pool } from '../../models/pool.model';

/*
 * Geometría del lienzo. Convención (la misma de los datos demo del backend):
 *  - posX: centro horizontal del elemento, medido desde donde empieza el contenido de la lane.
 *  - posY: desplazamiento hacia abajo desde el centro de la lane (0 = centrado).
 * La lane define el responsable; el alto de cada lane crece si un elemento queda más abajo.
 */

export const MARGEN = 20;
export const ANCHO_ETIQUETA_POOL = 32;
export const ANCHO_ETIQUETA_LANE = 28;
export const INICIO_CONTENIDO = ANCHO_ETIQUETA_POOL + ANCHO_ETIQUETA_LANE;
export const ALTO_LANE = 130;
export const ALTO_CAJA_NEGRA = 70;
export const SEPARACION_POOLS = 50;
export const ANCHO_MINIMO = 1100;
export const CUADRICULA = 10;
export const POSICION_MAXIMA = 10000;

export type Forma = 'actividad' | 'gateway' | 'evento';

export const TAMANOS: Record<Forma, { ancho: number; alto: number }> = {
  actividad: { ancho: 120, alto: 60 },
  gateway: { ancho: 50, alto: 50 },
  evento: { ancho: 36, alto: 36 },
};

export interface FranjaLayout {
  lane: Lane | null;
  nombre: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface PoolLayout {
  pool: Pool;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  franjas: FranjaLayout[];
}

export interface NodoLayout {
  nodo: Nodo;
  forma: Forma;
  cx: number;
  cy: number;
  ancho: number;
  alto: number;
}

export interface DiagramaLayout {
  ancho: number;
  alto: number;
  pools: PoolLayout[];
  nodos: Map<number, NodoLayout>;
}

/** Dónde cayó un clic: pool, lane y posición en la convención de la API. */
export interface Posicion {
  pool: Pool;
  lane: Lane | null;
  posX: number;
  posY: number;
}

export interface Ruta {
  d: string;
  etiquetaX: number;
  etiquetaY: number;
  /** Alineación del texto: a la derecha de una línea vertical o centrado sobre un tramo horizontal. */
  ancla?: 'start' | 'middle';
}

export function formaDe(nodo: Nodo): Forma {
  if (nodo.tipo === 'ACTIVIDAD') {
    return 'actividad';
  }
  return nodo.tipo === 'GATEWAY' ? 'gateway' : 'evento';
}

/** Ubica pools (uno debajo del otro), sus lanes y cada elemento. */
export function calcularLayout(pools: Pool[], nodos: Nodo[]): DiagramaLayout {
  const ordenados = [...pools].sort((a, b) => a.orden - b.orden);
  const extremoX = nodos.reduce((max, n) => Math.max(max, n.posX + TAMANOS[formaDe(n)].ancho / 2), 0);
  const anchoPool = Math.max(ANCHO_MINIMO, INICIO_CONTENIDO + extremoX + 80);
  const resultado: PoolLayout[] = [];
  const nodosLayout = new Map<number, NodoLayout>();
  let y = MARGEN;

  for (const pool of ordenados) {
    const x = MARGEN;
    if (pool.cajaNegra) {
      resultado.push({ pool, x, y, ancho: anchoPool, alto: ALTO_CAJA_NEGRA, franjas: [] });
      y += ALTO_CAJA_NEGRA + SEPARACION_POOLS;
      continue;
    }

    const delPool = nodos.filter((n) => n.poolId === pool.id);
    const lanes = [...pool.lanes].sort((a, b) => a.orden - b.orden);
    const idsLanes = new Set(lanes.map((l) => l.id));
    const bandas = lanes.map((lane) => ({ lane: lane as Lane | null, nombre: lane.nombre, nodos: delPool.filter((n) => n.laneId === lane.id) }));
    const sinLane = delPool.filter((n) => n.laneId === null || !idsLanes.has(n.laneId));
    if (sinLane.length || bandas.length === 0) {
      bandas.push({ lane: null, nombre: lanes.length ? 'Sin lane' : '', nodos: sinLane });
    }

    const franjas: FranjaLayout[] = [];
    let yFranja = y;
    for (const banda of bandas) {
      const alto = Math.max(ALTO_LANE, ...banda.nodos.map((n) => ALTO_LANE / 2 + n.posY + TAMANOS[formaDe(n)].alto / 2 + 25));
      franjas.push({ lane: banda.lane, nombre: banda.nombre, x: x + ANCHO_ETIQUETA_POOL, y: yFranja, ancho: anchoPool - ANCHO_ETIQUETA_POOL, alto });
      for (const nodo of banda.nodos) {
        const forma = formaDe(nodo);
        nodosLayout.set(nodo.id, {
          nodo, forma, ...TAMANOS[forma],
          cx: x + INICIO_CONTENIDO + nodo.posX,
          cy: yFranja + ALTO_LANE / 2 + nodo.posY,
        });
      }
      yFranja += alto;
    }
    resultado.push({ pool, x, y, ancho: anchoPool, alto: yFranja - y, franjas });
    y = yFranja + SEPARACION_POOLS;
  }

  return { ancho: anchoPool + MARGEN * 2, alto: Math.max(y - SEPARACION_POOLS + MARGEN, 200), pools: resultado, nodos: nodosLayout };
}

/** Traduce un clic en el lienzo a pool, lane y posición (ajustada a una cuadrícula de 10). */
export function posicionEn(layout: DiagramaLayout, x: number, y: number): Posicion | null {
  const pool = layout.pools.find((p) => x >= p.x && x <= p.x + p.ancho && y >= p.y && y <= p.y + p.alto);
  if (!pool) {
    return null;
  }
  const franja = pool.franjas.find((f) => y >= f.y && y < f.y + f.alto) ?? pool.franjas[pool.franjas.length - 1] ?? null;
  const posX = Math.max(30, redondear(x - pool.x - INICIO_CONTENIDO));
  const posY = franja ? Math.max(0, redondear(y - franja.y - ALTO_LANE / 2)) : 0;
  return {
    pool: pool.pool,
    lane: franja?.lane ?? null,
    posX: Math.min(posX, POSICION_MAXIMA),
    posY: Math.min(posY, POSICION_MAXIMA),
  };
}

/** Flujo de secuencia: sale por la derecha y entra por la izquierda; si el destino está atrás, rodea por debajo. */
export function rutaArco(o: NodoLayout, d: NodoLayout): Ruta {
  const sx = derecha(o);
  const ex = izquierda(d);
  const otraAltura = Math.abs(o.cy - d.cy) > o.alto / 2;

  // Del gateway a otra lane: sale por el vértice de abajo o de arriba, como en BPMN
  if (o.forma === 'gateway' && otraAltura && ex > o.cx + 10) {
    const sy = d.cy > o.cy ? abajo(o) : arriba(o);
    return { d: `M ${o.cx} ${sy} V ${d.cy} H ${ex}`, etiquetaX: o.cx + 6, etiquetaY: Math.round((sy + d.cy) / 2) };
  }
  // Misma fila y destino adelante: línea recta aunque los elementos estén casi pegados
  if (Math.abs(o.cy - d.cy) < 1 && ex >= sx) {
    return { d: `M ${sx} ${o.cy} H ${ex}`, etiquetaX: Math.round((sx + ex) / 2) - 8, etiquetaY: o.cy - 8 };
  }
  if (ex - sx >= 20) {
    const medio = Math.round((sx + ex) / 2);
    return { d: `M ${sx} ${o.cy} H ${medio} V ${d.cy} H ${ex}`, etiquetaX: medio + 6, etiquetaY: Math.round((o.cy + d.cy) / 2) };
  }
  const yBajo = Math.max(abajo(o), abajo(d)) + 30;
  return { d: `M ${o.cx} ${abajo(o)} V ${yBajo} H ${d.cx} V ${abajo(d)}`, etiquetaX: Math.round((o.cx + d.cx) / 2), etiquetaY: yBajo - 6 };
}

/**
 * Flujo de mensaje (línea punteada) entre pools: hasta el elemento que lo recibe o, si no hay uno
 * (caja negra, sistema externo), hasta el borde del pool destino.
 */
export function rutaMensaje(o: NodoLayout, destino: NodoLayout | null, poolDestino: PoolLayout | null): Ruta | null {
  if (destino) {
    const baja = destino.cy > o.cy;
    const sy = baja ? abajo(o) : arriba(o);
    const ey = baja ? arriba(destino) : abajo(destino);
    const medioY = Math.round((sy + ey) / 2);
    if (Math.abs(o.cx - destino.cx) < 1) {
      return { d: `M ${o.cx} ${sy} V ${ey}`, etiquetaX: o.cx + 8, etiquetaY: medioY, ancla: 'start' };
    }
    return { d: `M ${o.cx} ${sy} V ${medioY} H ${destino.cx} V ${ey}`, etiquetaX: Math.round((o.cx + destino.cx) / 2), etiquetaY: medioY - 6, ancla: 'middle' };
  }
  if (poolDestino) {
    const baja = poolDestino.y > o.cy;
    const sy = baja ? abajo(o) : arriba(o);
    const ey = baja ? poolDestino.y : poolDestino.y + poolDestino.alto;
    return { d: `M ${o.cx} ${sy} V ${ey}`, etiquetaX: o.cx + 8, etiquetaY: Math.round((sy + ey) / 2) + 4, ancla: 'start' };
  }
  return null;
}

/** Parte un nombre en renglones cortos para que quepa dentro de la actividad. */
export function partirTexto(texto: string | null, maximo = 16, renglones = 3): string[] {
  const palabras = (texto ?? '').trim().split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of palabras) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (candidata.length > maximo && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = candidata;
    }
  }
  if (actual) {
    lineas.push(actual);
  }
  if (lineas.length > renglones) {
    const visibles = lineas.slice(0, renglones);
    visibles[renglones - 1] = visibles[renglones - 1].slice(0, maximo - 1) + '…';
    return visibles;
  }
  return lineas;
}

function redondear(valor: number): number {
  return Math.round(valor / CUADRICULA) * CUADRICULA;
}

const izquierda = (n: NodoLayout) => n.cx - n.ancho / 2;
const derecha = (n: NodoLayout) => n.cx + n.ancho / 2;
const arriba = (n: NodoLayout) => n.cy - n.alto / 2;
const abajo = (n: NodoLayout) => n.cy + n.alto / 2;
