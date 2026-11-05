import type {
  BotonRespuesta,
  Caso,
  EntradaAuditoria,
  Estado,
  EventoAgua,
  Mensaje,
  Parcela,
  PasoConversacion,
  PasoRegistro,
  Prioridad,
  Regla,
  Registro,
  ReservorioEstado,
  Resultado,
  Sector,
  Tema,
} from './types';

export const SISTEMA = 'Sistema';
export const INGENIERO = 'Ing. Responsable (demo)';
export const JURADO = 'Jurado (demo)';
export const SIN_EVENTO = 'SIN-EVENTO';
export const PARCELA_NUEVA = 'PA-NUEVO';
const PRODUCTOR_NUEVO = 'P-NUEVO';
export const MOTIVO_REGLA_SUSPENDIDA = 'Regla suspendida por el agrónomo';
export const TEXTO_SOLO_BOTONES =
  'Por ahora responde con los botones o escribe PERSONA para hablar con alguien.';

export const BOTONES: Record<PasoConversacion, BotonRespuesta[]> = {
  inicial: [
    { id: 'ya_regue', etiqueta: 'Ya regué' },
    { id: 'todavia_no', etiqueta: 'Todavía no' },
    { id: 'no_se', etiqueta: 'No sé' },
  ],
  confirmar_turno: [
    { id: 'si_recibio', etiqueta: 'Sí recibió' },
    { id: 'no_recibio', etiqueta: 'No recibió' },
    { id: 'no_se', etiqueta: 'No sé' },
  ],
  reservorio: [
    { id: 'si_agua', etiqueta: 'Sí, tiene agua' },
    { id: 'esta_vacio', etiqueta: 'Está vacío' },
    { id: 'no_se', etiqueta: 'No sé' },
  ],
  seguimiento: [
    { id: 'si_pude', etiqueta: 'Sí pude' },
    { id: 'no_pude', etiqueta: 'No pude' },
    { id: 'necesito_persona', etiqueta: 'Necesito una persona' },
  ],
  plaga_desde: [
    { id: 'esta_semana', etiqueta: 'Esta semana' },
    { id: 'mas_tiempo', etiqueta: 'Hace más tiempo' },
    { id: 'no_se', etiqueta: 'No sé' },
  ],
  dano_personas: [
    { id: 'si_personas', etiqueta: 'Sí' },
    { id: 'no_personas', etiqueta: 'No' },
  ],
  dano_que: [
    { id: 'dano_canal', etiqueta: 'El canal o la toma' },
    { id: 'dano_arboles', etiqueta: 'Los árboles' },
    { id: 'dano_reservorio', etiqueta: 'Mi reservorio' },
  ],
  pago: [
    { id: 'ya_pague', etiqueta: 'Ya pagué' },
    { id: 'pago_no', etiqueta: 'Todavía no' },
  ],
};

export const MENU: BotonRespuesta[] = [
  { id: 'plaga', etiqueta: 'Vi una plaga' },
  { id: 'dano', etiqueta: 'Daño en la chacra' },
  { id: 'menos_agua', etiqueta: 'Llega menos agua' },
  { id: 'cuota', etiqueta: 'Mi cuota de agua' },
];

const BOTONES_REGISTRO: Partial<Record<PasoRegistro, BotonRespuesta[]>> = {
  consentimiento: [
    { id: 'acepta', etiqueta: 'Sí' },
    { id: 'rechaza', etiqueta: 'No' },
    { id: 'saber_mas', etiqueta: 'Quiero saber más' },
  ],
  sector: [
    { id: 'Bajo', etiqueta: 'Bajo' },
    { id: 'Alto', etiqueta: 'Alto' },
    { id: 'no_se', etiqueta: 'No sé' },
  ],
  reservorio: [
    { id: 'si', etiqueta: 'Sí' },
    { id: 'no', etiqueta: 'No' },
  ],
  turno: [
    { id: 'manana', etiqueta: 'Mañana 6:00 a. m.' },
    { id: 'pasado', etiqueta: 'Pasado mañana 6:00 a. m.' },
    { id: 'no_se', etiqueta: 'No sé' },
  ],
  confirmar: [
    { id: 'correcto', etiqueta: 'Sí, está bien' },
    { id: 'corregir', etiqueta: 'Corregir' },
  ],
};

/** Las opciones dependen de la ficha: quien no tiene reservorio no lo ve en la lista. */
export function botonesPara(paso: PasoConversacion, parcela: Parcela): BotonRespuesta[] {
  if (paso === 'dano_que' && !parcela.tieneReservorio) {
    return BOTONES.dano_que.filter((b) => b.id !== 'dano_reservorio');
  }
  return BOTONES[paso];
}

// ---------- Fechas (hora local) ----------

const MS_HORA = 3_600_000;

export function sumarHoras(iso: string, horas: number): string {
  return new Date(new Date(iso).getTime() + horas * MS_HORA).toISOString();
}

/** Mismo día que `iso` más `dias`, a la hora indicada. */
export function enDia(iso: string, dias: number, hora: number, minuto = 0): string {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias, hora, minuto).toISOString();
}

export function fechaLocal(iso: string): string {
  const d = new Date(iso);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function formatoHora(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${min} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/** "hoy", "mañana", "ayer" o la fecha, según el reloj de la demo. */
export function diaRelativo(fecha: string, ahora: string): string {
  const objetivo = fecha.length === 10 ? fecha : fechaLocal(fecha);
  if (objetivo === fechaLocal(ahora)) return 'hoy';
  if (objetivo === fechaLocal(enDia(ahora, 1, 12))) return 'mañana';
  if (objetivo === fechaLocal(enDia(ahora, -1, 12))) return 'ayer';
  return `el ${objetivo.split('-').reverse().join('/')}`;
}

const despues = (a: string, b: string) => new Date(a).getTime() > new Date(b).getTime();

/** Días de calendario que faltan para `iso`. */
export function diasHasta(iso: string, ahora: string): number {
  const dia = (x: string) => {
    const d = new Date(x);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };
  return Math.round((dia(iso) - dia(ahora)) / 86_400_000);
}

const DIA_SEMANA = new Intl.DateTimeFormat('es-PE', { weekday: 'long' });

/** "hoy", "mañana" o "el domingo". */
function cuandoVence(iso: string, ahora: string): string {
  const dias = diasHasta(iso, ahora);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  return `el ${DIA_SEMANA.format(new Date(iso))}`;
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

// ---------- Transacción: acumula cambios y auditoría sin mutar la entrada ----------

type NuevaEntrada = Omit<EntradaAuditoria, 'id' | 'hora' | 'responsable'> & { responsable?: string };

function transaccion(estado: Estado, ahora: string) {
  let s = estado;
  const auditoria: EntradaAuditoria[] = [];

  const nuevoId = (prefijo: string) => {
    s = { ...s, seq: s.seq + 1 };
    return `${prefijo}-${s.seq}`;
  };

  const t = {
    get estado() {
      return s;
    },
    nuevoId,
    audit(e: NuevaEntrada) {
      auditoria.push({ responsable: SISTEMA, ...e, id: nuevoId('A'), hora: ahora });
    },
    auditRegla(
      regla: Regla,
      datosUsados: Record<string, unknown>,
      resultado: string,
      tipo: EntradaAuditoria['tipo'] = 'regla',
    ) {
      t.audit({ tipo, reglaId: regla.id, reglaVersion: regla.version, datosUsados, resultado });
    },
    mensaje(m: Pick<Mensaje, 'parcelaId' | 'de' | 'texto'> & Partial<Pick<Mensaje, 'casoId' | 'botones'>>) {
      const nuevo: Mensaje = { ...m, id: nuevoId('M'), estadoEnvio: 'entregado', hora: ahora };
      s = { ...s, mensajes: [...s.mensajes, nuevo] };
      if (m.de !== 'productor') {
        t.audit({
          tipo: 'mensaje',
          datosUsados: { parcelaId: m.parcelaId, casoId: m.casoId },
          resultado: `Mensaje enviado a ${nombreDe(s, m.parcelaId)}: "${resumen(m.texto)}"`,
          responsable: m.de === 'agronomo' ? INGENIERO : SISTEMA,
        });
      }
    },
    caso(id: string, parche: Partial<Caso>) {
      s = {
        ...s,
        casos: s.casos.map((c) => (c.id === id ? { ...c, ...parche, actualizadoEn: ahora } : c)),
      };
    },
    parcela(id: string, parche: Partial<Parcela>) {
      s = { ...s, parcelas: s.parcelas.map((p) => (p.id === id ? { ...p, ...parche } : p)) };
    },
    /** Quita los botones vigentes del caso: una pregunta se contesta una sola vez. */
    cerrarBotones(casoId: string, marcarRespondido: boolean) {
      s = {
        ...s,
        mensajes: s.mensajes.map((m) =>
          m.casoId === casoId && m.botones
            ? { ...m, botones: undefined, estadoEnvio: marcarRespondido ? 'respondido' : m.estadoEnvio }
            : m,
        ),
      };
    },
    /** Quita el menú anterior de la parcela. */
    cerrarMenu(parcelaId: string) {
      s = {
        ...s,
        mensajes: s.mensajes.map((m) =>
          m.parcelaId === parcelaId && m.botones && !m.casoId ? { ...m, botones: undefined } : m,
        ),
      };
    },
    set(parche: Partial<Estado>) {
      s = { ...s, ...parche };
    },
    fin(): Resultado {
      return { nuevoEstado: s, auditoria };
    },
  };
  return t;
}

type Tx = ReturnType<typeof transaccion>;

const resumen = (texto: string) => (texto.length > 70 ? `${texto.slice(0, 70)}…` : texto);

function nombreDe(estado: Estado, parcelaId: string): string {
  const parcela = estado.parcelas.find((p) => p.id === parcelaId);
  return estado.productores.find((p) => p.id === parcela?.productorId)?.nombre ?? 'productor';
}

const sectorDe = (parcela: Parcela) => parcela.sector ?? 'sin confirmar';

function tieneConsentimiento(estado: Estado, parcela: Parcela): boolean {
  return estado.productores.some((p) => p.id === parcela.productorId && p.consentimiento);
}

function regla(estado: Estado, id: string): Regla {
  const r = estado.reglas.find((x) => x.id === id);
  if (!r) throw new Error(`Regla desconocida: ${id}`);
  return r;
}

/** null si la regla se puede aplicar; si no, el motivo. */
function reglaNoDisponible(r: Regla, ahora: string): string | null {
  if (!r.activa) return MOTIVO_REGLA_SUSPENDIDA;
  if (despues(r.vigenteDesde, ahora) || despues(ahora, r.vigenteHasta)) return 'Regla fuera de vigencia';
  return null;
}

/** Aplica el nuevo estado del motor junto con su auditoría. Lo usan el store y las pruebas. */
export function aplicar(estado: Estado, r: Resultado): Estado {
  return { ...r.nuevoEstado, auditoria: [...estado.auditoria, ...r.auditoria] };
}

// ---------- 1. Validación ----------

export function validarEvento(evento: EventoAgua, ahora: string): { valido: boolean; motivo: string } {
  if (evento.fuenteVerificada !== true) return { valido: false, motivo: 'Fuente sin verificar' };
  if (!evento.sector) return { valido: false, motivo: 'Falta el sector afectado' };
  if (!evento.fechaAfectada) return { valido: false, motivo: 'Falta la fecha afectada' };
  if (!evento.vigenteHasta) return { valido: false, motivo: 'Falta la vigencia del aviso' };
  if (despues(ahora, evento.vigenteHasta)) {
    const hasta = `${diaRelativo(evento.vigenteHasta, ahora)} ${formatoHora(evento.vigenteHasta)}`;
    return { valido: false, motivo: `Aviso vencido (vigente hasta ${hasta})` };
  }
  return { valido: true, motivo: 'Fuente verificada y aviso vigente' };
}

// ---------- 2. Cruce por parcela ----------

export function parcelasAfectadas(evento: EventoAgua, parcelas: Parcela[]): Parcela[] {
  return parcelas.filter((p) => p.sector === evento.sector && p.riegoPendiente);
}

// ---------- 3. Evento de agua ----------

function textoAviso(evento: EventoAgua, parcela: Parcela, ahora: string): string {
  const origen =
    evento.origen === 'comision_regantes' ? 'Aviso de la Comisión de Regantes' : 'Reporte de un productor';
  const emitido = `${diaRelativo(evento.emitidoEn, ahora)} ${formatoHora(evento.emitidoEn)}`;
  const dia = diaRelativo(evento.fechaAfectada, ahora);
  const efecto = evento.tipo === 'corte' ? 'no llegará agua' : 'llegará menos agua';
  const vigencia = `${diaRelativo(evento.vigenteHasta, ahora)} ${formatoHora(evento.vigenteHasta)}`;
  return `${origen} (${emitido}): ${dia} ${efecto} al sector ${evento.sector}. ¿Ya regaste "${parcela.alias}"?\nVálido hasta ${vigencia}`;
}

/** R-AGUA-01 para una parcela: abre el caso y envía el aviso. */
function avisarParcela(t: Tx, evento: EventoAgua, parcela: Parcela, r01: Regla, ahora: string) {
  const casoId = t.nuevoId('C');
  const caso: Caso = {
    id: casoId,
    parcelaId: parcela.id,
    eventoId: evento.id,
    tema: 'agua',
    estado: 'pendiente_respuesta',
    prioridad: 'media',
    plazo: parcela.proximoRiego,
    responsable: INGENIERO,
    respuestas: {},
    motivo: 'Esperando respuesta del productor',
    creadoEn: ahora,
    actualizadoEn: ahora,
    paso: 'inicial',
    conteoNoSe: 0,
    reglaId: r01.id,
    reglaVersion: r01.version,
  };
  t.set({ casos: [...t.estado.casos, caso] });
  t.auditRegla(
    r01,
    { parcelaId: parcela.id, sector: parcela.sector, riegoPendiente: parcela.riegoPendiente },
    `Parcela de ${nombreDe(t.estado, parcela.id)} afectada: caso ${casoId} abierto`,
  );
  t.mensaje({
    parcelaId: parcela.id,
    casoId,
    de: 'kusi',
    texto: textoAviso(evento, parcela, ahora),
    botones: BOTONES.inicial,
  });
}

export function procesarEvento(estado: Estado, evento: EventoAgua, ahora: string): Resultado {
  const t = transaccion(estado, ahora);
  const datos = { eventoId: evento.id, sector: evento.sector, fuenteVerificada: evento.fuenteVerificada };

  const yaProcesado =
    estado.eventos.some((e) => e.id === evento.id) ||
    estado.eventosBloqueados.some((b) => b.evento.id === evento.id && !b.porReglaSuspendida);
  if (yaProcesado) {
    t.audit({ tipo: 'evento', datosUsados: datos, resultado: `Evento duplicado ignorado (${evento.id})` });
    return t.fin();
  }

  t.audit({ tipo: 'evento', datosUsados: datos, resultado: `Aviso recibido: ${evento.descripcion}` });

  const v = validarEvento(evento, ahora);
  if (!v.valido) {
    t.set({ eventosBloqueados: [...t.estado.eventosBloqueados, { evento, motivo: v.motivo, hora: ahora }] });
    t.audit({
      tipo: 'bloqueo',
      datosUsados: { ...datos, vigenteHasta: evento.vigenteHasta },
      resultado: `Aviso bloqueado: ${v.motivo}. No se envió ningún mensaje.`,
    });
    return t.fin();
  }
  t.audit({ tipo: 'validacion', datosUsados: datos, resultado: `Aviso válido: ${v.motivo}` });

  const r01 = regla(estado, 'R-AGUA-01');
  const noDisponible = reglaNoDisponible(r01, ahora);
  if (noDisponible) {
    t.set({
      eventosBloqueados: [
        ...t.estado.eventosBloqueados.filter((b) => b.evento.id !== evento.id),
        { evento, motivo: noDisponible, hora: ahora, porReglaSuspendida: true },
      ],
    });
    t.auditRegla(r01, datos, `Aviso bloqueado: ${noDisponible}. No se envió ningún mensaje.`, 'bloqueo');
    return t.fin();
  }

  t.set({
    eventos: [...t.estado.eventos, evento],
    eventosBloqueados: t.estado.eventosBloqueados.filter((b) => b.evento.id !== evento.id),
  });
  const afectadas = parcelasAfectadas(evento, estado.parcelas).filter((p) => tieneConsentimiento(estado, p));

  for (const parcela of estado.parcelas) {
    if (afectadas.includes(parcela)) continue;
    let razon = 'sin riego pendiente';
    if (parcela.sector !== evento.sector) razon = `sector ${sectorDe(parcela)}`;
    else if (!tieneConsentimiento(estado, parcela)) razon = 'sin consentimiento';
    t.auditRegla(
      r01,
      { parcelaId: parcela.id, sector: parcela.sector, riegoPendiente: parcela.riegoPendiente },
      `Parcela de ${nombreDe(estado, parcela.id)} no afectada (${razon})`,
    );
  }

  for (const parcela of afectadas) avisarParcela(t, evento, parcela, r01, ahora);
  return t.fin();
}

// ---------- 4. Respuestas del productor ----------

/** Plazo de revisión: hoy 7:00 p. m., siempre antes del turno de riego. */
function plazoRevision(parcela: Parcela, ahora: string): string {
  let plazo = enDia(ahora, 0, 19);
  if (!despues(plazo, ahora)) plazo = sumarHoras(ahora, 2);
  if (despues(parcela.proximoRiego, ahora) && despues(plazo, parcela.proximoRiego)) plazo = parcela.proximoRiego;
  return plazo;
}

function preguntar(t: Tx, caso: Caso, paso: PasoConversacion, texto: string, botones = BOTONES[paso]) {
  t.caso(caso.id, { paso });
  t.mensaje({ parcelaId: caso.parcelaId, casoId: caso.id, de: 'kusi', texto, botones });
}

function cerrarPorRiego(t: Tx, caso: Caso, parcela: Parcela, motivo: string) {
  t.parcela(parcela.id, { riegoPendiente: false });
  t.caso(caso.id, { estado: 'cerrado', paso: undefined, plazo: undefined, motivo });
  t.audit({ tipo: 'caso', datosUsados: { casoId: caso.id }, resultado: `Caso ${caso.id} cerrado: ${motivo}` });
  t.mensaje({
    parcelaId: caso.parcelaId,
    casoId: caso.id,
    de: 'kusi',
    texto: 'Perfecto, lo registré. Te avisaré cuando haya un nuevo turno.',
  });
}

/** Lleva el caso al agrónomo. KUSI no da instrucciones técnicas. */
function aRevision(
  t: Tx,
  caso: Caso,
  parcela: Parcela,
  ahora: string,
  motivo: string,
  r: Regla,
  datos: Record<string, unknown>,
  opciones: { prioridad?: Prioridad; texto?: (hora: string) => string } = {},
) {
  const plazo = plazoRevision(parcela, ahora);
  const prioridad = opciones.prioridad ?? 'alta';
  const hora = formatoHora(plazo);
  t.caso(caso.id, {
    estado: 'revision_tecnica',
    prioridad,
    plazo,
    paso: undefined,
    motivo,
    reglaId: r.id,
    reglaVersion: r.version,
  });
  t.auditRegla(r, { ...datos, plazo }, `Caso ${caso.id} a revisión técnica, prioridad ${prioridad}: ${motivo}`);
  t.mensaje({
    parcelaId: caso.parcelaId,
    casoId: caso.id,
    de: 'kusi',
    texto:
      opciones.texto?.(hora) ??
      `Entendido. Pasé tu caso al Ing. Responsable como prioritario. Te escribirá antes de las ${hora} Mientras tanto no necesitas hacer nada más.`,
  });
}

// ---------- Reportes del productor: plaga, daño y menos agua ----------

const ETIQUETA_REPORTE: Partial<Record<Tema, string>> = { plaga: 'plaga', dano: 'daño', agua: 'menos agua' };

function abrirCaso(t: Tx, parcela: Parcela, ahora: string, tema: Tema, plazo: string, motivo: string): Caso {
  const caso: Caso = {
    id: t.nuevoId('C'),
    parcelaId: parcela.id,
    eventoId: SIN_EVENTO,
    tema,
    estado: 'pendiente_respuesta',
    prioridad: 'media',
    plazo,
    responsable: INGENIERO,
    respuestas: {},
    motivo,
    creadoEn: ahora,
    actualizadoEn: ahora,
    conteoNoSe: 0,
  };
  t.set({ casos: [...t.estado.casos, caso] });
  return caso;
}

/** Dos reportes iguales en un sector suben a prioridad alta. No es un diagnóstico: solo cuenta casos. */
function revisarFoco(t: Tx, caso: Caso, parcela: Parcela, r: Regla) {
  const delSector = (c: Caso) =>
    t.estado.parcelas.find((p) => p.id === c.parcelaId)?.sector === parcela.sector;
  const reportes = t.estado.casos.filter(
    (c) => c.tema === caso.tema && c.eventoId === SIN_EVENTO && c.estado !== 'cerrado' && delSector(c),
  );
  if (reportes.length < 2) return;
  const nota = `${reportes.length} reportes de ${ETIQUETA_REPORTE[caso.tema]} en el sector ${sectorDe(parcela)}`;
  for (const c of reportes) {
    t.caso(c.id, { prioridad: 'alta', motivo: `${c.motivo.replace(/ · \d+ reportes.*$/, '')} · ${nota}` });
  }
  t.auditRegla(r, { sector: parcela.sector, casos: reportes.map((c) => c.id) }, `Posible foco: ${nota}`);
}

function reporteARevision(
  t: Tx,
  caso: Caso,
  parcela: Parcela,
  ahora: string,
  motivo: string,
  datos: Record<string, unknown>,
  opciones: { prioridad?: Prioridad; texto?: (hora: string) => string } = {},
) {
  const r = regla(t.estado, 'R-REP-01');
  const noDisponible = reglaNoDisponible(r, ahora);
  aRevision(t, caso, parcela, ahora, noDisponible ?? motivo, r, datos, noDisponible ? {} : opciones);
  revisarFoco(t, caso, parcela, r);
}

function reportarMenosAgua(t: Tx, parcela: Parcela, ahora: string) {
  const r = regla(t.estado, 'R-REP-01');
  const aviso = t.estado.eventos.find((e) => e.sector === parcela.sector && !despues(ahora, e.vigenteHasta));
  if (aviso) {
    t.auditRegla(
      r,
      { parcelaId: parcela.id, eventoId: aviso.id },
      `Reporte de menos agua cubierto por el aviso ${aviso.id}: no se abre caso`,
    );
    t.mensaje({
      parcelaId: parcela.id,
      de: 'kusi',
      texto: `Ya tenemos un aviso verificado para el sector ${sectorDe(parcela)}, válido hasta ${diaRelativo(aviso.vigenteHasta, ahora)} ${formatoHora(aviso.vigenteHasta)} Si tu caso es distinto, pulsa PERSONA.`,
    });
    return;
  }
  const caso = abrirCaso(t, parcela, ahora, 'agua', plazoRevision(parcela, ahora), 'Reporte de menos agua');
  reporteARevision(t, caso, parcela, ahora, 'Reporte de menos agua, sin aviso verificado', { sector: parcela.sector }, {
    prioridad: 'media',
    texto: (hora) =>
      `Recibimos tu reporte del sector ${sectorDe(parcela)}. El agrónomo lo revisará antes de las ${hora} No avisamos a otros productores hasta confirmarlo.`,
  });
}

function informarCuota(t: Tx, parcela: Parcela, ahora: string) {
  const r = regla(t.estado, 'R-AGE-01');
  const cuota = parcela.cuota;
  let texto = `No tengo una fecha de cuota registrada para "${parcela.alias}". Pulsa PERSONA si quieres registrarla.`;
  if (cuota?.pagada) texto = `Tu ${cuota.concepto} ya figura como pagada.`;
  else if (cuota) texto = `Tu ${cuota.concepto} vence ${cuandoVence(cuota.vence, ahora)}.`;
  t.auditRegla(r, { parcelaId: parcela.id, cuota: cuota ?? null }, `Consulta de cuota respondida con la ficha de ${nombreDe(t.estado, parcela.id)}`);
  t.mensaje({ parcelaId: parcela.id, de: 'kusi', texto });
}

/** Botón MENÚ del teléfono: el productor inicia la consulta. */
export function mostrarMenu(estado: Estado, parcelaId: string, ahora: string): Resultado {
  const t = transaccion(estado, ahora);
  t.cerrarMenu(parcelaId);
  t.mensaje({ parcelaId, de: 'productor', texto: 'MENÚ' });
  t.mensaje({ parcelaId, de: 'kusi', texto: '¿En qué te ayudo?', botones: MENU });
  return t.fin();
}

export function iniciarConsulta(estado: Estado, parcelaId: string, consultaId: string, ahora: string): Resultado {
  if (enRegistro(estado, parcelaId)) return responderRegistro(estado, consultaId, true, ahora);
  const t = transaccion(estado, ahora);
  const parcela = estado.parcelas.find((p) => p.id === parcelaId);
  const boton = MENU.find((b) => b.id === consultaId);
  if (!parcela || !boton) return t.fin();

  t.cerrarMenu(parcelaId);
  t.mensaje({ parcelaId, de: 'productor', texto: boton.etiqueta });
  t.audit({
    tipo: 'mensaje',
    datosUsados: { parcelaId, consultaId },
    resultado: `${nombreDe(estado, parcelaId)} consultó: "${boton.etiqueta}"`,
  });

  switch (consultaId) {
    case 'plaga': {
      const caso = abrirCaso(t, parcela, ahora, 'plaga', sumarHoras(ahora, 24), 'Reporte de plaga en curso');
      preguntar(t, caso, 'plaga_desde', `Recibí tu reporte de "${parcela.alias}". ¿Desde cuándo lo ves?`);
      break;
    }
    case 'dano': {
      const caso = abrirCaso(t, parcela, ahora, 'dano', sumarHoras(ahora, 24), 'Reporte de daño en curso');
      preguntar(t, caso, 'dano_personas', '¿Hay personas heridas o en peligro?');
      break;
    }
    case 'menos_agua':
      reportarMenosAgua(t, parcela, ahora);
      break;
    case 'cuota':
      informarCuota(t, parcela, ahora);
      break;
  }
  return t.fin();
}

/** R-AGE-01: recuerda 3 días y 1 día antes. Sin fecha registrada no se asume nada. */
export function revisarAgenda(estado: Estado, ahora: string): Resultado {
  const t = transaccion(estado, ahora);
  const r = regla(estado, 'R-AGE-01');
  const noDisponible = reglaNoDisponible(r, ahora);
  if (noDisponible) {
    t.auditRegla(r, {}, `Recordatorios bloqueados: ${noDisponible}`, 'bloqueo');
    return t.fin();
  }

  for (const parcela of estado.parcelas) {
    const nombre = nombreDe(estado, parcela.id);
    const cuota = parcela.cuota;
    const datos = { parcelaId: parcela.id, cuota: cuota ?? null };
    if (!tieneConsentimiento(estado, parcela)) {
      t.auditRegla(r, { parcelaId: parcela.id }, `${nombre} se dio de baja: no se envía nada`);
      continue;
    }
    if (!cuota) {
      t.auditRegla(r, datos, `${nombre} no registró fecha de cuota: no se envía nada`);
      continue;
    }
    if (cuota.pagada) {
      t.auditRegla(r, datos, `Cuota de ${nombre} ya pagada: no se envía nada`);
      continue;
    }
    const dias = diasHasta(cuota.vence, ahora);
    if (dias !== 3 && dias !== 1) {
      t.auditRegla(r, datos, `Cuota de ${nombre}: faltan ${dias} días, no toca recordatorio`);
      continue;
    }
    if (cuota.avisos.includes(dias)) {
      t.auditRegla(r, datos, `Recordatorio duplicado ignorado (${nombre}, ${dias} días antes)`);
      continue;
    }
    t.parcela(parcela.id, { cuota: { ...cuota, avisos: [...cuota.avisos, dias] } });
    const caso = abrirCaso(t, parcela, ahora, 'pago', cuota.vence, 'Recordatorio de cuota enviado');
    t.caso(caso.id, { prioridad: 'baja', reglaId: r.id, reglaVersion: r.version });
    t.auditRegla(r, { ...datos, dias }, `Recordatorio a ${nombre}: faltan ${dias} días`);
    preguntar(t, caso, 'pago', `${mayuscula(cuandoVence(cuota.vence, ahora))} vence tu ${cuota.concepto}. ¿Ya la pagaste?`);
  }
  return t.fin();
}

function responderPago(t: Tx, caso: Caso, parcela: Parcela, ahora: string, pagado: boolean) {
  const r = regla(t.estado, 'R-AGE-01');
  const cuota = parcela.cuota;
  const quedaRecordatorio = cuota ? diasHasta(cuota.vence, ahora) > 1 : false;
  let motivo = 'Cuota pagada según el productor';
  let texto = 'Perfecto, lo registré.';
  if (pagado && cuota) t.parcela(parcela.id, { cuota: { ...cuota, pagada: true } });
  if (!pagado) {
    motivo = quedaRecordatorio ? 'Queda el recordatorio de 1 día antes' : 'Último recordatorio entregado';
    texto = quedaRecordatorio
      ? 'Listo. Te lo recuerdo 1 día antes. KUSI no recibe pagos.'
      : 'Entendido. Si necesitas ayuda, pulsa PERSONA. KUSI no recibe pagos.';
  }
  t.caso(caso.id, { estado: 'cerrado', paso: undefined, plazo: undefined, motivo });
  t.auditRegla(r, { casoId: caso.id, pagado }, `Caso ${caso.id} cerrado: ${motivo}`);
  t.mensaje({ parcelaId: parcela.id, casoId: caso.id, de: 'kusi', texto });
}

/** R-AGUA-03: sin alternativa, el caso pasa al agrónomo. */
function sinAlternativa(
  t: Tx,
  caso: Caso,
  parcela: Parcela,
  ahora: string,
  motivo: string,
  datos: Record<string, unknown>,
) {
  const r03 = regla(t.estado, 'R-AGUA-03');
  const noDisponible = reglaNoDisponible(r03, ahora);
  aRevision(t, caso, parcela, ahora, noDisponible ?? motivo, r03, datos);
}

function preguntarReservorio(t: Tx, caso: Caso, parcela: Parcela, ahora: string) {
  if (!parcela.tieneReservorio) {
    sinAlternativa(t, caso, parcela, ahora, 'No tiene reservorio', { tieneReservorio: false });
    return;
  }
  preguntar(t, caso, 'reservorio', '¿Tu reservorio tiene agua hoy?');
}

/** R-AGUA-02: solo sugiere el plan si el dato registrado y la respuesta coinciden. */
function reservorioConAgua(t: Tx, caso: Caso, parcela: Parcela, ahora: string) {
  const datos = {
    reservorioEstado: parcela.reservorioEstado,
    tienePlan: Boolean(parcela.planAprobado),
    respuesta: 'si_agua',
  };
  const r02 = regla(t.estado, 'R-AGUA-02');
  const noDisponible = reglaNoDisponible(r02, ahora);
  if (noDisponible) {
    aRevision(t, caso, parcela, ahora, `${noDisponible} (${r02.id})`, r02, datos);
    return;
  }
  if (parcela.reservorioEstado === 'vacio') {
    sinAlternativa(t, caso, parcela, ahora, 'El productor dijo que tiene agua, pero el reservorio figura vacío', datos);
    return;
  }
  if (!parcela.planAprobado) {
    sinAlternativa(t, caso, parcela, ahora, 'No hay plan aprobado para esta parcela', datos);
    return;
  }
  t.parcela(parcela.id, { reservorioEstado: 'con_agua' });
  const plazo = enDia(ahora, 1, 19);
  t.caso(caso.id, {
    estado: 'accion_sugerida',
    prioridad: 'baja',
    plazo,
    paso: undefined,
    motivo: 'Paso del plan recordado; seguimiento programado',
    reglaId: r02.id,
    reglaVersion: r02.version,
  });
  t.auditRegla(r02, { ...datos, plazo }, `Caso ${caso.id}: se recordó el plan y se programó el seguimiento`);
  t.mensaje({
    parcelaId: caso.parcelaId,
    casoId: caso.id,
    de: 'kusi',
    texto: `Según tu plan revisado con el agrónomo: ${parcela.planAprobado.replace(/\.$/, '')}. Mañana a las ${formatoHora(plazo)} te pregunto cómo te fue.`,
  });
}

function noSabe(t: Tx, caso: Caso, parcela: Parcela, ahora: string, repregunta: () => void) {
  const conteoNoSe = caso.conteoNoSe + 1;
  t.caso(caso.id, { conteoNoSe });
  if (conteoNoSe >= 2) {
    sinAlternativa(t, caso, parcela, ahora, 'Respondió "No sé" dos veces', { conteoNoSe });
    return;
  }
  repregunta();
}

export function procesarRespuesta(estado: Estado, casoId: string, respuestaId: string, ahora: string): Resultado {
  const t = transaccion(estado, ahora);
  const caso = estado.casos.find((c) => c.id === casoId);
  const parcela = estado.parcelas.find((p) => p.id === caso?.parcelaId);
  const boton = caso?.paso ? BOTONES[caso.paso].find((b) => b.id === respuestaId) : undefined;

  if (!caso || !parcela || !boton || !caso.paso) {
    t.audit({
      tipo: 'bloqueo',
      datosUsados: { casoId, respuestaId, estadoCaso: caso?.estado },
      resultado: `Respuesta ignorada: el caso ${casoId} no espera esa respuesta`,
    });
    return t.fin();
  }

  const paso = caso.paso;
  t.cerrarBotones(caso.id, true);
  t.mensaje({ parcelaId: parcela.id, casoId: caso.id, de: 'productor', texto: boton.etiqueta });
  t.caso(caso.id, { respuestas: { ...caso.respuestas, [paso]: boton.etiqueta } });
  t.audit({
    tipo: 'mensaje',
    datosUsados: { casoId: caso.id, paso, respuestaId },
    resultado: `${nombreDe(estado, parcela.id)} respondió: "${boton.etiqueta}"`,
  });

  switch (`${paso}:${respuestaId}`) {
    case 'inicial:ya_regue':
      cerrarPorRiego(t, caso, parcela, 'El productor ya regó');
      break;
    case 'confirmar_turno:si_recibio':
      cerrarPorRiego(t, caso, parcela, 'La parcela recibió agua en el último turno');
      break;
    case 'inicial:todavia_no':
    case 'confirmar_turno:no_recibio':
      preguntarReservorio(t, caso, parcela, ahora);
      break;
    case 'inicial:no_se':
    case 'confirmar_turno:no_se':
      noSabe(t, caso, parcela, ahora, () =>
        preguntar(
          t,
          caso,
          'confirmar_turno',
          'No hay problema. ¿Puedes revisar si esa parte de tu chacra recibió agua en el último turno?',
        ),
      );
      break;
    case 'reservorio:no_se':
      noSabe(t, caso, parcela, ahora, () =>
        preguntar(t, caso, 'reservorio', 'No hay problema. ¿Puedes revisar tu reservorio y decirme si tiene agua hoy?'),
      );
      break;
    case 'reservorio:si_agua':
      reservorioConAgua(t, caso, parcela, ahora);
      break;
    case 'reservorio:esta_vacio':
      t.parcela(parcela.id, { reservorioEstado: 'vacio' });
      sinAlternativa(t, caso, parcela, ahora, 'Reservorio vacío', {
        reservorioEstado: 'vacio',
        respuesta: respuestaId,
      });
      break;
    case 'seguimiento:si_pude': {
      const r = regla(estado, 'R-SEG-01');
      t.parcela(parcela.id, { riegoPendiente: false });
      t.caso(caso.id, { estado: 'cerrado', paso: undefined, plazo: undefined, motivo: 'El productor pudo regar' });
      t.auditRegla(r, { respuesta: respuestaId }, `Caso ${caso.id} cerrado: el productor pudo regar`);
      t.mensaje({
        parcelaId: parcela.id,
        casoId: caso.id,
        de: 'kusi',
        texto: 'Perfecto, lo registré. Gracias por contarme.',
      });
      break;
    }
    case 'seguimiento:no_pude': {
      const r = regla(estado, 'R-SEG-01');
      t.caso(caso.id, { paso: undefined, plazo: undefined, prioridad: 'media', motivo: 'Barrera registrada' });
      t.auditRegla(r, { respuesta: respuestaId }, `Caso ${caso.id} sigue pendiente: barrera registrada`);
      t.mensaje({
        parcelaId: parcela.id,
        casoId: caso.id,
        de: 'kusi',
        texto: 'Gracias por contarme. Lo dejé registrado para el Ing. Responsable.',
      });
      break;
    }
    case 'seguimiento:necesito_persona':
      aRevision(t, caso, parcela, ahora, 'El productor pidió hablar con una persona', regla(estado, 'R-SEG-01'), {
        respuesta: respuestaId,
      });
      break;
    case 'plaga_desde:esta_semana':
    case 'plaga_desde:mas_tiempo':
    case 'plaga_desde:no_se':
      reporteARevision(t, caso, parcela, ahora, `Plaga observada (${boton.etiqueta.toLowerCase()})`, { desde: respuestaId }, {
        texto: (hora) =>
          `El agrónomo lo revisará y te escribirá antes de las ${hora} No apliques productos hasta que te responda.`,
      });
      break;
    case 'dano_personas:si_personas':
      aRevision(t, caso, parcela, ahora, 'Emergencia: personas en peligro', regla(estado, 'R-REP-01'), { respuesta: respuestaId }, {
        texto: () => 'Esto supera a KUSICHAT. Llama ahora a emergencias y a la municipalidad. También avisé al Ing. Responsable.',
      });
      break;
    case 'dano_personas:no_personas':
      preguntar(t, caso, 'dano_que', '¿Qué se dañó?', botonesPara('dano_que', parcela));
      break;
    case 'dano_que:dano_canal':
    case 'dano_que:dano_arboles':
      reporteARevision(t, caso, parcela, ahora, `Daño reportado: ${boton.etiqueta.toLowerCase()}`, { respuesta: respuestaId });
      break;
    case 'dano_que:dano_reservorio':
      t.parcela(parcela.id, { reservorioEstado: 'desconocido', planAprobado: undefined });
      reporteARevision(t, caso, parcela, ahora, 'Reservorio dañado: el plan queda en revisión', {
        reservorioEstado: 'desconocido',
        planAnterior: parcela.planAprobado ?? null,
      });
      break;
    case 'pago:ya_pague':
      responderPago(t, caso, parcela, ahora, true);
      break;
    case 'pago:pago_no':
      responderPago(t, caso, parcela, ahora, false);
      break;
  }
  return t.fin();
}

// ---------- Primer registro ----------

export const enRegistro = (estado: Estado, parcelaId: string) =>
  parcelaId === PARCELA_NUEVA && estado.registro.paso !== 'completo';

function resumenRegistro(r: Registro, ahora: string): string {
  const turno = r.proximoRiego ? `${diaRelativo(r.proximoRiego, ahora)} ${formatoHora(r.proximoRiego)}` : 'sin confirmar';
  return [
    'Revisa tus datos:',
    `Nombre: ${r.nombre}`,
    `Parcela: ${r.alias}`,
    `Sector: ${r.sector ?? 'sin confirmar'}`,
    `Reservorio o pozo: ${r.tieneReservorio ? 'sí' : 'no'}`,
    `Próximo turno: ${turno}`,
    '¿Está bien?',
  ].join('\n');
}

function completarRegistro(t: Tx, r: Registro, ahora: string) {
  const r01 = regla(t.estado, 'R-AGUA-01');
  const rReg = regla(t.estado, 'R-REG-01');
  const nombre = r.nombre ?? '';
  const parcela: Parcela = {
    id: PARCELA_NUEVA,
    productorId: PRODUCTOR_NUEVO,
    alias: r.alias ?? '',
    sector: r.sector ?? null,
    proximoRiego: r.proximoRiego ?? '',
    riegoPendiente: Boolean(r.proximoRiego),
    tieneReservorio: Boolean(r.tieneReservorio),
    reservorioEstado: 'desconocido',
  };
  t.set({
    productores: [
      ...t.estado.productores,
      { id: PRODUCTOR_NUEVO, nombre, telefono: '+51 900 000 004', consentimiento: true },
    ],
    parcelas: [...t.estado.parcelas, parcela],
    registro: { paso: 'completo' },
  });
  t.auditRegla(
    rReg,
    { parcelaId: parcela.id, sector: parcela.sector, tieneReservorio: parcela.tieneReservorio },
    `${nombre} quedó registrado con "${parcela.alias}"`,
  );

  const agua = parcela.tieneReservorio ? 'con reservorio o pozo' : 'sin reservorio ni pozo';
  const lugar = parcela.sector ? `sector ${parcela.sector}` : 'sin sector confirmado';
  const turno = r.proximoRiego
    ? `Anoté tu turno del ${DIA_SEMANA.format(new Date(r.proximoRiego))} ${formatoHora(r.proximoRiego)}`
    : 'Todavía falta confirmar tu turno.';
  const aviso = parcela.sector ? '' : ' Hasta confirmar tu sector no recibirás avisos de agua.';
  t.mensaje({
    parcelaId: parcela.id,
    de: 'kusi',
    texto: `Listo, ${nombre}. Registré "${parcela.alias}", ${lugar}, ${agua}. ${turno}${aviso}\nEscribe PERSONA si necesitas hablar con alguien o BAJA para salir.`,
  });

  if (!parcela.sector) {
    const caso = abrirCaso(t, parcela, ahora, 'persona', plazoRevision(parcela, ahora), 'Registro sin sector confirmado');
    t.caso(caso.id, { estado: 'revision_tecnica', reglaId: rReg.id, reglaVersion: rReg.version });
    t.auditRegla(rReg, { casoId: caso.id }, `Caso ${caso.id}: falta confirmar el sector de ${nombre}`);
  }

  // Quien se registra con un aviso vigente en su sector no se queda sin él.
  const vigente = t.estado.eventos.find((e) => e.sector === parcela.sector && !despues(ahora, e.vigenteHasta));
  if (vigente && parcela.riegoPendiente && !reglaNoDisponible(r01, ahora)) avisarParcela(t, vigente, parcela, r01, ahora);
}

function responderRegistro(estado: Estado, entrada: string, esBoton: boolean, ahora: string): Resultado {
  const t = transaccion(estado, ahora);
  const reg = estado.registro;
  const rReg = regla(estado, 'R-REG-01');
  const botones = BOTONES_REGISTRO[reg.paso];
  const boton = esBoton ? botones?.find((b) => b.id === entrada) : undefined;
  if (esBoton && !boton) return t.fin();

  const parcelaId = PARCELA_NUEVA;
  const decir = (texto: string, b?: BotonRespuesta[]) => t.mensaje({ parcelaId, de: 'kusi', texto, botones: b });
  const avanzar = (parche: Partial<Registro>, paso: PasoRegistro, texto: string) => {
    t.set({ registro: { ...t.estado.registro, ...parche, paso } });
    decir(texto, BOTONES_REGISTRO[paso]);
  };
  const rechazar = (texto: string) => {
    t.cerrarMenu(parcelaId);
    t.set({ registro: { paso: 'rechazado' } });
    t.auditRegla(rReg, { paso: reg.paso }, 'Registro sin consentimiento: no se guardó ningún dato');
    decir(texto);
  };

  t.mensaje({ parcelaId, de: 'productor', texto: boton?.etiqueta ?? entrada });

  if (!esBoton && /^\s*baja\s*$/i.test(entrada)) {
    rechazar('Listo, cancelé el registro. No guardé ningún dato tuyo.');
    return t.fin();
  }
  if (botones && !boton) {
    decir(TEXTO_SOLO_BOTONES);
    return t.fin();
  }
  t.cerrarMenu(parcelaId);

  const bienvenida =
    'Hola, soy KUSI, el asistente de KUSICHAT. Te avisaremos cambios de agua y te conectaremos con el Ing. Responsable. Guardamos tu nombre, parcela y respuestas solo para atenderte. ¿Aceptas?';
  const valor = boton?.id ?? entrada.trim().slice(0, 40);

  switch (reg.paso) {
    case 'inicio':
    case 'rechazado': {
      const noDisponible = reglaNoDisponible(rReg, ahora);
      if (noDisponible) {
        t.auditRegla(rReg, {}, `Registro bloqueado: ${noDisponible}`, 'bloqueo');
        decir('Por ahora el registro está en pausa. Escribe PERSONA para hablar con alguien.');
        break;
      }
      avanzar({}, 'consentimiento', bienvenida);
      break;
    }
    case 'consentimiento':
      if (valor === 'rechaza') {
        rechazar('Entendido. No guardé ningún dato tuyo y no te escribiremos. Si cambias de opinión, escribe Hola.');
      } else if (valor === 'saber_mas') {
        avanzar(
          {},
          'consentimiento',
          'Usamos tus datos solo para avisarte sobre tu parcela y para que el agrónomo te atienda. No los vendemos. Puedes salir cuando quieras escribiendo BAJA. ¿Aceptas?',
        );
      } else {
        t.auditRegla(rReg, { textoAceptado: bienvenida }, 'Consentimiento aceptado');
        avanzar({}, 'nombre', 'Gracias. ¿Cómo te llamas?');
      }
      break;
    case 'nombre':
      if (!valor) decir('¿Cómo te llamas?');
      else avanzar({ nombre: valor }, 'alias', `Mucho gusto, ${valor}. ¿Cómo le dices a tu parcela?`);
      break;
    case 'alias':
      if (!valor) decir('¿Cómo le dices a tu parcela?');
      else avanzar({ alias: valor }, 'sector', '¿En qué sector riegas?');
      break;
    case 'sector':
      avanzar({ sector: valor === 'no_se' ? null : (valor as Sector) }, 'reservorio', '¿Tienes reservorio o pozo?');
      break;
    case 'reservorio':
      avanzar({ tieneReservorio: valor === 'si' }, 'turno', '¿Cuándo es tu próximo turno de riego?');
      break;
    case 'turno': {
      const dias = valor === 'manana' ? 1 : 2;
      const proximoRiego = valor === 'no_se' ? null : enDia(ahora, dias, 6);
      const datos = { ...t.estado.registro, proximoRiego };
      avanzar({ proximoRiego }, 'confirmar', resumenRegistro(datos, ahora));
      break;
    }
    case 'confirmar':
      if (valor === 'corregir') avanzar({}, 'nombre', 'De acuerdo, empecemos de nuevo. ¿Cómo te llamas?');
      else completarRegistro(t, t.estado.registro, ahora);
      break;
  }
  return t.fin();
}

/** BAJA: retira el consentimiento y cierra lo abierto. Desde aquí no se le escribe más. */
function darDeBaja(estado: Estado, parcelaId: string, texto: string, ahora: string): Resultado {
  const t = transaccion(estado, ahora);
  const parcela = estado.parcelas.find((p) => p.id === parcelaId);
  if (!parcela) return t.fin();
  const r = regla(estado, 'R-REG-01');
  t.mensaje({ parcelaId, de: 'productor', texto });
  t.set({
    productores: t.estado.productores.map((p) =>
      p.id === parcela.productorId ? { ...p, consentimiento: false } : p,
    ),
  });
  for (const caso of estado.casos) {
    if (caso.parcelaId !== parcelaId || caso.estado === 'cerrado') continue;
    t.cerrarBotones(caso.id, false);
    t.caso(caso.id, { estado: 'cerrado', paso: undefined, plazo: undefined, motivo: 'El productor se dio de baja' });
  }
  t.cerrarMenu(parcelaId);
  t.auditRegla(r, { parcelaId }, `${nombreDe(estado, parcelaId)} se dio de baja: consentimiento retirado`);
  t.mensaje({
    parcelaId,
    de: 'kusi',
    texto: 'Listo, te di de baja. No volveré a escribirte. Si cambias de opinión, habla con la facilitadora.',
  });
  return t.fin();
}

/** Botón PERSONA: disponible siempre, haya o no un caso abierto. */
export function pedirPersona(estado: Estado, parcelaId: string, ahora: string, texto = 'PERSONA'): Resultado {
  const t = transaccion(estado, ahora);
  const parcela = estado.parcelas.find((p) => p.id === parcelaId);
  if (!parcela) {
    if (parcelaId !== PARCELA_NUEVA) return t.fin();
    t.mensaje({ parcelaId, de: 'productor', texto });
    t.audit({ tipo: 'mensaje', datosUsados: { paso: estado.registro.paso }, resultado: 'Un número sin registrar pidió una persona' });
    t.mensaje({ parcelaId, de: 'kusi', texto: 'Entendido. La facilitadora te llamará para ayudarte con el registro.' });
    return t.fin();
  }

  const motivo = 'El productor pidió hablar con una persona';
  t.mensaje({ parcelaId, de: 'productor', texto });

  const plazo = plazoRevision(parcela, ahora);
  let caso = [...estado.casos].reverse().find((c) => c.parcelaId === parcelaId && c.estado !== 'cerrado');
  if (caso) {
    t.cerrarBotones(caso.id, false);
    t.caso(caso.id, { estado: 'revision_tecnica', prioridad: 'alta', plazo, paso: undefined, motivo });
  } else {
    caso = {
      id: t.nuevoId('C'),
      parcelaId,
      eventoId: SIN_EVENTO,
      tema: 'persona',
      estado: 'revision_tecnica',
      prioridad: 'media',
      plazo,
      responsable: INGENIERO,
      respuestas: {},
      motivo,
      creadoEn: ahora,
      actualizadoEn: ahora,
      conteoNoSe: 0,
    };
    t.set({ casos: [...t.estado.casos, caso] });
  }
  t.audit({
    tipo: 'caso',
    datosUsados: { casoId: caso.id, parcelaId },
    resultado: `Caso ${caso.id} a revisión técnica: ${motivo}`,
  });
  t.mensaje({
    parcelaId,
    casoId: caso.id,
    de: 'kusi',
    texto: `Entendido. Pasé tu caso al Ing. Responsable. Te escribirá antes de las ${formatoHora(plazo)}`,
  });
  return t.fin();
}

/** Texto libre: sin IA. "PERSONA" escala; lo demás recibe una respuesta fija. */
export function procesarTextoLibre(estado: Estado, parcelaId: string, texto: string, ahora: string): Resultado {
  if (enRegistro(estado, parcelaId)) {
    if (/^\s*persona\s*$/i.test(texto)) return pedirPersona(estado, parcelaId, ahora, texto);
    return responderRegistro(estado, texto, false, ahora);
  }
  if (/^\s*baja\s*$/i.test(texto)) return darDeBaja(estado, parcelaId, texto, ahora);
  if (/(^|[^\p{L}])persona([^\p{L}]|$)/iu.test(texto)) return pedirPersona(estado, parcelaId, ahora, texto);
  const t = transaccion(estado, ahora);
  t.mensaje({ parcelaId, de: 'productor', texto });
  t.audit({
    tipo: 'mensaje',
    datosUsados: { parcelaId },
    resultado: `${nombreDe(estado, parcelaId)} escribió texto libre (sin interpretar)`,
  });
  t.mensaje({ parcelaId, de: 'kusi', texto: TEXTO_SOLO_BOTONES });
  return t.fin();
}

// ---------- 5. Paso del tiempo ----------

function enviarSeguimiento(t: Tx, caso: Caso, ahora: string) {
  const parcela = t.estado.parcelas.find((p) => p.id === caso.parcelaId)!;
  const r = regla(t.estado, 'R-SEG-01');
  const noDisponible = reglaNoDisponible(r, ahora);
  if (noDisponible) {
    aRevision(t, caso, parcela, ahora, noDisponible, r, { casoId: caso.id });
    return;
  }
  t.caso(caso.id, {
    estado: 'seguimiento_pendiente',
    plazo: sumarHoras(ahora, 24),
    paso: 'seguimiento',
    motivo: 'Esperando respuesta al seguimiento',
    reglaId: r.id,
    reglaVersion: r.version,
  });
  t.auditRegla(r, { casoId: caso.id }, `Caso ${caso.id}: se envió la pregunta de seguimiento`);
  t.mensaje({
    parcelaId: caso.parcelaId,
    casoId: caso.id,
    de: 'kusi',
    texto: `Hola ${nombreDe(t.estado, caso.parcelaId)}, ¿pudiste regar "${parcela.alias}"?`,
    botones: BOTONES.seguimiento,
  });
}

export function adelantarTiempo(estado: Estado, horas: number): Resultado {
  // Si hay un seguimiento prometido más tarde, el reloj llega hasta esa hora para cumplir lo que KUSI dijo.
  const seguimientos = estado.casos.filter((c) => c.estado === 'accion_sugerida' && c.plazo);
  const ahora = seguimientos.reduce(
    (max, c) => (despues(c.plazo!, max) ? c.plazo! : max),
    sumarHoras(estado.ahora, horas),
  );

  const t = transaccion({ ...estado, ahora }, ahora);
  t.audit({
    tipo: 'configuracion',
    datosUsados: { desde: estado.ahora, hasta: ahora, horas },
    resultado: `Tiempo adelantado hasta ${diaRelativo(ahora, estado.ahora)} ${formatoHora(ahora)}`,
    responsable: JURADO,
  });

  for (const caso of estado.casos) {
    if (caso.estado === 'accion_sugerida') {
      enviarSeguimiento(t, caso, ahora);
      continue;
    }

    const esperaRespuesta = ['pendiente_respuesta', 'revision_tecnica', 'seguimiento_pendiente'].includes(caso.estado);
    if (esperaRespuesta && caso.plazo && despues(ahora, caso.plazo)) {
      t.cerrarBotones(caso.id, false);
      t.caso(caso.id, {
        estado: 'vencido',
        prioridad: caso.tema === 'pago' ? caso.prioridad : 'alta',
        paso: undefined,
        motivo: 'Plazo vencido sin respuesta',
      });
      t.audit({
        tipo: 'caso',
        datosUsados: { casoId: caso.id, plazo: caso.plazo, estadoAnterior: caso.estado },
        resultado: `Caso ${caso.id} vencido sin respuesta. El aviso no se reenvía.`,
      });
    }

    const evento = estado.eventos.find((e) => e.id === caso.eventoId);
    const sinContestar = esperaRespuesta || caso.estado === 'vencido';
    if (evento && sinContestar && !despues(estado.ahora, evento.vigenteHasta) && despues(ahora, evento.vigenteHasta)) {
      t.audit({
        tipo: 'evento',
        datosUsados: { eventoId: evento.id, vigenteHasta: evento.vigenteHasta },
        resultado: `Aviso ${evento.id} fuera de vigencia: no se reenvía`,
      });
    }
  }
  return t.fin();
}

// ---------- 6. Acciones del agrónomo y de la demo ----------

export function cerrarCaso(estado: Estado, casoId: string, ahora: string): Resultado {
  const t = transaccion(estado, ahora);
  const caso = estado.casos.find((c) => c.id === casoId);
  if (!caso || caso.estado === 'cerrado') return t.fin();
  t.cerrarBotones(caso.id, false);
  t.caso(caso.id, { estado: 'cerrado', paso: undefined, plazo: undefined, motivo: 'Cerrado por el agrónomo' });
  t.audit({
    tipo: 'caso',
    datosUsados: { casoId, estadoAnterior: caso.estado },
    resultado: `Caso ${casoId} cerrado por el agrónomo`,
    responsable: INGENIERO,
  });
  return t.fin();
}

export function responderComoAgronomo(estado: Estado, casoId: string, texto: string, ahora: string): Resultado {
  const t = transaccion(estado, ahora);
  const caso = estado.casos.find((c) => c.id === casoId);
  const limpio = texto.trim();
  if (!caso || !limpio) return t.fin();
  t.mensaje({ parcelaId: caso.parcelaId, casoId, de: 'agronomo', texto: limpio });
  const motivo = caso.motivo.endsWith('El agrónomo respondió') ? caso.motivo : `${caso.motivo} · El agrónomo respondió`;
  t.caso(casoId, { plazo: undefined, motivo });
  t.audit({
    tipo: 'caso',
    datosUsados: { casoId },
    resultado: `El agrónomo respondió en el caso ${casoId}; plazo cumplido`,
    responsable: INGENIERO,
  });
  return t.fin();
}

export function alternarRegla(estado: Estado, reglaId: string, ahora: string): Resultado {
  const t = transaccion(estado, ahora);
  const r = regla(estado, reglaId);
  const activa = !r.activa;
  t.set({ reglas: t.estado.reglas.map((x) => (x.id === reglaId ? { ...x, activa } : x)) });
  t.audit({
    tipo: 'configuracion',
    reglaId: r.id,
    reglaVersion: r.version,
    datosUsados: { activa },
    resultado: `Regla ${r.id} ${activa ? 'reactivada' : 'suspendida'}`,
    responsable: INGENIERO,
  });
  return t.fin();
}

export function cambiarReservorio(
  estado: Estado,
  parcelaId: string,
  reservorioEstado: ReservorioEstado,
  ahora: string,
): Resultado {
  const t = transaccion(estado, ahora);
  const parcela = estado.parcelas.find((p) => p.id === parcelaId);
  if (!parcela || parcela.reservorioEstado === reservorioEstado) return t.fin();
  t.parcela(parcelaId, { reservorioEstado });
  t.audit({
    tipo: 'configuracion',
    datosUsados: { parcelaId, antes: parcela.reservorioEstado, despues: reservorioEstado },
    resultado: `Reservorio de ${nombreDe(estado, parcelaId)}: ${reservorioEstado === 'vacio' ? 'vacío' : 'con agua'}`,
    responsable: JURADO,
  });
  return t.fin();
}

// ---------- Consultas para el panel ----------

const PESO: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

export function ordenarCasos(casos: Caso[]): Caso[] {
  return [...casos].sort((a, b) => {
    const cerradoA = a.estado === 'cerrado' ? 1 : 0;
    const cerradoB = b.estado === 'cerrado' ? 1 : 0;
    if (cerradoA !== cerradoB) return cerradoA - cerradoB;
    if (PESO[a.prioridad] !== PESO[b.prioridad]) return PESO[a.prioridad] - PESO[b.prioridad];
    const plazoA = a.plazo ? new Date(a.plazo).getTime() : Infinity;
    const plazoB = b.plazo ? new Date(b.plazo).getTime() : Infinity;
    return plazoA - plazoB;
  });
}

export function indicadores(estado: Estado) {
  const abiertos = estado.casos.filter((c) => c.estado !== 'cerrado');
  return {
    casosAbiertos: abiertos.length,
    casosPrioritarios: abiertos.filter((c) => c.prioridad === 'alta').length,
    avisosBloqueados: estado.eventosBloqueados.length,
    mensajesEnviados: estado.mensajes.filter((m) => m.de !== 'productor').length,
  };
}
