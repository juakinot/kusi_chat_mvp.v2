export type Sector = 'Bajo' | 'Alto';

export interface Productor {
  id: string;
  nombre: string;
  telefono: string;
  consentimiento: boolean;
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
  sector: Sector;
  proximoRiego: string; // ISO datetime
  riegoPendiente: boolean;
  tieneReservorio: boolean;
  reservorioEstado: ReservorioEstado;
  planAprobado?: string; // texto del paso acordado con el agrónomo
  cuota?: Cuota;
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
  | 'revision_tecnica'
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

export interface EventoBloqueado {
  evento: EventoAgua;
  motivo: string;
  hora: string;
  porReglaSuspendida?: boolean; // se puede reenviar al reactivar la regla
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
}

export interface Resultado {
  nuevoEstado: Estado;
  auditoria: EntradaAuditoria[];
}
