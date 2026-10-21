import { Nodo } from '../../models/nodo.model';
import { Pool } from '../../models/pool.model';
import { severidadesPor, tipoDeElemento } from './advertencias';
import {
  ALTO_CAJA_NEGRA, ALTO_LANE, ANCHO_MINIMO, calcularLayout, INICIO_CONTENIDO, MARGEN, partirTexto, posicionEn, rutaArco,
  rutaMensaje, SEPARACION_POOLS,
} from './layout';

// Ayuda: crea un nodo de ejemplo (actividad en la lane 10 del pool 1); "extra" sobreescribe los campos que interesen
const nodo = (id: number, extra: Partial<Nodo>): Nodo => ({
  id, poolId: 1, laneId: 10, tipo: 'ACTIVIDAD', nombre: 'A', tipoActividad: 'TAREA', tipoGateway: null, variante: null,
  posX: 100, posY: 0, ...extra,
});

// Pool propietario de ejemplo con dos lanes. Se declaran en desorden a propósito (Jefe primero) para probar el orden.
const propietario: Pool = {
  id: 1, procesoId: 9, nombre: 'Empresa', tipo: 'PROPIETARIO', cajaNegra: false, orden: 0, permisoEstructura: 'ADMINISTRADOR_Y_EDITOR',
  lanes: [
    { id: 11, poolId: 1, rolProcesoId: 2, nombre: 'Jefe', orden: 1 },
    { id: 10, poolId: 1, rolProcesoId: 1, nombre: 'Empleado', orden: 0 },
  ],
};
// Pool de sistema externo en "caja negra": no tiene lanes, solo se dibuja como una caja
const correo: Pool = {
  id: 2, procesoId: 9, nombre: 'Correo', tipo: 'SISTEMA_EXTERNO', cajaNegra: true, orden: 1, permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes: [],
};

/**
 * Pruebas de la geometría del lienzo: funciones puras que calculan posiciones, tamaños y rutas.
 * No usan TestBed ni DOM: se llama a la función y se comparan los números resultantes.
 */
describe('Geometría del lienzo (layout)', () => {
  // Escenario: dos pools desordenados (el de caja negra primero).
  // Esperado: se apilan por su orden, las lanes se ordenan y la caja negra tiene su alto propio.
  it('apila los pools en orden, con las lanes ordenadas y la caja negra baja', () => {
    const layout = calcularLayout([correo, propietario], []);
    const [p1, p2] = layout.pools;
    expect(p1.pool.id).toBe(1);
    expect(p1.y).toBe(MARGEN);
    expect(p1.franjas.map((f) => f.nombre)).toEqual(['Empleado', 'Jefe']);
    expect(p1.alto).toBe(2 * ALTO_LANE);
    expect(p2.y).toBe(MARGEN + 2 * ALTO_LANE + SEPARACION_POOLS);
    expect(p2.alto).toBe(ALTO_CAJA_NEGRA);
    expect(p2.franjas).toEqual([]);
    expect(layout.ancho).toBe(ANCHO_MINIMO + 2 * MARGEN);
  });

  // Esperado: un nodo en la lane "Jefe" se ubica con sus coordenadas centrales calculadas desde el margen y la lane.
  it('posX es el centro desde el contenido de la lane y posY baja desde el centro de la lane', () => {
    const layout = calcularLayout([propietario], [nodo(5, { laneId: 11, posX: 200, posY: 0 })]);
    const n = layout.nodos.get(5)!;
    expect(n.cx).toBe(MARGEN + INICIO_CONTENIDO + 200);
    expect(n.cy).toBe(MARGEN + ALTO_LANE + ALTO_LANE / 2);
    expect(n.ancho).toBe(120);
  });

  // Esperado: un nodo muy abajo agranda su lane y uno muy a la derecha agranda el ancho total del lienzo.
  it('la lane crece si un elemento queda más abajo y el ancho crece con el elemento más lejano', () => {
    const layout = calcularLayout([propietario], [nodo(5, { laneId: 10, posY: 100 }), nodo(6, { posX: 2000 })]);
    expect(layout.pools[0].franjas[0].alto).toBeGreaterThan(ALTO_LANE);
    expect(layout.ancho).toBeGreaterThan(2000);
  });

  // Esperado: un nodo con laneId null se coloca en una franja extra llamada "Sin lane" al final del pool.
  it('los elementos sin lane van a una franja "Sin lane"', () => {
    const layout = calcularLayout([propietario], [nodo(7, { tipo: 'EVENTO_INICIO', laneId: null })]);
    const franjas = layout.pools[0].franjas;
    expect(franjas.length).toBe(3);
    expect(franjas[2].nombre).toBe('Sin lane');
    expect(layout.nodos.get(7)!.cy).toBe(franjas[2].y + ALTO_LANE / 2);
  });

  // Esperado: aunque el pool no tenga lanes se crea una franja sin lane, para poder colocar eventos.
  it('un pool sin lanes tiene una franja vacía donde se pueden poner eventos', () => {
    const solo = { ...propietario, lanes: [] };
    const franjas = calcularLayout([solo], []).pools[0].franjas;
    expect(franjas.length).toBe(1);
    expect(franjas[0].lane).toBeNull();
  });

  // Escenario: coordenadas de un clic sobre el lienzo.
  // Esperado: se devuelve el pool, la lane y la posición redondeada a múltiplos de 10; fuera de los pools devuelve null.
  it('traduce un clic a pool, lane y posición en cuadrícula de 10', () => {
    const layout = calcularLayout([propietario, correo], []);
    const enJefe = posicionEn(layout, MARGEN + INICIO_CONTENIDO + 153, MARGEN + ALTO_LANE + ALTO_LANE / 2 + 27)!;
    expect(enJefe.lane?.nombre).toBe('Jefe');
    expect(enJefe.posX).toBe(150);
    expect(enJefe.posY).toBe(30);

    const arribaDelCentro = posicionEn(layout, MARGEN + INICIO_CONTENIDO + 10, MARGEN + 5)!;
    expect(arribaDelCentro.posY).toBe(0);
    expect(arribaDelCentro.posX).toBe(30);   // mínimo: no queda encima de las etiquetas

    const enCajaNegra = posicionEn(layout, 300, layout.pools[1].y + 10)!;
    expect(enCajaNegra.pool.cajaNegra).toBeTrue();
    expect(enCajaNegra.lane).toBeNull();

    expect(posicionEn(layout, 300, layout.pools[0].y + layout.pools[0].alto + 5)).toBeNull();
  });

  // Escenario: cuatro nodos y arcos entre ellos.
  // Esperado: el atributo "d" del trazado SVG (M = mover, H = horizontal, V = vertical) sigue la ruta
  // recta, la que sale del gateway hacia otra lane, y la que rodea cuando el destino queda atrás.
  it('el arco va recto en la misma fila, sale del vértice del gateway hacia otra lane y rodea si el destino está atrás', () => {
    const layout = calcularLayout([propietario], [
      nodo(1, { posX: 100 }), nodo(2, { posX: 300 }),
      nodo(3, { tipo: 'GATEWAY', tipoGateway: 'EXCLUSIVO', posX: 450 }), nodo(4, { laneId: 11, posX: 600 }),
    ]);
    const n = (id: number) => layout.nodos.get(id)!;

    expect(rutaArco(n(1), n(2)).d).toBe(`M ${n(1).cx + 60} ${n(1).cy} H ${n(2).cx - 60}`);
    expect(rutaArco(n(3), n(4)).d).toBe(`M ${n(3).cx} ${n(3).cy + 25} V ${n(4).cy} H ${n(4).cx - 60}`);
    expect(rutaArco(n(2), n(1)).d).toContain(`V ${n(1).cy + 30 + 30}`);
  });

  // Esperado: el flujo de mensaje sin nodo destino baja hasta el borde del pool de caja negra; sin pool devuelve null.
  it('el mensaje baja hasta el elemento que lo recibe o hasta el borde del pool de caja negra', () => {
    const pools = [propietario, correo];
    const layout = calcularLayout(pools, [nodo(1, { tipo: 'MESSAGE_THROW', posX: 200 })]);
    const origen = layout.nodos.get(1)!;
    const alBorde = rutaMensaje(origen, null, layout.pools[1])!;
    expect(alBorde.d).toBe(`M ${origen.cx} ${origen.cy + 18} V ${layout.pools[1].y}`);
    expect(alBorde.ancla).toBe('start');
    expect(rutaMensaje(origen, null, null)).toBeNull();
  });

  // Esperado: el texto se divide en renglones del ancho dado; si excede el máximo de renglones se corta con "…".
  it('parte los nombres largos en renglones y recorta lo que no cabe', () => {
    expect(partirTexto('Revisar solicitud de vacaciones', 16)).toEqual(['Revisar', 'solicitud de', 'vacaciones']);
    const recortado = partirTexto('uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece', 10, 2);
    expect(recortado.length).toBe(2);
    expect(recortado[1].endsWith('…')).toBeTrue();
    expect(partirTexto(null)).toEqual([]);
  });
});

/** Pruebas de las funciones que clasifican las advertencias del validador (a qué elemento pertenece cada una). */
describe('Advertencias del validador', () => {
  // Ayuda: crea una advertencia de ejemplo con el código, el id del elemento y la severidad (ERROR por defecto)
  const a = (codigo: string, elementoId: number | null, severidad: 'ERROR' | 'AVISO' = 'ERROR') => ({ codigo, elementoId, severidad, mensaje: '' });

  // Esperado: según el código de la advertencia, el id se interpreta como pool, arco o nodo; sin id no hay tipo.
  it('sabe si el elementoId es un pool, un arco o un elemento', () => {
    expect(tipoDeElemento(a('SIN_INICIO', 1))).toBe('pool');
    expect(tipoDeElemento(a('CONDICION_FALTANTE', 7))).toBe('arco');
    expect(tipoDeElemento(a('SIN_SALIDA', 7))).toBe('nodo');
    expect(tipoDeElemento(a('DIAGRAMA_VACIO', null))).toBeNull();
  });

  // Esperado: si un elemento tiene un aviso y un error, queda marcado como ERROR; y un id de nodo no se confunde con el mismo id de un arco.
  it('el ERROR gana sobre el AVISO del mismo elemento y no se mezclan tipos con el mismo id', () => {
    const nodos = severidadesPor([a('CORRELACION_FALTANTE', 5, 'AVISO'), a('SIN_SALIDA', 5), a('CONDICION_FALTANTE', 5)], 'nodo');
    expect(nodos.get(5)).toBe('ERROR');
    const arcos = severidadesPor([a('CORRELACION_FALTANTE', 5, 'AVISO')], 'arco');
    expect(arcos.has(5)).toBeFalse();
  });
});
