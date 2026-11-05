import { useEffect, useRef, useState } from 'react';
import { formatoHora } from '../engine/engine';
import type { NecesidadId, ResumenAgua } from '../engine/types';
import { vistaOrganizacion, type Necesidad } from '../engine/vistas';
import { useStore } from '../state/store';

type Campo = Exclude<keyof ResumenAgua, 'total'>;

/** "Sin respuesta" va rayado: es un dato que falta, no un resultado. */
export const SEGMENTOS: { campo: Campo; texto: string; clase: string }[] = [
  { campo: 'yaRegaron', texto: 'Ya regaron', clase: 'bg-brote' },
  { campo: 'conAlternativa', texto: 'Con alternativa', clase: 'bg-canal' },
  { campo: 'sinAlternativa', texto: 'Sin alternativa', clase: 'bg-arcilla' },
  { campo: 'sinRespuesta', texto: 'Sin respuesta', clase: 'sin-dato' },
];

/** Resalta el número un instante cuando el dato cambia de verdad. */
export function Numero({ valor, className = '' }: { valor: number; className?: string }) {
  const previo = useRef(valor);
  const cambio = previo.current !== valor;
  useEffect(() => {
    previo.current = valor;
  }, [valor]);
  return (
    <span key={valor} className={`${cambio ? 'cambio' : ''} ${className}`}>
      {valor}
    </span>
  );
}

function Distribucion({ resumen }: { resumen: ResumenAgua }) {
  const partes = SEGMENTOS.filter((s) => resumen[s.campo] > 0);
  return (
    <div
      role="img"
      aria-label={SEGMENTOS.map((s) => `${s.texto}: ${resumen[s.campo]}`).join(', ')}
      className="flex h-5 w-full gap-0.5"
    >
      {partes.map((s, i) => (
        <div
          key={s.campo}
          title={`${s.texto}: ${resumen[s.campo]} de ${resumen.total}`}
          style={{ flexGrow: resumen[s.campo], flexBasis: 0, transition: 'flex-grow 500ms ease-out' }}
          className={`${s.clase} ${i === 0 ? 'rounded-l' : ''} ${i === partes.length - 1 ? 'rounded-r' : ''}`}
        />
      ))}
    </div>
  );
}

function FilaNecesidad({
  necesidad,
  anotada,
  abierta,
  onAbrir,
  onAnotar,
}: {
  necesidad: Necesidad;
  anotada: boolean;
  abierta: boolean;
  onAbrir: () => void;
  onAnotar: () => void;
}) {
  return (
    <li className="border-t border-stone-200 first:border-t-0">
      <button
        onClick={onAbrir}
        aria-expanded={abierta}
        className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left font-semibold hover:text-oliva"
      >
        <span>{necesidad.titulo}</span>
        <span aria-hidden className="flex-none text-sm font-medium text-stone-500">
          {abierta ? 'Ocultar' : 'Revisar'}
        </span>
      </button>
      {abierta && (
        <div className="space-y-2 pb-3 text-[15px]">
          {necesidad.detalle.map((d) => (
            <p key={d} className="text-stone-700">
              {d}
            </p>
          ))}
          {anotada ? (
            <p className="text-sm font-semibold text-oliva-oscuro">Anotado para coordinar</p>
          ) : (
            <button
              onClick={onAnotar}
              className="min-h-11 rounded-lg bg-oliva-oscuro px-4 text-sm font-semibold text-white hover:bg-oliva"
            >
              Anotar para coordinar
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function PanelLucia() {
  const { estado, dispatch } = useStore();
  const [abierta, setAbierta] = useState<NecesidadId | null>('sin_alternativa');
  const v = vistaOrganizacion(estado);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-2xl bg-white p-4 sm:p-6">
        <p className="text-sm font-medium text-stone-600">
          Interrupción de agua · sector {v.sector} · {v.dia}
        </p>
        <h1 className="mt-1 font-titulo text-4xl font-extrabold tracking-tight sm:text-5xl">
          <Numero valor={v.resumen.total} /> parcelas afectadas
        </h1>

        <div className="mt-5">
          <Distribucion resumen={v.resumen} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          {SEGMENTOS.map((s) => (
            <div key={s.campo}>
              <dd className="font-titulo text-3xl font-bold leading-none">
                <Numero valor={v.resumen[s.campo]} />
              </dd>
              <dt className="mt-1 flex items-center gap-1.5 text-sm text-stone-700">
                <span aria-hidden className={`h-2.5 w-2.5 flex-none rounded-sm ${s.clase}`} />
                {s.texto}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl bg-white p-4 sm:p-6">
        <h2 className="font-titulo text-2xl font-bold tracking-tight">Necesidades de atención</h2>
        <p className="mt-1 text-[15px] text-stone-700">{v.frase}</p>
        <ul className="mt-3">
          {v.necesidades.map((n) => (
            <FilaNecesidad
              key={n.id}
              necesidad={n}
              abierta={abierta === n.id}
              anotada={v.notas.some((x) => x.necesidad === n.id)}
              onAbrir={() => setAbierta(abierta === n.id ? null : n.id)}
              onAnotar={() =>
                dispatch({ type: 'COORDINAR', necesidad: n.id, detalle: n.titulo, perfil: 'organizacion' })
              }
            />
          ))}
        </ul>
      </section>

      {(v.alertas.length > 0 || v.visitas.length > 0) && (
        <section className="rounded-2xl bg-white p-4 sm:p-6">
          <h2 className="font-titulo text-xl font-bold tracking-tight">Visita a la cooperativa</h2>
          <ul className="mt-2 space-y-3 text-[15px]">
            {v.alertas.map((a) => (
              <li key={a}>
                <p className="font-semibold">{a}</p>
                <p className="text-sm text-stone-600">Superan el umbral. Diego decide si propone una visita.</p>
              </li>
            ))}
            {v.visitas.map((x) => (
              <li key={x.id}>
                <p className="font-semibold">{x.detalle}</p>
                {x.confirmada ? (
                  <p className="text-sm font-semibold text-oliva-oscuro">Visita confirmada: {x.fecha}</p>
                ) : (
                  <>
                    <p className="text-sm text-stone-600">Diego propone ir a la cooperativa {x.fecha}</p>
                    <button
                      onClick={() => dispatch({ type: 'CONFIRMAR_VISITA', visitaId: x.id, perfil: 'organizacion' })}
                      className="mt-2 min-h-11 rounded-lg bg-oliva-oscuro px-4 text-sm font-semibold text-white hover:bg-oliva"
                    >
                      Confirmar visita
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {v.notas.length > 0 && (
        <section className="rounded-2xl bg-white p-4 sm:p-6">
          <h2 className="font-titulo text-xl font-bold tracking-tight">Para coordinar</h2>
          <ul className="mt-2 space-y-2">
            {v.notas.map((n) => (
              <li key={n.id} className="text-[15px]">
                <p className="font-semibold">{n.detalle}</p>
                <p className="text-sm text-stone-600">
                  Anotado a las {formatoHora(n.hora)} · Pendiente con los responsables autorizados
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="px-1 text-sm text-stone-600">Ves cifras de conjunto. Las conversaciones de cada productor son privadas.</p>
    </div>
  );
}
