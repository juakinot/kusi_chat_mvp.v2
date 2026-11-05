import { useState } from 'react';
import { diaRelativo, formatoHora } from '../engine/engine';
import type { Caso } from '../engine/types';
import {
  bandejaEspecialista,
  BARRERA,
  casoNuevo,
  CRITERIO_BANDEJA,
  reportesRelacionados,
  todosLosCasos,
} from '../engine/vistas';
import { useStore } from '../state/store';
import { AuditLog } from './AuditLog';
import { CaseDetail } from './CaseDetail';
import { Comparar } from './Comparar';
import { ESTADO_CASO, PRIORIDAD, TEMA } from './etiquetas';
import { ReportesRelacionados } from './ReportesRelacionados';

const PERFIL = 'especialista';
const GRUPO = 'reportes';

type Pestana = 'casos' | 'comparar' | 'reglas' | 'auditoria';

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'casos', texto: 'Casos' },
  { id: 'comparar', texto: 'Comparar' },
  { id: 'reglas', texto: 'Reglas' },
  { id: 'auditoria', texto: 'Auditoría' },
];

function FilaCaso({
  caso,
  orden,
  activo,
  onAbrir,
}: {
  caso: Caso;
  orden?: number;
  activo: boolean;
  onAbrir: () => void;
}) {
  const { estado } = useStore();
  const parcela = estado.parcelas.find((p) => p.id === caso.parcelaId);
  const productor = estado.productores.find((p) => p.id === parcela?.productorId);
  const nuevo = casoNuevo(estado, caso);
  return (
    <li>
      <button
        onClick={onAbrir}
        aria-current={activo ? 'true' : undefined}
        className={`block w-full rounded-xl border-2 px-3 py-2 text-left ${
          activo ? 'border-oliva-oscuro bg-oliva-claro' : nuevo ? 'border-arcilla bg-white' : 'border-transparent bg-white hover:border-stone-300'
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">
            {orden !== undefined && <span className="text-stone-500">{orden}. </span>}
            {productor?.nombre} · {caso.barrera ? BARRERA[caso.barrera] : TEMA[caso.tema]}
          </span>
          {nuevo ? (
            <span className="flex-none rounded-full bg-arcilla px-2 text-sm font-bold text-white">Nuevo</span>
          ) : (
            <span className="flex-none text-sm font-medium text-stone-600">{ESTADO_CASO[caso.estado]}</span>
          )}
        </span>
        <span className="block text-sm text-stone-600">
          {parcela?.proximoRiego
            ? `Riega ${diaRelativo(parcela.proximoRiego, estado.ahora)} ${formatoHora(parcela.proximoRiego)}`
            : 'Turno sin confirmar'}{' '}
          · {PRIORIDAD[caso.prioridad].texto}
        </span>
      </button>
    </li>
  );
}

function Bandeja({ casoId, onAbrir }: { casoId: string | null; onAbrir: (id: string) => void }) {
  const { estado } = useStore();
  const [todos, setTodos] = useState(false);
  const bandeja = bandejaEspecialista(estado, PERFIL);
  const reportes = reportesRelacionados(estado, PERFIL);
  const mayor = reportes.sectores[0];
  const lista = todos ? todosLosCasos(estado, PERFIL) : bandeja;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h1 className="font-titulo text-xl font-bold tracking-tight">
          {todos ? `${lista.length} casos en total` : `${bandeja.length + reportes.casos.length} por atender`}
        </h1>
        <button
          onClick={() => setTodos(!todos)}
          className="min-h-9 text-sm font-semibold text-stone-600 underline underline-offset-2 hover:text-stone-900"
        >
          {todos ? 'Ver por atender' : 'Ver todos'}
        </button>
      </div>

      {!todos && reportes.casos.length > 0 && (
        <button
          onClick={() => onAbrir(GRUPO)}
          aria-current={casoId === GRUPO ? 'true' : undefined}
          className={`block w-full rounded-xl border-2 px-3 py-2 text-left ${
            casoId === GRUPO ? 'border-oliva-oscuro bg-oliva-claro' : 'border-canal bg-canal-claro hover:border-canal-oscuro'
          }`}
        >
          <span className="block font-semibold">{reportes.casos.length} reportes relacionados</span>
          <span className="block text-sm text-stone-700">
            Cambios en hojas o ramas{mayor?.sector ? ` · ${mayor.casos.length} del sector ${mayor.sector}` : ''}
          </span>
        </button>
      )}

      {!todos && lista.length > 0 && <p className="px-1 pt-1 text-sm font-medium text-stone-700">{CRITERIO_BANDEJA}</p>}
      <ul className="space-y-1.5">
        {lista.map((c, i) => (
          <FilaCaso
            key={c.id}
            caso={c}
            orden={todos ? undefined : i + 1}
            activo={c.id === casoId}
            onAbrir={() => onAbrir(c.id)}
          />
        ))}
      </ul>
      {lista.length === 0 && <p className="px-1 text-stone-600">No hay casos por atender.</p>}

      {estado.eventosBloqueados.length > 0 && (
        <section className="pt-2">
          <h2 className="mb-1 px-1 text-sm font-semibold text-stone-700">Avisos bloqueados</h2>
          <ul className="space-y-1.5">
            {estado.eventosBloqueados.map((b) => (
              <li key={b.evento.id} className="rounded-xl bg-amber-50 p-3 text-sm">
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
              onClick={() => dispatch({ type: 'REGLA', reglaId: r.id, perfil: PERFIL })}
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
  const [pestana, setPestana] = useState<Pestana>('casos');
  const [elegido, setElegido] = useState<string | null>(null);
  const [enDetalle, setEnDetalle] = useState(false); // en el celular se ve una cosa a la vez

  // En escritorio siempre hay algo abierto: el primero de la bandeja.
  const primero = bandejaEspecialista(estado, PERFIL)[0]?.id ?? null;
  const abierto = elegido ?? primero;
  const abrir = (id: string) => {
    setElegido(id);
    setEnDetalle(true);
  };

  return (
    <div className="min-w-0 space-y-3">
      <div role="tablist" aria-label="Secciones de Diego" className="flex gap-1 overflow-x-auto">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p.id === pestana}
            onClick={() => setPestana(p.id)}
            className={`min-h-11 flex-none rounded-lg px-3 text-sm font-semibold ${
              p.id === pestana ? 'bg-white text-oliva-oscuro' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {pestana === 'casos' && (
        <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className={enDetalle ? 'hidden lg:block' : ''}>
            <Bandeja casoId={abierto} onAbrir={abrir} />
          </div>
          <div className={`min-w-0 rounded-2xl bg-white ${enDetalle ? '' : 'hidden lg:block'}`}>
            <button
              onClick={() => setEnDetalle(false)}
              className="min-h-11 px-4 text-sm font-semibold text-oliva-oscuro lg:hidden"
            >
              ← Volver a la bandeja
            </button>
            {abierto === GRUPO ? (
              <ReportesRelacionados onAbrir={abrir} />
            ) : (
              <CaseDetail casoId={abierto} onTomar={setElegido} />
            )}
          </div>
        </div>
      )}
      {pestana !== 'casos' && (
        <div className="min-w-0 rounded-2xl bg-white">
          {pestana === 'comparar' && <Comparar />}
          {pestana === 'reglas' && <Reglas />}
          {pestana === 'auditoria' && <AuditLog />}
        </div>
      )}
    </div>
  );
}
