import { REGLAS } from '../engine/rules';
import {
  aplicar,
  enDia,
  fechaLocal,
  iniciarConsulta,
  INGENIERO,
  procesarEvento,
  procesarRespuesta,
  sumarHoras,
} from '../engine/engine';
import { resumenAgua } from '../engine/vistas';
import type { Caso, Estado, EventoAgua, Parcela, Productor, Sector } from '../engine/types';

/** La demo siempre arranca a las 8:30 a. m. del día real: el plazo de las 7:00 p. m. nunca queda atrás. */
export function inicioDemo(): string {
  return enDia(new Date().toISOString(), 0, 8, 30);
}

export function crearEstadoInicial(inicio: string = inicioDemo()): Estado {
  return {
    inicio,
    ahora: inicio,
    seq: 0,
    productores: [
      { id: 'P-ROSA', nombre: 'Rosa', telefono: '+51 900 000 001', consentimiento: true, ficticio: true },
      { id: 'P-JUAN', nombre: 'Juan', telefono: '+51 900 000 002', consentimiento: true, ficticio: true },
      { id: 'P-ELENA', nombre: 'Elena', telefono: '+51 900 000 003', consentimiento: true, ficticio: true },
    ],
    parcelas: [
      {
        id: 'PA-ROSA',
        productorId: 'P-ROSA',
        alias: 'Chacra del bajo',
        sector: 'Bajo',
        proximoRiego: enDia(inicio, 1, 6),
        riegoPendiente: true,
        tieneReservorio: true,
        reservorioEstado: 'con_agua',
        planAprobado:
          'Usar el agua del reservorio en el turno previsto, según tu plan revisado con el agrónomo.',
        cuota: { concepto: 'cuota de agua', vence: enDia(inicio, 3, 23, 59), pagada: false, avisos: [] },
      },
      {
        id: 'PA-JUAN',
        productorId: 'P-JUAN',
        alias: 'Chacra de arriba',
        sector: 'Alto',
        proximoRiego: enDia(inicio, 1, 6),
        riegoPendiente: true,
        tieneReservorio: false,
        reservorioEstado: 'desconocido',
        cuota: { concepto: 'cuota de agua', vence: enDia(inicio, 1, 23, 59), pagada: false, avisos: [] },
      },
      {
        // Tiene agua, pero ningún agrónomo revisó un plan para su parcela. Tampoco registró su cuota.
        id: 'PA-ELENA',
        productorId: 'P-ELENA',
        alias: 'Olivar de la quebrada',
        sector: 'Alto',
        proximoRiego: enDia(inicio, 1, 6),
        riegoPendiente: true,
        tieneReservorio: true,
        reservorioEstado: 'con_agua',
      },
    ],
    reglas: REGLAS.map((r) => ({ ...r })),
    eventos: [],
    eventosBloqueados: [],
    casos: [],
    mensajes: [],
    auditoria: [],
    registro: { paso: 'inicio' },
    coordinacion: [],
  };
}

// ---------- Escenario de la demo: 40 parcelas afectadas ----------

const PLAN = 'Usar el agua del reservorio en el turno previsto, según tu plan revisado con el agrónomo.';

type Grupo = 'regaron' | 'alternativa' | 'vacio' | 'sin_reservorio' | 'callan';

/** 39 productores ficticios del sector Bajo. Rosa completa las 40 parcelas. */
const VECINOS: [string, Grupo][] = [
  ...(
    ['Alberto', 'Ana', 'Benito', 'Blanca', 'Carlos', 'Celia', 'Dante', 'Delia', 'Efraín', 'Eva', 'Fausto', 'Flor', 'Germán', 'Gladys'] as const
  ).map((n): [string, Grupo] => [n, 'regaron']),
  ...(['Hilda', 'Hugo', 'Irene', 'Iván', 'Julia', 'Jorge', 'Karina', 'Lino', 'Lidia', 'Marco'] as const).map(
    (n): [string, Grupo] => [n, 'alternativa'],
  ),
  ...(['Marta', 'Nelson', 'Nora', 'Óscar'] as const).map((n): [string, Grupo] => [n, 'vacio']),
  ...(['Olga', 'Pablo', 'Paula', 'Quintín'] as const).map((n): [string, Grupo] => [n, 'sin_reservorio']),
  ...(['Raúl', 'Rita', 'Saúl', 'Sonia', 'Teodoro', 'Teresa', 'Víctor'] as const).map((n): [string, Grupo] => [n, 'callan']),
];

const RESPUESTAS: Record<Grupo, string[]> = {
  regaron: ['ya_regue'],
  alternativa: ['todavia_no', 'si_agua'],
  vacio: ['todavia_no', 'esta_vacio'],
  sin_reservorio: ['todavia_no'],
  callan: [],
};

function vecino(
  nombre: string,
  n: number,
  sector: Sector,
  riego: string,
  ficha: Partial<Parcela> = {},
): { productor: Productor; parcela: Parcela } {
  const id = nombre.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
  return {
    productor: {
      id: `P-${id}`,
      nombre,
      telefono: `+51 900 000 ${String(n).padStart(3, '0')}`,
      consentimiento: true,
      ficticio: true,
    },
    parcela: {
      id: `PA-${id}`,
      productorId: `P-${id}`,
      alias: `Chacra de ${nombre}`,
      sector,
      proximoRiego: riego,
      riegoPendiente: true,
      tieneReservorio: false,
      reservorioEstado: 'desconocido',
      relleno: true,
      ...ficha,
    },
  };
}

const FICHA: Record<Grupo, Partial<Parcela>> = {
  regaron: {},
  alternativa: { tieneReservorio: true, reservorioEstado: 'con_agua', planAprobado: PLAN },
  vacio: { tieneReservorio: true, reservorioEstado: 'con_agua' },
  sin_reservorio: {},
  callan: {},
};

/** Un corte anterior que Rosa resolvió: es lo que Diego ve como antecedente. */
function antecedenteRosa(inicio: string): Caso {
  const hace = enDia(inicio, -21, 10);
  return {
    id: 'C-ANTERIOR-ROSA',
    parcelaId: 'PA-ROSA',
    eventoId: 'EV-CORTE-ANTERIOR',
    tema: 'agua',
    estado: 'cerrado',
    prioridad: 'baja',
    responsable: INGENIERO,
    respuestas: {},
    motivo: 'Corte anterior: regó con el agua de su reservorio',
    creadoEn: hace,
    actualizadoEn: hace,
    conteoNoSe: 0,
    situacion: 'ya_rego',
  };
}

/**
 * El escenario se construye pasando por el motor real, igual que en una corrida:
 * las cifras de los paneles salen de estos casos y no están escritas en ninguna pantalla.
 */
export function crearEstadoDemo(inicio: string = inicioDemo()): Estado {
  const riego = enDia(inicio, 1, 6);
  const emitido = enDia(inicio, 0, 7);
  const vecinos = VECINOS.map(([nombre, grupo], i) => ({
    grupo,
    ...vecino(nombre, 10 + i, 'Bajo', riego, FICHA[grupo]),
  }));
  const otros = [
    vecino('Mateo', 60, 'Alto', riego),
    vecino('Úrsula', 61, 'Medio', riego),
    vecino('Wilmer', 62, 'Cabecera', riego),
  ];

  const base = crearEstadoInicial(inicio);
  let e: Estado = {
    ...base,
    productores: [...base.productores, ...vecinos.map((v) => v.productor), ...otros.map((o) => o.productor)],
    parcelas: [...base.parcelas, ...vecinos.map((v) => v.parcela), ...otros.map((o) => o.parcela)],
    casos: [antecedenteRosa(inicio)],
  };

  const aviso: EventoAgua = {
    ...eventoCorte(inicio),
    emitidoEn: emitido,
    descripcion: 'Interrupción de agua en el sector Bajo (aviso ficticio)',
  };
  e = aplicar(e, procesarEvento(e, aviso, emitido));

  vecinos.forEach((v, i) => {
    const hora = sumarHoras(emitido, (5 + i * 2) / 60);
    for (const respuesta of RESPUESTAS[v.grupo]) {
      const caso = e.casos.find((c) => c.parcelaId === v.parcela.id && c.paso);
      if (caso) e = aplicar(e, procesarRespuesta(e, caso.id, respuesta, hora));
    }
  });

  // Seis reportes parecidos: tres del mismo sector. El motor no los diagnostica.
  const reportes: [string, string][] = [
    ['PA-JUAN', 'esta_semana'],
    ['PA-ELENA', 'esta_semana'],
    ['PA-MATEO', 'mas_tiempo'],
    ['PA-ALBERTO', 'esta_semana'],
    ['PA-URSULA', 'mas_tiempo'],
    ['PA-WILMER', 'no_se'],
  ];
  reportes.forEach(([parcelaId, desde], i) => {
    const hora = sumarHoras(emitido, 0.2 + i * 0.2);
    e = aplicar(e, iniciarConsulta(e, parcelaId, 'plaga', hora));
    const caso = e.casos.find((c) => c.parcelaId === parcelaId && c.paso);
    if (caso) e = aplicar(e, procesarRespuesta(e, caso.id, desde, hora));
  });

  return { ...e, lineaBase: resumenAgua(e) };
}

export function eventoCorte(inicio: string): EventoAgua {
  return {
    id: 'EV-CORTE-BAJO',
    tipo: 'corte',
    origen: 'comision_regantes',
    fuenteVerificada: true,
    sector: 'Bajo',
    fechaAfectada: fechaLocal(enDia(inicio, 1, 12)),
    emitidoEn: inicio,
    vigenteHasta: enDia(inicio, 1, 18),
    descripcion: 'Corte del canal en el sector Bajo',
  };
}

export function eventoCaudalAlto(inicio: string): EventoAgua {
  return {
    ...eventoCorte(inicio),
    id: 'EV-CAUDAL-ALTO',
    tipo: 'reduccion_caudal',
    sector: 'Alto',
    descripcion: 'Reducción de caudal en el sector Alto',
  };
}

/** Ya venció respecto al reloj actual de la demo. */
export function eventoVencido(ahora: string): EventoAgua {
  return {
    ...eventoCorte(ahora),
    id: 'EV-VENCIDO',
    emitidoEn: sumarHoras(ahora, -26),
    fechaAfectada: fechaLocal(sumarHoras(ahora, -24)),
    vigenteHasta: sumarHoras(ahora, -2),
    descripcion: 'Aviso antiguo de corte en el sector Bajo',
  };
}

export function eventoSinFuente(ahora: string): EventoAgua {
  return {
    ...eventoCorte(ahora),
    id: 'EV-SIN-FUENTE',
    origen: 'reporte_productor',
    fuenteVerificada: false,
    emitidoEn: ahora,
    descripcion: 'Rumor de corte en el sector Bajo, sin confirmar',
  };
}
