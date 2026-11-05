import type {
  BotonRespuesta,
  Caso,
  EntradaAuditoria,
  Estado,
  EventoAgua,
  Mensaje,
  Parcela,
  PasoConversacion,
  Prioridad,
  Regla,
  ReservorioEstado,
  Resultado,
} from './types';

export const SISTEMA = 'Sistema';
export const INGENIERO = 'Ing. Responsable (demo)';
export const JURADO = 'Jurado (demo)';
export const SIN_EVENTO = 'SIN-EVENTO';
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
};

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
  const afectadas = parcelasAfectadas(evento, estado.parcelas);

  for (const parcela of estado.parcelas) {
    if (afectadas.includes(parcela)) continue;
    const razon = parcela.sector !== evento.sector ? `sector ${parcela.sector}` : 'sin riego pendiente';
    t.auditRegla(
      r01,
      { parcelaId: parcela.id, sector: parcela.sector, riegoPendiente: parcela.riegoPendiente },
      `Parcela de ${nombreDe(estado, parcela.id)} no afectada (${razon})`,
    );
  }

  for (const parcela of afectadas) {
    const casoId = t.nuevoId('C');
    const caso: Caso = {
      id: casoId,
      parcelaId: parcela.id,
      eventoId: evento.id,
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
      `Parcela de ${nombreDe(estado, parcela.id)} afectada: caso ${casoId} abierto`,
    );
    t.mensaje({
      parcelaId: parcela.id,
      casoId,
      de: 'kusi',
      texto: textoAviso(evento, parcela, ahora),
      botones: BOTONES.inicial,
    });
  }
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

function preguntar(t: Tx, caso: Caso, paso: PasoConversacion, texto: string) {
  t.caso(caso.id, { paso });
  t.mensaje({ parcelaId: caso.parcelaId, casoId: caso.id, de: 'kusi', texto, botones: BOTONES[paso] });
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
) {
  const plazo = plazoRevision(parcela, ahora);
  t.caso(caso.id, {
    estado: 'revision_tecnica',
    prioridad: 'alta',
    plazo,
    paso: undefined,
    motivo,
    reglaId: r.id,
    reglaVersion: r.version,
  });
  t.auditRegla(r, { ...datos, plazo }, `Caso ${caso.id} a revisión técnica, prioridad alta: ${motivo}`);
  t.mensaje({
    parcelaId: caso.parcelaId,
    casoId: caso.id,
    de: 'kusi',
    texto: `Entendido. Pasé tu caso al Ing. Responsable como prioritario. Te escribirá antes de las ${formatoHora(plazo)} Mientras tanto no necesitas hacer nada más.`,
  });
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
  }
  return t.fin();
}

/** Botón PERSONA: disponible siempre, haya o no un caso abierto. */
export function pedirPersona(estado: Estado, parcelaId: string, ahora: string, texto = 'PERSONA'): Resultado {
  const t = transaccion(estado, ahora);
  const parcela = estado.parcelas.find((p) => p.id === parcelaId);
  if (!parcela) return t.fin();

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
      t.caso(caso.id, { estado: 'vencido', prioridad: 'alta', paso: undefined, motivo: 'Plazo vencido sin respuesta' });
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
