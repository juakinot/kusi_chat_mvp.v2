import { useState, type ReactNode } from 'react';
import { diaRelativo, enDia, formatoHora } from '../engine/engine';
import type { Caso, Tema } from '../engine/types';
import { antecedentes, historialCaso } from '../engine/vistas';
import { useStore } from '../state/store';
import { ESTADO_CASO, PRIORIDAD, TEMA, textoPlazo } from './etiquetas';

const PERFIL = 'especialista';

const PREGUNTA: Record<string, string> = {
  inicial: '¿Ya regó?',
  confirmar_turno: '¿Recibió agua en el último turno?',
  reservorio: '¿Tiene agua en el reservorio?',
  seguimiento: '¿Pudo regar?',
  plaga_desde: '¿Desde cuándo lo ve?',
  dano_personas: '¿Hay personas en peligro?',
  dano_que: '¿Qué se dañó?',
  pago: '¿Pagó la cuota?',
};

const RESERVORIO = { con_agua: 'con agua', vacio: 'vacío', desconocido: 'estado desconocido' };

const SIN_EVENTO_TEXTO: Record<Tema, string> = {
  agua: 'Reportado por el productor. Sin aviso verificado.',
  plaga: 'Reportado por el productor. KUSICHAT no diagnostica.',
  dano: 'Reportado por el productor.',
  pago: 'Fecha registrada por el productor.',
  persona: 'El productor pidió hablar con una persona.',
};

function Bloque({ pregunta, children }: { pregunta: string; children: ReactNode }) {
  return (
    <section className="border-t border-stone-200 pt-3 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-stone-600">{pregunta}</h3>
      <div className="mt-1 space-y-0.5 text-[15px]">{children}</div>
    </section>
  );
}

function Plegable({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <details className="border-t border-stone-200 py-1">
      <summary className="min-h-9 cursor-pointer py-1.5 text-sm font-semibold text-stone-700">{titulo}</summary>
      <div className="pb-2 text-sm">{children}</div>
    </details>
  );
}

function queFalta(caso: Caso, ahora: string): string {
  const plazo = textoPlazo(caso.plazo, ahora).toLowerCase();
  switch (caso.estado) {
    case 'revision_tecnica':
      return `Revisar el caso: ${plazo}`;
    case 'en_revision':
      return `Responder y programar el seguimiento: ${plazo}`;
    case 'seguimiento_programado':
      return `Esperar el seguimiento. KUSI preguntará ${diaRelativo(caso.plazo ?? ahora, ahora)} ${formatoHora(caso.plazo ?? ahora)}`;
    case 'vencido':
      return 'El plazo venció sin respuesta. Hay que retomar el caso.';
    case 'cerrado':
      return 'Nada: el caso está cerrado.';
    case 'pendiente_respuesta':
      return 'Esperar la respuesta del productor.';
    default:
      return 'Esperar el seguimiento.';
  }
}

export function CaseDetail({ casoId, onTomar }: { casoId: string | null; onTomar: (id: string) => void }) {
  const { estado, dispatch } = useStore();
  const caso = estado.casos.find((c) => c.id === casoId);
  const parcela = estado.parcelas.find((p) => p.id === caso?.parcelaId);
  const productor = estado.productores.find((p) => p.id === parcela?.productorId);
  const evento = estado.eventos.find((e) => e.id === caso?.eventoId);

  const textoInicial = productor ? `${productor.nombre}, ya revisé tu caso. Te llamaré hoy para ver juntos las alternativas.` : '';
  const [borrador, setBorrador] = useState<{ casoId: string | null; texto: string }>({ casoId: null, texto: '' });
  const [dias, setDias] = useState(1);
  const texto = borrador.casoId === casoId ? borrador.texto : textoInicial;

  if (!caso || !parcela) return <p className="p-4 text-stone-600">Elige un caso de la bandeja.</p>;

  const fecha = (iso: string) => `${diaRelativo(iso, estado.ahora)} ${formatoHora(iso)}`;
  const abierto = caso.estado !== 'cerrado';
  const tomado = caso.estado === 'en_revision' || caso.estado === 'seguimiento_programado';
  const respuestas = Object.entries(caso.respuestas);
  const historial = historialCaso(estado, caso.id, PERFIL);
  const previos = antecedentes(estado, caso, PERFIL);

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-titulo text-2xl font-bold tracking-tight">{productor?.nombre}</h2>
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-sm font-semibold text-stone-800">{ESTADO_CASO[caso.estado]}</span>
        <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${PRIORIDAD[caso.prioridad].clase}`}>
          {PRIORIDAD[caso.prioridad].texto}
        </span>
      </div>

      <Bloque pregunta="¿Quién necesita ayuda?">
        <p>
          {productor?.nombre} · {parcela.alias} · sector {parcela.sector ?? 'sin confirmar'}
        </p>
        <p className="text-stone-700">
          Próximo riego: {parcela.proximoRiego ? fecha(parcela.proximoRiego) : 'sin confirmar'} · Reservorio:{' '}
          {parcela.tieneReservorio ? RESERVORIO[parcela.reservorioEstado] : 'no tiene'}
        </p>
      </Bloque>

      <Bloque pregunta="¿Qué ocurrió?">
        <p className="font-medium">{caso.motivo}</p>
        <p className="text-stone-700">{evento ? evento.descripcion : SIN_EVENTO_TEXTO[caso.tema]}</p>
        {respuestas.length > 0 && (
          <ul className="pt-1 text-stone-700">
            {respuestas.map(([paso, r]) => (
              <li key={paso}>
                {PREGUNTA[paso] ?? paso} <strong className="text-tinta">{r}</strong>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      <Bloque pregunta="¿Qué falta hacer?">
        <p className="font-medium">{queFalta(caso, estado.ahora)}</p>
      </Bloque>

      {abierto && !tomado && (
        <button
          onClick={() => {
            onTomar(caso.id); // el caso sigue abierto aunque cambie de lugar en la bandeja
            dispatch({ type: 'EN_REVISION', casoIds: caso.id, perfil: PERFIL });
          }}
          className="min-h-12 w-full rounded-xl bg-oliva-oscuro px-5 text-base font-semibold text-white hover:bg-oliva sm:w-auto"
        >
          Marcar En revisión
        </button>
      )}

      {tomado && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({
              type: 'RESPONDER_AGRONOMO',
              casoId: caso.id,
              texto,
              seguimiento: enDia(estado.ahora, dias, 9),
              perfil: PERFIL,
            });
            setBorrador({ casoId: caso.id, texto: '' });
          }}
        >
          <label className="block text-sm font-semibold" htmlFor={`respuesta-${caso.id}`}>
            Tu respuesta para {productor?.nombre}
          </label>
          <textarea
            id={`respuesta-${caso.id}`}
            rows={2}
            value={texto}
            onChange={(e) => setBorrador({ casoId: caso.id, texto: e.target.value })}
            className="w-full rounded-lg border border-stone-300 p-2 text-[15px]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold" htmlFor={`seguimiento-${caso.id}`}>
              Seguimiento
            </label>
            <select
              id={`seguimiento-${caso.id}`}
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className="min-h-11 rounded-lg border border-stone-300 bg-white px-2 text-[15px]"
            >
              <option value={1}>Mañana 9:00 a. m.</option>
              <option value={2}>Pasado mañana 9:00 a. m.</option>
            </select>
            <button
              type="submit"
              disabled={!texto.trim()}
              className="min-h-11 rounded-lg bg-oliva-oscuro px-4 text-sm font-semibold text-white hover:bg-oliva disabled:opacity-50"
            >
              Enviar y programar
            </button>
          </div>
        </form>
      )}

      <div>
        <Plegable titulo={`Historial del caso (${historial.length})`}>
          {historial.length === 0 ? (
            <p className="text-stone-600">Este caso todavía no tiene mensajes.</p>
          ) : (
            <ol className="space-y-1">
              {historial.map((l) => (
                <li key={l.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                  <span className="text-stone-600">{formatoHora(l.hora)}</span>
                  <span className="break-words">
                    <strong>{l.quien}:</strong> {l.texto}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Plegable>
        <Plegable titulo={`Antecedentes (${previos.length})`}>
          {previos.length === 0 ? (
            <p className="text-stone-600">Sin casos anteriores en esta parcela.</p>
          ) : (
            <ul className="space-y-1">
              {previos.map((c) => (
                <li key={c.id}>
                  {new Date(c.creadoEn).toLocaleDateString('es-PE')} · {TEMA[c.tema]} · {c.motivo}
                </li>
              ))}
            </ul>
          )}
        </Plegable>
        <Plegable titulo="Fuente y regla aplicada">
          {evento && (
            <p>
              Fuente: {evento.origen === 'comision_regantes' ? 'Organización de regantes (simulado)' : 'Reporte de productor'} ·{' '}
              {evento.fuenteVerificada ? 'verificada' : 'sin verificar'} · vigente hasta {fecha(evento.vigenteHasta)}
            </p>
          )}
          <p>{caso.reglaId ? `Regla ${caso.reglaId} v${caso.reglaVersion}` : 'Sin regla: pedido directo del productor'}</p>
          <p>Plan aprobado: {parcela.planAprobado ?? 'sin plan'}</p>
          <p>Responsable: {caso.responsable}</p>
        </Plegable>
      </div>

      {abierto && (
        <button
          onClick={() => dispatch({ type: 'CERRAR_CASO', casoId: caso.id, perfil: PERFIL })}
          className="min-h-11 rounded-lg px-1 text-sm font-semibold text-stone-600 underline underline-offset-2 hover:text-stone-900"
        >
          Cerrar caso
        </button>
      )}
    </div>
  );
}
