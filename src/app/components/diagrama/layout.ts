import { Lane } from '../../models/lane.model';
import { Nodo } from '../../models/nodo.model';
import { Pool } from '../../models/pool.model';

/*
 * Geometría del lienzo. Convención (la misma de los datos demo del backend):
 *  - posX: centro horizontal del elemento, medido desde donde empieza el contenido de la lane.
 *  - posY: desplazamiento hacia abajo desde el centro de la lane (0 = centrado).
 * La lane define el responsable; el alto de cada lane crece si un elemento queda más abajo.
 */

// Medidas fijas del lienzo, todas en píxeles
/** Espacio en blanco alrededor del diagrama. */
export const MARGEN = 20;
/** Ancho de la columna donde se escribe (girado) el nombre del pool. */
export const ANCHO_ETIQUETA_POOL = 32;
/** Ancho de la columna donde se escribe (girado) el nombre de cada lane. */
export const ANCHO_ETIQUETA_LANE = 28;
/** Distancia desde la izquierda del pool hasta donde empieza el contenido (las dos columnas de etiquetas juntas); posX se mide desde ahí. */
export const INICIO_CONTENIDO = ANCHO_ETIQUETA_POOL + ANCHO_ETIQUETA_LANE;
/** Alto mínimo de una lane. */
export const ALTO_LANE = 130;
/** Alto de un pool tipo caja negra (no tiene lanes ni elementos). */
export const ALTO_CAJA_NEGRA = 70;
/** Espacio vertical entre un pool y el siguiente. */
export const SEPARACION_POOLS = 50;
/** Ancho mínimo del pool, aunque los elementos ocupen menos. */
export const ANCHO_MINIMO = 1100;
/** Los clics se redondean a múltiplos de este valor para que los elementos queden alineados. */
export const CUADRICULA = 10;
/** Tope de posX y posY que acepta la API. */
export const POSICION_MAXIMA = 10000;

/** Los tres dibujos posibles: la actividad es un rectángulo, el gateway un rombo y los eventos un círculo. */
export type Forma = 'actividad' | 'gateway' | 'evento';

/** Tamaño de cada forma en píxeles (en el evento, el ancho es el diámetro). */
export const TAMANOS: Record<Forma, { ancho: number; alto: number }> = {
  actividad: { ancho: 120, alto: 60 },
  gateway: { ancho: 50, alto: 50 },
  evento: { ancho: 36, alto: 36 },
};

/**
 * Una franja horizontal dentro de un pool: normalmente una lane. Si lane es null es la franja
 * "Sin lane" (elementos sin lane o pool sin lanes). x, y, ancho y alto son su rectángulo en el lienzo.
 */
export interface FranjaLayout {
  lane: Lane | null;
  nombre: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * Posición y tamaño de un pool ya calculados (x, y es su esquina superior izquierda).
 * franjas son sus lanes de arriba hacia abajo; en una caja negra está vacío.
 */
export interface PoolLayout {
  pool: Pool;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  franjas: FranjaLayout[];
}

/**
 * Posición y forma de un nodo ya calculadas. cx, cy es el CENTRO del nodo en el lienzo
 * (coordenadas absolutas del SVG); ancho y alto salen de TAMANOS.
 */
export interface NodoLayout {
  nodo: Nodo;
  forma: Forma;
  cx: number;
  cy: number;
  ancho: number;
  alto: number;
}

/** Resultado completo del cálculo: tamaño total del lienzo y todo lo que hay que dibujar. */
export interface DiagramaLayout {
  ancho: number;
  alto: number;
  pools: PoolLayout[];
  // Nodos por id: así se encuentra rápido el origen y el destino de un arco
  nodos: Map<number, NodoLayout>;
}

/** Dónde cayó un clic: pool, lane y posición en la convención de la API. */
export interface Posicion {
  pool: Pool;
  lane: Lane | null;
  posX: number;
  posY: number;
}

/** Trazado de una línea: el path SVG y dónde poner su etiqueta. */
export interface Ruta {
  /** Instrucciones del path SVG: M = mover a, H = línea horizontal hasta x, V = línea vertical hasta y. */
  d: string;
  etiquetaX: number;
  etiquetaY: number;
  /** Alineación del texto: a la derecha de una línea vertical o centrado sobre un tramo horizontal. */
  ancla?: 'start' | 'middle';
}

/** Elige la forma con que se dibuja un nodo según su tipo. */
export function formaDe(nodo: Nodo): Forma {
  // Las actividades son rectángulos
  if (nodo.tipo === 'ACTIVIDAD') {
    return 'actividad';
  }
  // Los gateways son rombos; los eventos de inicio y fin son círculos
  return nodo.tipo === 'GATEWAY' ? 'gateway' : 'evento';
}

/** Ubica pools (uno debajo del otro), sus lanes y cada elemento. */
export function calcularLayout(pools: Pool[], nodos: Nodo[]): DiagramaLayout {
  // Pools en el orden que definió el usuario (copiamos el arreglo para no alterar el original)
  const ordenados = [...pools].sort((a, b) => a.orden - b.orden);
  // Borde derecho del elemento que está más a la derecha (su centro posX más la mitad de su ancho)
  const extremoX = nodos.reduce((max, n) => Math.max(max, n.posX + TAMANOS[formaDe(n)].ancho / 2), 0);
  // Todos los pools miden lo mismo: lo que pida el elemento más lejano más 80 px de aire, y nunca menos que el ancho mínimo
  const anchoPool = Math.max(ANCHO_MINIMO, INICIO_CONTENIDO + extremoX + 80);
  // Aquí se van acumulando los pools calculados
  const resultado: PoolLayout[] = [];
  // Y aquí los nodos, indexados por id
  const nodosLayout = new Map<number, NodoLayout>();
  // y es el borde superior del pool que se está colocando; el primero empieza en el margen
  let y = MARGEN;

  // Se colocan los pools uno debajo del otro
  for (const pool of ordenados) {
    // Todos los pools empiezan en el mismo x: el margen izquierdo
    const x = MARGEN;
    // Caja negra: un rectángulo bajo y sin lanes
    if (pool.cajaNegra) {
      // Se agrega con alto fijo y sin franjas
      resultado.push({ pool, x, y, ancho: anchoPool, alto: ALTO_CAJA_NEGRA, franjas: [] });
      // El siguiente pool empieza debajo de este más la separación
      y += ALTO_CAJA_NEGRA + SEPARACION_POOLS;
      // Pasamos al siguiente pool; una caja negra no tiene nodos que ubicar
      continue;
    }

    // Nodos que pertenecen a este pool
    const delPool = nodos.filter((n) => n.poolId === pool.id);
    // Lanes del pool en su orden
    const lanes = [...pool.lanes].sort((a, b) => a.orden - b.orden);
    // Conjunto de ids de lanes, para saber rápido si la lane de un nodo existe
    const idsLanes = new Set(lanes.map((l) => l.id));
    // Una banda por lane, con los nodos que están en ella
    const bandas = lanes.map((lane) => ({ lane: lane as Lane | null, nombre: lane.nombre, nodos: delPool.filter((n) => n.laneId === lane.id) }));
    // Nodos que no tienen lane o cuya lane ya no existe en el pool
    const sinLane = delPool.filter((n) => n.laneId === null || !idsLanes.has(n.laneId));
    // Si hay nodos sueltos (o el pool no tiene lanes) se agrega una banda extra sin lane
    if (sinLane.length || bandas.length === 0) {
      // Si el pool sí tiene lanes se rotula "Sin lane"; si no tiene ninguna, no lleva rótulo
      bandas.push({ lane: null, nombre: lanes.length ? 'Sin lane' : '', nodos: sinLane });
    }

    // Franjas (rectángulos) que se van a dibujar en este pool
    const franjas: FranjaLayout[] = [];
    // yFranja es el borde superior de la franja actual; la primera empieza donde empieza el pool
    let yFranja = y;
    // Se apilan las bandas de arriba hacia abajo
    for (const banda of bandas) {
      // Alto de la banda: el mínimo de una lane, o más si algún elemento queda muy abajo
      // (mitad de la lane + posY del elemento + mitad de su alto + 25 px de aire)
      const alto = Math.max(ALTO_LANE, ...banda.nodos.map((n) => ALTO_LANE / 2 + n.posY + TAMANOS[formaDe(n)].alto / 2 + 25));
      // La franja empieza después de la columna de etiqueta del pool y ocupa el resto del ancho
      franjas.push({ lane: banda.lane, nombre: banda.nombre, x: x + ANCHO_ETIQUETA_POOL, y: yFranja, ancho: anchoPool - ANCHO_ETIQUETA_POOL, alto });
      // Ubicamos cada nodo dentro de su banda
      for (const nodo of banda.nodos) {
        // Forma y tamaño del nodo
        const forma = formaDe(nodo);
        // cx: borde izquierdo del contenido + posX (posX es el centro horizontal)
        // cy: mitad de la banda (el centro de la lane) + posY (desplazamiento hacia abajo; 0 = centrado)
        nodosLayout.set(nodo.id, {
          nodo, forma, ...TAMANOS[forma],
          cx: x + INICIO_CONTENIDO + nodo.posX,
          cy: yFranja + ALTO_LANE / 2 + nodo.posY,
        });
      }
      // La siguiente banda empieza donde termina esta
      yFranja += alto;
    }
    // El alto del pool es la suma de sus bandas (yFranja ya quedó al final de la última)
    resultado.push({ pool, x, y, ancho: anchoPool, alto: yFranja - y, franjas });
    // El siguiente pool empieza debajo de este más la separación
    y = yFranja + SEPARACION_POOLS;
  }

  // Tamaño del lienzo: ancho del pool más márgenes a los lados; alto hasta el final del último pool
  // (se descuenta la separación que se sumó de más) más el margen, con 200 como mínimo
  return { ancho: anchoPool + MARGEN * 2, alto: Math.max(y - SEPARACION_POOLS + MARGEN, 200), pools: resultado, nodos: nodosLayout };
}

/** Traduce un clic en el lienzo a pool, lane y posición (ajustada a una cuadrícula de 10). */
export function posicionEn(layout: DiagramaLayout, x: number, y: number): Posicion | null {
  // Pool que contiene el punto (x, y) del clic
  const pool = layout.pools.find((p) => x >= p.x && x <= p.x + p.ancho && y >= p.y && y <= p.y + p.alto);
  // El clic cayó fuera de todos los pools: no se puede colocar nada
  if (!pool) {
    return null;
  }
  // Franja (lane) del clic; si cae justo en el borde se usa la última
  const franja = pool.franjas.find((f) => y >= f.y && y < f.y + f.alto) ?? pool.franjas[pool.franjas.length - 1] ?? null;
  // posX: distancia desde donde empieza el contenido, redondeada a la cuadrícula y nunca menor que 30
  const posX = Math.max(30, redondear(x - pool.x - INICIO_CONTENIDO));
  // posY: distancia respecto al centro de la lane, redondeada a la cuadrícula y nunca negativa
  const posY = franja ? Math.max(0, redondear(y - franja.y - ALTO_LANE / 2)) : 0;
  return {
    // Se devuelve en la convención de la API, con tope en POSICION_MAXIMA
    pool: pool.pool,
    lane: franja?.lane ?? null,
    posX: Math.min(posX, POSICION_MAXIMA),
    posY: Math.min(posY, POSICION_MAXIMA),
  };
}

/** Flujo de secuencia: sale por la derecha y entra por la izquierda; si el destino está atrás, rodea por debajo. */
export function rutaArco(o: NodoLayout, d: NodoLayout): Ruta {
  // sx: punto de salida (borde derecho del origen)
  const sx = derecha(o);
  // ex: punto de entrada (borde izquierdo del destino)
  const ex = izquierda(d);
  // true si origen y destino están a alturas distintas (más de media altura de diferencia)
  const otraAltura = Math.abs(o.cy - d.cy) > o.alto / 2;

  // Del gateway a otra lane: sale por el vértice de abajo o de arriba, como en BPMN
  if (o.forma === 'gateway' && otraAltura && ex > o.cx + 10) {
    // sy: salida por el vértice de abajo si el destino está más abajo, o de arriba si está más arriba
    const sy = d.cy > o.cy ? abajo(o) : arriba(o);
    // Camino: baja/sube en vertical hasta la altura del destino y luego entra en horizontal.
    // La etiqueta va junto a la línea vertical, a media altura
    return { d: `M ${o.cx} ${sy} V ${d.cy} H ${ex}`, etiquetaX: o.cx + 6, etiquetaY: Math.round((sy + d.cy) / 2) };
  }
  // Misma fila y destino adelante: línea recta aunque los elementos estén casi pegados
  if (Math.abs(o.cy - d.cy) < 1 && ex >= sx) {
    // Camino: una sola línea horizontal; la etiqueta va a la mitad, un poco arriba de la línea
    return { d: `M ${sx} ${o.cy} H ${ex}`, etiquetaX: Math.round((sx + ex) / 2) - 8, etiquetaY: o.cy - 8 };
  }
  // Destino adelante con espacio suficiente: camino en escalón (horizontal, vertical, horizontal)
  if (ex - sx >= 20) {
    // x donde la línea cambia de altura: a mitad de camino
    const medio = Math.round((sx + ex) / 2);
    // Camino: sale hacia la derecha hasta "medio", sube o baja hasta la altura del destino y entra
    return { d: `M ${sx} ${o.cy} H ${medio} V ${d.cy} H ${ex}`, etiquetaX: medio + 6, etiquetaY: Math.round((o.cy + d.cy) / 2) };
  }
  // Destino hacia atrás o pegado: la línea rodea por debajo; yBajo es esa altura, 30 px bajo el más bajo de los dos
  const yBajo = Math.max(abajo(o), abajo(d)) + 30;
  // Camino: baja desde el origen, cruza horizontal hasta el destino y sube hasta su borde inferior
  return { d: `M ${o.cx} ${abajo(o)} V ${yBajo} H ${d.cx} V ${abajo(d)}`, etiquetaX: Math.round((o.cx + d.cx) / 2), etiquetaY: yBajo - 6 };
}

/**
 * Flujo de mensaje (línea punteada) entre pools: hasta el elemento que lo recibe o, si no hay uno
 * (caja negra, sistema externo), hasta el borde del pool destino.
 */
export function rutaMensaje(o: NodoLayout, destino: NodoLayout | null, poolDestino: PoolLayout | null): Ruta | null {
  // Caso 1: el mensaje llega a un nodo concreto
  if (destino) {
    // baja: el destino está más abajo que el origen
    const baja = destino.cy > o.cy;
    // Sale por abajo si va hacia abajo, por arriba si va hacia arriba
    const sy = baja ? abajo(o) : arriba(o);
    // Y llega al borde contrario del destino
    const ey = baja ? arriba(destino) : abajo(destino);
    // medioY: altura a la que la línea cambia de columna
    const medioY = Math.round((sy + ey) / 2);
    // Si ambos nodos están en la misma columna, la línea es recta vertical
    if (Math.abs(o.cx - destino.cx) < 1) {
      return { d: `M ${o.cx} ${sy} V ${ey}`, etiquetaX: o.cx + 8, etiquetaY: medioY, ancla: 'start' };
    }
    // Si no, baja a medioY, se desplaza en horizontal hasta la columna del destino y termina en vertical
    return { d: `M ${o.cx} ${sy} V ${medioY} H ${destino.cx} V ${ey}`, etiquetaX: Math.round((o.cx + destino.cx) / 2), etiquetaY: medioY - 6, ancla: 'middle' };
  }
  // Caso 2: no hay nodo receptor (caja negra o sistema externo): la línea llega al borde del pool destino
  if (poolDestino) {
    // baja: el pool destino queda debajo del origen
    const baja = poolDestino.y > o.cy;
    const sy = baja ? abajo(o) : arriba(o);
    // Llega al borde superior del pool si está debajo o a su borde inferior si está encima
    const ey = baja ? poolDestino.y : poolDestino.y + poolDestino.alto;
    return { d: `M ${o.cx} ${sy} V ${ey}`, etiquetaX: o.cx + 8, etiquetaY: Math.round((sy + ey) / 2) + 4, ancla: 'start' };
  }
  // Sin nodo ni pool destino no hay nada que dibujar
  return null;
}

/** Parte un nombre en renglones cortos para que quepa dentro de la actividad. */
export function partirTexto(texto: string | null, maximo = 16, renglones = 3): string[] {
  // Palabras del texto, ignorando espacios repetidos y vacíos (el texto puede ser null)
  const palabras = (texto ?? '').trim().split(/\s+/).filter(Boolean);
  // Renglones ya armados
  const lineas: string[] = [];
  // Renglón que se está armando
  let actual = '';
  // Se añade palabra por palabra
  for (const palabra of palabras) {
    // Cómo quedaría el renglón si se agrega esta palabra
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    // Si se pasa del máximo (y el renglón no está vacío) se cierra el renglón y la palabra abre otro
    if (candidata.length > maximo && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      // Si cabe, la palabra se queda en el renglón actual
      actual = candidata;
    }
  }
  // Se guarda el último renglón
  if (actual) {
    lineas.push(actual);
  }
  // Si hay más renglones de los permitidos, se corta y se pone "…" al final del último
  if (lineas.length > renglones) {
    const visibles = lineas.slice(0, renglones);
    // Se recorta para que el "…" quepa dentro del máximo
    visibles[renglones - 1] = visibles[renglones - 1].slice(0, maximo - 1) + '…';
    return visibles;
  }
  return lineas;
}

/** Redondea al múltiplo de CUADRICULA más cercano. */
function redondear(valor: number): number {
  return Math.round(valor / CUADRICULA) * CUADRICULA;
}

// Atajos para los cuatro bordes de un nodo a partir de su centro (cx, cy) y su tamaño
// (en el SVG, y crece hacia abajo, por eso "arriba" resta y "abajo" suma)
const izquierda = (n: NodoLayout) => n.cx - n.ancho / 2;
const derecha = (n: NodoLayout) => n.cx + n.ancho / 2;
const arriba = (n: NodoLayout) => n.cy - n.alto / 2;
const abajo = (n: NodoLayout) => n.cy + n.alto / 2;
