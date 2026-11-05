import { useState, type ReactNode } from 'react';
import { diaRelativo, formatoHora, INGENIERO } from '../engine/engine';
import { useStore } from '../state/store';
import { cuentaRegresiva, ESTADO_CASO, PRIORIDAD } from './etiquetas';

function Ficha({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-200 p-3">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-stone-600">{titulo}</h3>
      <div className="space-y-0.5 text-sm">{children}</div>
    </section>
  );
}

const RESERVORIO = { con_agua: 'con agua', vacio: 'vacío', desconocido: 'estado desconocido' };

export function CaseDetail({ casoId }: { casoId: string | null }) {
  const { estado, dispatch } = useStore();
  const caso = estado.casos.find((c) => c.id === casoId);
  const parcela = estado.parcelas.find((p) => p.id === caso?.parcelaId);
  const productor = estado.productores.find((p) => p.id === parcela?.productorId);
  const evento = estado.eventos.find((e) => e.id === caso?.eventoId);

  const textoInicial = `${productor?.nombre}, vi tu reporte del sector ${parcela?.sector}. ¿Hay otro turno que te hayan confirmado? Avísame y revisamos tu plan juntos.`;
  const [borrador, setBorrador] = useState<{ casoId: string | null; texto: string }>({ casoId: null, texto: '' });
  const texto = borrador.casoId === casoId ? borrador.texto : textoInicial;

  if (!caso || !parcela) return <p className="p-4 text-stone-600">Elige un caso en la Bandeja.</p>;

  const fecha = (iso: string) => `${diaRelativo(iso, estado.ahora)} ${formatoHora(iso)}`;
  const abierto = caso.estado !== 'cerrado';
  const respuestas = Object.values(caso.respuestas);

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">
          Caso {caso.id} · {productor?.nombre}
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-sm font-bold ${PRIORIDAD[caso.prioridad].clase}`}>
          {PRIORIDAD[caso.prioridad].texto}
        </span>
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-sm font-bold text-stone-800">
          {ESTADO_CASO[caso.estado]}
        </span>
      </div>

      <div className="rounded-lg bg-oliva-claro p-3 text-sm">
        <p>
          <strong>Motivo:</strong> {caso.motivo}
        </p>
        {abierto && <p className="mt-0.5 font-semibold">{cuentaRegresiva(caso.plazo, estado.ahora)}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Ficha titulo="Parcela">
          <p>
            {parcela.alias} · sector {parcela.sector}
          </p>
          <p>Próximo riego: {fecha(parcela.proximoRiego)}</p>
          <p>
            Reservorio: {parcela.tieneReservorio ? RESERVORIO[parcela.reservorioEstado] : 'no tiene'}
          </p>
          <p>Plan aprobado: {parcela.planAprobado ?? 'sin plan'}</p>
        </Ficha>

        <Ficha titulo="Evento y fuente">
          {evento ? (
            <>
              <p>{evento.descripcion}</p>
              <p>
                Fuente: {evento.origen === 'comision_regantes' ? 'Comisión de Regantes' : 'Reporte de productor'}{' '}
                ({evento.fuenteVerificada ? 'verificada' : 'sin verificar'})
              </p>
              <p>Vigente hasta: {fecha(evento.vigenteHasta)}</p>
            </>
          ) : (
            <p>Sin evento asociado: el productor pidió una persona.</p>
          )}
        </Ficha>

        <Ficha titulo="Respuestas del productor">
          {respuestas.length > 0 ? (
            <ul className="list-inside list-disc">
              {respuestas.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <p>Sin respuestas todavía.</p>
          )}
        </Ficha>

        <Ficha titulo="Regla aplicada">
          <p>{caso.reglaId ? `${caso.reglaId} v${caso.reglaVersion}` : 'Ninguna: pedido directo del productor'}</p>
          <p>Responsable: {caso.responsable}</p>
        </Ficha>
      </div>

      {abierto && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: 'RESPONDER_AGRONOMO', casoId: caso.id, texto });
            setBorrador({ casoId: caso.id, texto: '' });
          }}
        >
          <label className="block text-sm font-semibold" htmlFor="respuesta-agronomo">
            Responder como {INGENIERO}
          </label>
          <textarea
            id="respuesta-agronomo"
            rows={3}
            value={texto}
            onChange={(e) => setBorrador({ casoId: caso.id, texto: e.target.value })}
            className="w-full rounded-lg border border-stone-300 p-2 text-[15px]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!texto.trim()}
              className="min-h-11 rounded-lg bg-oliva px-4 text-sm font-semibold text-white hover:bg-oliva-oscuro disabled:opacity-50"
            >
              Enviar respuesta
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'CERRAR_CASO', casoId: caso.id })}
              className="min-h-11 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold hover:bg-stone-100"
            >
              Cerrar caso
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
