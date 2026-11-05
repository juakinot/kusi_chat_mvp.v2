import { bandejaEspecialista, BARRERA, casoNuevo, reportesRelacionados, resumenAgua } from '../engine/vistas';
import { useStore } from '../state/store';
import type { Vista } from './DemoNav';
import { Numero, SEGMENTOS } from './PanelLucia';

/** Lo que pasa fuera del teléfono mientras Rosa conversa. Son los datos reales, no una animación. */
export function ConexionEnVivo({ onVista }: { onVista: (v: Vista) => void }) {
  const { estado } = useStore();
  const bandeja = bandejaEspecialista(estado, 'especialista');
  const reportes = reportesRelacionados(estado, 'especialista').casos.length;
  const nuevo = bandeja.find((c) => casoNuevo(estado, c));
  const parcela = estado.parcelas.find((p) => p.id === nuevo?.parcelaId);
  const productor = estado.productores.find((p) => p.id === parcela?.productorId);
  const resumen = resumenAgua(estado);
  const base = estado.lineaBase;

  return (
    <section aria-label="Lo que pasa mientras Rosa conversa" className="space-y-3">
      <h2 className="font-titulo text-xl font-bold tracking-tight">Mientras Rosa conversa</h2>

      <button
        onClick={() => onVista('diego')}
        className={`block w-full rounded-2xl border-2 bg-white p-4 text-left transition-colors hover:border-oliva ${
          nuevo ? 'border-arcilla' : 'border-transparent'
        }`}
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">Bandeja de Diego</span>
          <span className="text-sm text-stone-600">
            <Numero valor={bandeja.length + reportes} className="font-titulo text-2xl font-bold text-tinta" /> por atender
          </span>
        </span>
        {nuevo ? (
          <span className="mt-2 block rounded-lg bg-arcilla-claro px-3 py-2 text-[15px]">
            <strong>Nuevo: {productor?.nombre}</strong> · {nuevo.barrera ? BARRERA[nuevo.barrera] : nuevo.motivo}
          </span>
        ) : (
          <span className="mt-1 block text-sm text-stone-600">Si Rosa necesita ayuda, su caso llega aquí solo.</span>
        )}
      </button>

      <button
        onClick={() => onVista('lucia')}
        className="block w-full rounded-2xl border-2 border-transparent bg-white p-4 text-left transition-colors hover:border-oliva"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">Panel de Lucía</span>
          <span className="text-sm text-stone-600">{resumen.total} parcelas afectadas</span>
        </span>
        <span className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {SEGMENTOS.map((s) => {
            const antes = base?.[s.campo];
            const ahora = resumen[s.campo];
            return (
              <span key={s.campo} className="block min-w-0">
                <span className="block font-titulo text-2xl font-bold leading-none">
                  {antes !== undefined && antes !== ahora && (
                    <span className="mr-1 text-base font-medium text-stone-500">{antes} →</span>
                  )}
                  <Numero valor={ahora} />
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-700">
                  <span aria-hidden className={`h-2.5 w-2.5 flex-none rounded-sm ${s.clase}`} />
                  {s.texto}
                </span>
              </span>
            );
          })}
        </span>
      </button>
    </section>
  );
}
