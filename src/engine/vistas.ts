import { diaRelativo, formatoHora, ordenarCasos } from './engine';
import { puede, type Perfil } from './permisos';
import type {
  Barrera,
  Caso,
  Estado,
  EventoAgua,
  Mensaje,
  NecesidadId,
  NotaCoordinacion,
  ResumenAgua,
  Sector,
} from './types';

/** Lecturas del estado compartido. Rosa, Diego y Lucía miran los mismos datos, con permisos distintos. */

export const eventoPrincipal = (estado: Estado): EventoAgua | undefined => estado.eventos[0];

/** Una parcela sin dato cuenta como "sin respuesta": nunca como resuelta. */
export function resumenAgua(estado: Estado, eventoId = eventoPrincipal(estado)?.id): ResumenAgua {
  const casos = estado.casos.filter((c) => c.eventoId === eventoId);
  const contar = (situacion: Caso['situacion']) => casos.filter((c) => c.situacion === situacion).length;
  return {
    total: casos.length,
    yaRegaron: contar('ya_rego'),
    conAlternativa: contar('con_alternativa'),
    sinAlternativa: contar('sin_alternativa'),
    sinRespuesta: contar(undefined),
  };
}

// ---------- Especialista ----------

const ESTADOS_POR_ATENDER: Caso['estado'][] = ['revision_tecnica', 'en_revision', 'seguimiento_programado'];

function porAtender(c: Caso): boolean {
  if (ESTADOS_POR_ATENDER.includes(c.estado)) return true;
  if (c.estado === 'vencido') return c.tema !== 'pago';
  return c.estado === 'seguimiento_pendiente' && !c.paso; // el productor contó que no pudo
}

/** Derivado después de abrir la demo y sin tomar todavía. */
export const casoNuevo = (estado: Estado, c: Caso) =>
  c.estado === 'revision_tecnica' && new Date(c.actualizadoEn).getTime() >= new Date(estado.inicio).getTime();

const PESO_BANDEJA: Partial<Record<Caso['estado'], number>> = {
  en_revision: 1,
  revision_tecnica: 2,
  vencido: 2,
};

/** Lo nuevo primero, luego lo que Diego tiene entre manos. Los reportes relacionados van en su propio grupo. */
export function bandejaEspecialista(estado: Estado, perfil: Perfil): Caso[] {
  if (!puede(perfil, 'ver_casos')) return [];
  const agrupados = reportesRelacionados(estado, perfil).casos.map((c) => c.id);
  const peso = (c: Caso) => (casoNuevo(estado, c) ? 0 : (PESO_BANDEJA[c.estado] ?? 3));
  return estado.casos
    .filter((c) => porAtender(c) && !agrupados.includes(c.id))
    .sort(
      (a, b) =>
        peso(a) - peso(b) || new Date(b.actualizadoEn).getTime() - new Date(a.actualizadoEn).getTime(),
    );
}

export function todosLosCasos(estado: Estado, perfil: Perfil): Caso[] {
  return puede(perfil, 'ver_casos') ? ordenarCasos(estado.casos) : [];
}

export interface GrupoSector {
  sector: Sector | null;
  casos: Caso[];
}

export interface ReportesRelacionados {
  casos: Caso[];
  sectores: GrupoSector[]; // el sector con más reportes primero
}

function sectorDeCaso(estado: Estado, c: Caso): Sector | null {
  return estado.parcelas.find((p) => p.id === c.parcelaId)?.sector ?? null;
}

/** Junta reportes parecidos para revisarlos a la vez. Solo cuenta: no afirma una causa común. */
function agruparReportes(estado: Estado): ReportesRelacionados {
  const casos = estado.casos.filter((c) => c.tema === 'plaga' && porAtender(c));
  if (casos.length < 2) return { casos: [], sectores: [] };
  const sectores = new Map<Sector | null, Caso[]>();
  for (const c of casos) {
    const sector = sectorDeCaso(estado, c);
    sectores.set(sector, [...(sectores.get(sector) ?? []), c]);
  }
  return {
    casos,
    sectores: [...sectores]
      .map(([sector, lista]) => ({ sector, casos: lista }))
      .sort((a, b) => b.casos.length - a.casos.length),
  };
}

export function reportesRelacionados(estado: Estado, perfil: Perfil): ReportesRelacionados {
  return puede(perfil, 'ver_casos') ? agruparReportes(estado) : { casos: [], sectores: [] };
}

export interface LineaHistorial {
  id: string;
  hora: string;
  quien: string;
  texto: string;
}

const QUIEN: Record<Mensaje['de'], string> = { kusi: 'KUSI', agronomo: 'Diego', productor: '' };

/** La historia del caso, para no reconstruir la conversación desde cero. */
export function historialCaso(estado: Estado, casoId: string, perfil: Perfil): LineaHistorial[] {
  if (!puede(perfil, 'ver_conversacion_de_caso')) return [];
  const caso = estado.casos.find((c) => c.id === casoId);
  const parcela = estado.parcelas.find((p) => p.id === caso?.parcelaId);
  const productor = estado.productores.find((p) => p.id === parcela?.productorId);
  return estado.mensajes
    .filter((m) => m.casoId === casoId)
    .map((m) => ({
      id: m.id,
      hora: m.hora,
      quien: m.de === 'productor' ? (productor?.nombre ?? 'Productor') : QUIEN[m.de],
      texto: m.texto,
    }));
}

/** Casos cerrados de la misma parcela: la memoria individual. */
export function antecedentes(estado: Estado, caso: Caso, perfil: Perfil): Caso[] {
  if (!puede(perfil, 'ver_casos')) return [];
  return estado.casos.filter((c) => c.parcelaId === caso.parcelaId && c.id !== caso.id && c.estado === 'cerrado');
}

// ---------- Organización ----------

export const BARRERA: Record<Barrera, string> = {
  reservorio_vacio: 'Reservorio vacío',
  sin_reservorio: 'Sin reservorio',
  no_confirmado: 'Sin confirmar',
};

export interface Necesidad {
  id: NecesidadId;
  cantidad: number;
  titulo: string;
  detalle: string[];
}

export interface VistaOrganizacion {
  sector?: Sector;
  dia?: string;
  resumen: ResumenAgua;
  frase: string;
  necesidades: Necesidad[];
  notas: NotaCoordinacion[];
}

const parcelas = (n: number) => `${n} ${n === 1 ? 'parcela' : 'parcelas'}`;

/** Solo cifras agregadas: ni nombres, ni teléfonos, ni conversaciones. */
export function vistaOrganizacion(estado: Estado): VistaOrganizacion {
  const evento = eventoPrincipal(estado);
  const resumen = resumenAgua(estado);
  const sinAgua = estado.casos.filter((c) => c.eventoId === evento?.id && c.situacion === 'sin_alternativa');
  const enAtencion = sinAgua.filter((c) =>
    ['en_revision', 'seguimiento_programado', 'seguimiento_pendiente'].includes(c.estado),
  ).length;
  const cerrados = sinAgua.filter((c) => c.estado === 'cerrado').length;
  const porRevisar = sinAgua.length - enAtencion - cerrados;

  const barreras = (Object.keys(BARRERA) as Barrera[])
    .map((b) => ({ texto: BARRERA[b], n: sinAgua.filter((c) => c.barrera === b).length }))
    .filter((b) => b.n > 0)
    .map((b) => `${b.texto}: ${b.n}`)
    .join(' · ');

  const reportes = agruparReportes(estado);
  const mayor = reportes.sectores[0];
  const turno = estado.parcelas.find((p) => p.sector === evento?.sector && p.proximoRiego)?.proximoRiego;

  const necesidades: Necesidad[] = [
    {
      id: 'sin_alternativa',
      cantidad: resumen.sinAlternativa,
      titulo: `${parcelas(resumen.sinAlternativa)} sin alternativa de agua`,
      detalle: [
        `${porRevisar} por revisar · ${enAtencion} en atención del especialista${cerrados ? ` · ${cerrados} cerradas` : ''}`,
        barreras,
      ].filter(Boolean),
    },
    {
      id: 'sin_respuesta',
      cantidad: resumen.sinRespuesta,
      titulo: `${parcelas(resumen.sinRespuesta)} sin responder`,
      detalle: [
        'No sabemos si regaron. No cuentan como resueltas.',
        ...(turno ? [`Su turno de riego es ${diaRelativo(turno, estado.ahora)} ${formatoHora(turno)}`] : []),
      ],
    },
    {
      id: 'reportes',
      cantidad: reportes.casos.length,
      titulo: `${reportes.casos.length} reportes de cambios en hojas o ramas`,
      detalle: [
        ...(mayor?.sector ? [`${mayor.casos.length} son del sector ${mayor.sector}.`] : []),
        'El especialista los revisa juntos. Todavía no hay una causa confirmada.',
      ],
    },
  ];

  const faltan = `${resumen.sinAlternativa} ${resumen.sinAlternativa === 1 ? 'parcela reporta' : 'parcelas reportan'} no tener una alternativa de agua`;
  const callan = `${resumen.sinRespuesta} todavía no ${resumen.sinRespuesta === 1 ? 'ha respondido' : 'han respondido'}`;

  return {
    sector: evento?.sector,
    dia: evento ? diaRelativo(evento.fechaAfectada, estado.ahora) : undefined,
    resumen,
    frase: `${faltan} y ${callan}.`,
    necesidades: necesidades.filter((n) => n.cantidad > 0),
    notas: estado.coordinacion,
  };
}

// ---------- Agricultor ----------

export interface EstadoSolicitud {
  titulo: string;
  detalle: string;
}

/** Lo único que Rosa necesita saber de su caso, en sus palabras. */
export function estadoSolicitud(estado: Estado, parcelaId: string): EstadoSolicitud | null {
  const caso = [...estado.casos]
    .filter((c) => c.parcelaId === parcelaId)
    .sort((a, b) => new Date(a.actualizadoEn).getTime() - new Date(b.actualizadoEn).getTime())
    .pop();
  if (!caso) return null;
  const cuando = caso.plazo ? `${diaRelativo(caso.plazo, estado.ahora)} ${formatoHora(caso.plazo)}` : '';

  switch (caso.estado) {
    case 'revision_tecnica':
      return { titulo: 'Enviado al especialista', detalle: 'Te avisaremos cuando haya una respuesta.' };
    case 'en_revision':
      return { titulo: 'En revisión', detalle: 'Diego está revisando tu caso.' };
    case 'seguimiento_programado':
      return { titulo: 'Diego respondió', detalle: `Seguimiento ${cuando}` };
    case 'accion_sugerida':
      return { titulo: 'Seguimiento programado', detalle: `Te preguntaremos ${cuando}` };
    case 'vencido':
      return { titulo: 'Sin respuesta todavía', detalle: 'Si aún necesitas ayuda, pide hablar con una persona.' };
    case 'cerrado':
      return { titulo: 'Caso cerrado', detalle: 'Queda guardado en tu historial.' };
    default:
      return null; // está esperando su respuesta: la pregunta ya está en el chat
  }
}

// ---------- Historia de la demo ----------

export type EtapaHistoria = 'aviso' | 'respondiendo' | 'derivado' | 'en_revision' | 'respondido' | 'sin_derivar';

/** En qué punto va el caso de Rosa. Sale del estado real, no de una secuencia guionizada. */
export function etapaHistoria(estado: Estado): EtapaHistoria {
  const caso = estado.casos.find((c) => c.parcelaId === 'PA-ROSA' && c.eventoId === eventoPrincipal(estado)?.id);
  if (!caso) return 'aviso';
  if (caso.estado === 'pendiente_respuesta') return Object.keys(caso.respuestas).length ? 'respondiendo' : 'aviso';
  if (caso.estado === 'revision_tecnica') return 'derivado';
  if (caso.estado === 'en_revision') return 'en_revision';
  if (caso.situacion === 'sin_alternativa') return 'respondido';
  return 'sin_derivar';
}
