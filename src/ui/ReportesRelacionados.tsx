import { reportesRelacionados } from '../engine/vistas';
import { useStore } from '../state/store';
import { ESTADO_CASO } from './etiquetas';

const PERFIL = 'especialista';

/** Agrupar no es diagnosticar: Diego decide si hay algo en común. */
export function ReportesRelacionados({ onAbrir }: { onAbrir: (id: string) => void }) {
  const { estado, dispatch } = useStore();
  const { casos, sectores } = reportesRelacionados(estado, PERFIL);
  const nombre = (parcelaId: string) => {
    const parcela = estado.parcelas.find((p) => p.id === parcelaId);
    return estado.productores.find((p) => p.id === parcela?.productorId)?.nombre;
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="font-titulo text-2xl font-bold tracking-tight">{casos.length} reportes de cambios en hojas o ramas</h2>
        <p className="mt-1 text-[15px] text-stone-700">
          KUSICHAT los juntó porque se parecen. No confirma que tengan la misma causa.
        </p>
      </div>

      {sectores.map((g) => {
        const sinTomar = g.casos.filter((c) => c.estado !== 'en_revision').map((c) => c.id);
        return (
          <section key={g.sector ?? 'sin-sector'} className="border-t border-stone-200 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">
                Sector {g.sector ?? 'sin confirmar'} · {g.casos.length} {g.casos.length === 1 ? 'reporte' : 'reportes'}
              </h3>
              {g.casos.length > 1 && sinTomar.length > 0 && (
                <button
                  onClick={() => dispatch({ type: 'EN_REVISION', casoIds: sinTomar, perfil: PERFIL })}
                  className="min-h-11 rounded-lg bg-oliva-oscuro px-4 text-sm font-semibold text-white hover:bg-oliva"
                >
                  Marcar {sinTomar.length} en revisión
                </button>
              )}
            </div>
            <ul className="mt-1">
              {g.casos.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onAbrir(c.id)}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-left hover:bg-stone-100"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{nombre(c.parcelaId)}</span>
                      <span className="text-stone-600"> · Lo ve: {(c.respuestas.plaga_desde ?? 'sin dato').toLowerCase()}</span>
                    </span>
                    <span className="flex-none text-sm text-stone-600">{ESTADO_CASO[c.estado]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
