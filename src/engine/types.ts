export type Sector = 'Bajo' | 'Alto' | 'Medio' | 'Cabecera';

export interface Productor {
  id: string;
  nombre: string;
  telefono: string;
  consentimiento: boolean;
  ficticio?: boolean; // en esta demo, todas las personas son inventadas
}

export type ReservorioEstado = 'con_agua' | 'vacio' | 'desconocido';

/** Fecha que registra el productor. KUSI recuerda; no cobra ni se conecta con bancos. */
export interface Cuota {
  concepto: string;
  vence: string; // ISO datetime
  pagada: boolean;
  avisos: number[]; // días de anticipación ya recordados
}

export interface Parcela {
  id: string;
  productorId: string;
  alias: string;
  sector: Sector | null; // null: el productor no lo sabe; no se rellena
  proximoRiego: string; // ISO datetime; vacío si el turno no está confirmado
  riegoPendiente: boolean;
  tieneReservorio: boolean;
  reservorioEstado: ReservorioEstado;
  planAprobado?: string; // texto del paso acordado con el agrónomo
  cuota?: Cuota;
  relleno?: boolean; // parcela sintética del escenario: no aparece como perfil de la demo
}

export interface EventoAgua {
  id: string;
  tipo: 'corte' | 'reduccion_caudal';
  origen: 'comision_regantes' | 'reporte_productor';
  fuenteVerificada: boolean;
  sector: Sector;
  fechaAfectada: string; // ISO date (AAAA-MM-DD)
  emitidoEn: string; // ISO datetime
  vigenteHasta: string; // ISO datetime
  descripcion: string;
}

export interface Regla {
  id: string;
  version: number;
  nombre: string;
  aprobadaPor: string;
  activa: boolean; // interruptor
  vigenteDesde: string;
  vigenteHasta: string;
  descripcion: string; // en lenguaje simple, visible en el panel
}

export type EstadoCaso =
  | 'pendiente_respuesta'
  | 'accion_sugerida'
  | 'revision_tecnica' // derivado: espera que el especialista lo tome
  | 'en_revision' // el especialista lo tomó
  | 'seguimiento_programado' // el especialista respondió y fijó fecha
  | 'seguimiento_pendiente'
  | 'cerrado'
  | 'vencido'
  | 'bloqueado';

export type Prioridad = 'alta' | 'media' | 'baja';

/** Pregunta que el caso espera que el productor conteste. */
export type PasoConversacion =
  | 'inicial'
  | 'confirmar_turno'
  | 'reservorio'
  | 'seguimiento'
  | 'plaga_desde'
  | 'dano_personas'
  | 'dano_que'
  | 'pago';

/** Motivo de la consulta. */
export type Tema = 'agua' | 'plaga' | 'dano' | 'pago' | 'persona';

/** Qué dijo el productor sobre el agua. Sin dato, la parcela cuenta como "sin respuesta". */
export type SituacionAgua = 'ya_rego' | 'con_alternativa' | 'sin_alternativa';

/** Por qué no tiene alternativa. Es lo que la organización ve en conjunto. */
export type Barrera = 'reservorio_vacio' | 'sin_reservorio' | 'no_confirmado';

export interface Caso {
  id: string;
  parcelaId: string;
  eventoId: string;
  tema: Tema;
  estado: EstadoCaso;
  prioridad: Prioridad;
  plazo?: string; // ISO datetime
  responsable: string;
  respuestas: Record<string, string>;
  motivo: string; // por qué está en este estado
  creadoEn: string;
  actualizadoEn: string;
  paso?: PasoConversacion; // sin paso: el caso no espera botones del productor
  conteoNoSe: number;
  reglaId?: string; // última regla aplicada
  reglaVersion?: number;
  situacion?: SituacionAgua;
  barrera?: Barrera;
}

export interface BotonRespuesta {
  id: string;
  etiqueta: string;
}

export interface Mensaje {
  id: string;
  parcelaId: string;
  casoId?: string;
  de: 'kusi' | 'productor' | 'agronomo';
  texto: string;
  botones?: BotonRespuesta[];
  estadoEnvio: 'enviado' | 'entregado' | 'respondido'; // distinto del estado del caso
  hora: string;
}

export interface EntradaAuditoria {
  id: string;
  hora: string;
  tipo: 'evento' | 'validacion' | 'regla' | 'mensaje' | 'caso' | 'bloqueo' | 'configuracion';
  reglaId?: string;
  reglaVersion?: number;
  datosUsados: Record<string, unknown>;
  resultado: string;
  responsable: string; // "Sistema" | "Ing. Responsable (demo)" | "Jurado (demo)"
}

export type PasoRegistro =
  | 'inicio'
  | 'consentimiento'
  | 'nombre'
  | 'alias'
  | 'sector'
  | 'reservorio'
  | 'turno'
  | 'confirmar'
  | 'completo'
  | 'rechazado';

/** Conversación de alta de un número nuevo. Nada pasa a la ficha hasta confirmar. */
export interface Registro {
  paso: PasoRegistro;
  nombre?: string;
  alias?: string;
  sector?: Sector | null;
  tieneReservorio?: boolean;
  proximoRiego?: string | null;
}

export interface EventoBloqueado {
  evento: EventoAgua;
  motivo: string;
  hora: string;
  porReglaSuspendida?: boolean; // se puede reenviar al reactivar la regla
}

/** Distribución de las parcelas afectadas por un aviso. Siempre se calcula desde los casos. */
export interface ResumenAgua {
  total: number;
  yaRegaron: number;
  conAlternativa: number;
  sinAlternativa: number;
  sinRespuesta: number;
}

export type NecesidadId = 'sin_alternativa' | 'sin_respuesta' | 'reportes';

/** Nota de la organización. Es un pendiente: no afirma que algo se haya coordinado. */
export interface NotaCoordinacion {
  id: string;
  necesidad: NecesidadId;
  detalle: string;
  hora: string;
}

/** Todo el estado de la demo. Serializable: en el piloto vive en la base de datos. */
export interface Estado {
  inicio: string; // hora simulada al reiniciar la demo
  ahora: string; // reloj simulado
  seq: number; // contador para ids deterministas
  productores: Productor[];
  parcelas: Parcela[];
  reglas: Regla[];
  eventos: EventoAgua[]; // avisos válidos ya procesados
  eventosBloqueados: EventoBloqueado[];
  casos: Caso[];
  mensajes: Mensaje[];
  auditoria: EntradaAuditoria[];
  registro: Registro;
  coordinacion: NotaCoordinacion[];
  lineaBase?: ResumenAgua; // cómo arrancó el escenario, para mostrar qué cambió
}

export interface Resultado {
  nuevoEstado: Estado;
  auditoria: EntradaAuditoria[];
}
