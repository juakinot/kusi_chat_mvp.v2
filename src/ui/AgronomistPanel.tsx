import { useState } from 'react';
import { formatoHora, indicadores, ordenarCasos } from '../engine/engine';
import { useStore } from '../state/store';
import { AuditLog } from './AuditLog';
import { CaseDetail } from './CaseDetail';
import { cuentaRegresiva, ESTADO_CASO, PRIORIDAD } from './etiquetas';

type Pestana = 'bandeja' | 'detalle' | 'reglas' | 'auditoria';

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'bandeja', texto: 'Bandeja' },
  { id: 'detalle', texto: 'Detalle del caso' },
  { id: 'reglas', texto: 'Reglas' },
  { id: 'auditoria', texto: 'Auditoría' },
];

function Bandeja({ onAbrir }: { onAbrir: (id: string) => void }) {
  const { estado } = useStore();
  const casos = ordenarCasos(estado.casos);

  return (
    <div className="space-y-2 p-3">
      {casos.length === 0 && <p className="text-stone-600">No hay casos todavía.</p>}
      {casos.map((c) => {
        const parcela = estado.parcelas.find((p) => p.id === c.parcelaId);
        const productor = estado.productores.find((p) => p.id === parcela?.productorId);
        return (
          <button
            key={c.id}
            onClick={() => onAbrir(c.id)}
            className={`block w-full rounded-lg border p-3 text-left hover:bg-stone-50 ${
              c.prioridad === 'alta' && c.estado !== 'cerrado' ? 'border-red-300' : 'border-stone-200'
            }`}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-bold">
                {productor?.nombre} · {parcela?.alias}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-sm font-bold ${PRIORIDAD[c.prioridad].clase}`}>
                {PRIORIDAD[c.prioridad].texto}
              </span>
            </span>
            <span className="mt-1 block text-sm text-stone-700">
              {ESTADO_CASO[c.estado]} · {c.motivo}
            </span>
            {c.estado !== 'cerrado' && (
              <span className="mt-0.5 block text-sm font-semibold">{cuentaRegresiva(c.plazo, estado.ahora)}</span>
            )}
          </button>
        );
      })}

      {estado.eventosBloqueados.length > 0 && (
        <section className="pt-2">
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-stone-600">Avisos bloqueados</h3>
          <ul className="space-y-2">
            {estado.eventosBloqueados.map((b) => (
              <li key={b.evento.id} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                <p className="font-semibold">{b.evento.descripcion}</p>
                <p>
                  {b.motivo} · {formatoHora(b.hora)} · No se envió ningún mensaje.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Reglas() {
  const { estado, dispatch } = useStore();
  return (
    <ul className="space-y-2 p-3">
      {estado.reglas.map((r) => (
        <li key={r.id} className="rounded-lg border border-stone-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">
              {r.id} v{r.version} · {r.nombre}
            </p>
            <button
              role="switch"
              aria-checked={r.activa}
              aria-label={`${r.id}: ${r.activa ? 'activa' : 'suspendida'}`}
              onClick={() => dispatch({ type: 'REGLA', reglaId: r.id })}
              className={`min-h-11 min-w-28 rounded-lg px-3 text-sm font-bold ${
                r.activa ? 'bg-oliva text-white' : 'bg-red-100 text-red-900'
              }`}
            >
              {r.activa ? 'Activa' : 'Suspendida'}
            </button>
          </div>
          <p className="mt-1 text-sm">{r.descripcion}</p>
          <p className="mt-1 text-sm text-stone-600">Aprobada por: {r.aprobadaPor}</p>
        </li>
      ))}
    </ul>
  );
}

export function AgronomistPanel() {
  const { estado } = useStore();
  const [pestana, setPestana] = useState<Pestana>('bandeja');
  const [casoId, setCasoId] = useState<string | null>(null);
  const k = indicadores(estado);

  const metricas = [
    { texto: 'Casos abiertos', valor: k.casosAbiertos },
    { texto: 'Casos prioritarios', valor: k.casosPrioritarios },
    { texto: 'Avisos bloqueados', valor: k.avisosBloqueados },
    { texto: 'Mensajes enviados', valor: k.mensajesEnviados },
  ];

  return (
    <div className="min-w-0 rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-t-xl border-b border-stone-200 bg-stone-200 sm:grid-cols-4">
        {metricas.map((m) => (
          <div key={m.texto} className="bg-white px-3 py-2">
            <p className="text-xl font-bold leading-tight text-oliva-oscuro">{m.valor}</p>
            <p className="text-sm text-stone-600">{m.texto}</p>
          </div>
        ))}
      </div>

      <div role="tablist" className="flex flex-wrap border-b border-stone-200">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === pestana}
            onClick={() => setPestana(p.id)}
            className={`min-h-11 flex-1 whitespace-nowrap border-b-2 px-3 text-sm font-semibold ${
              p.id === pestana ? 'border-oliva text-oliva-oscuro' : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      <div className="max-h-[calc(100dvh-17rem)] min-h-[440px] overflow-y-auto">
        {pestana === 'bandeja' && (
          <Bandeja
            onAbrir={(id) => {
              setCasoId(id);
              setPestana('detalle');
            }}
          />
        )}
        {pestana === 'detalle' && <CaseDetail casoId={casoId} />}
        {pestana === 'reglas' && <Reglas />}
        {pestana === 'auditoria' && <AuditLog />}
      </div>
    </div>
  );
}
