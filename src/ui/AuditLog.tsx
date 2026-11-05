import { diaRelativo, formatoHora } from '../engine/engine';
import { useStore } from '../state/store';

const MAXIMO = 120;

export function AuditLog() {
  const { estado } = useStore();
  const entradas = [...estado.auditoria].reverse().slice(0, MAXIMO);

  if (entradas.length === 0) {
    return <p className="p-4 text-stone-600">Todavía no hay registros.</p>;
  }

  return (
    <div>
      <p className="px-3 py-2 text-sm text-stone-600">
        Últimos {entradas.length} de {estado.auditoria.length} registros. Incluye lo que el escenario ficticio generó antes de abrir la demo.
      </p>
      <div className="hidden grid-cols-[7rem_7rem_7rem_1fr_8rem] gap-2 border-b border-stone-300 px-3 pb-2 text-sm font-bold uppercase tracking-wide text-stone-600 md:grid">
        <span>Hora</span>
        <span>Tipo</span>
        <span>Regla</span>
        <span>Resultado</span>
        <span>Responsable</span>
      </div>
      <ol>
        {entradas.map((a) => {
          const dia = diaRelativo(a.hora, estado.inicio);
          return (
            <li
              key={a.id}
              className={`grid grid-cols-1 gap-x-2 gap-y-0.5 border-b border-stone-200 px-3 py-2 text-sm md:grid-cols-[7rem_7rem_7rem_1fr_8rem] ${
                a.tipo === 'bloqueo' ? 'bg-amber-100' : ''
              }`}
            >
              <span className="text-stone-700">
                {dia === 'hoy' ? '' : `${dia} `}
                {formatoHora(a.hora)}
              </span>
              <span className="font-semibold">{a.tipo}</span>
              <span className="text-stone-700">{a.reglaId ? `${a.reglaId} v${a.reglaVersion}` : '—'}</span>
              <div className="min-w-0 break-words">
                {a.resultado}
                {Object.keys(a.datosUsados).length > 0 && (
                  <details className="text-sm text-stone-600">
                    <summary className="cursor-pointer">Datos usados</summary>
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(a.datosUsados, null, 1)}</pre>
                  </details>
                )}
              </div>
              <span className="text-stone-700">{a.responsable}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
