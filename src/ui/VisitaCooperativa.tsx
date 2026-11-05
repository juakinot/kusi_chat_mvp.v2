import { alertasVisita, diaRelativo, formatoHora } from '../engine/engine';
import { UMBRAL_VISITA } from '../engine/rules';
import { useStore } from '../state/store';

const PERFIL = 'especialista';

/** Cuando los reportes parecidos superan el umbral, Diego decide si va a la cooperativa. */
export function VisitaCooperativa() {
  const { estado, dispatch } = useStore();
  const pendientes = alertasVisita(estado).filter((a) => !estado.visitas.some((v) => v.tema === a.tema));

  return (
    <>
      {pendientes.map((a) => (
        <section key={a.tema} className="rounded-xl border-2 border-arcilla bg-arcilla-claro px-3 py-2">
          <h2 className="font-semibold">Visita sugerida a la cooperativa</h2>
          <p className="text-sm text-stone-800">{a.texto}.</p>
          <p className="text-sm text-stone-700">
            Umbral: {UMBRAL_VISITA.total} reportes parecidos en {UMBRAL_VISITA.dias} días, o {UMBRAL_VISITA.sector} en un sector.
          </p>
          <button
            onClick={() => dispatch({ type: 'PROPONER_VISITA', tema: a.tema, perfil: PERFIL })}
            className="mt-2 min-h-11 rounded-lg bg-oliva-oscuro px-3 text-sm font-semibold text-white hover:bg-oliva"
          >
            Proponer visita a la cooperativa
          </button>
        </section>
      ))}
      {estado.visitas.map((v) => (
        <section key={v.id} className="rounded-xl bg-white px-3 py-2">
          <h2 className="font-semibold">
            {v.estado === 'confirmada' ? 'Visita confirmada' : 'Visita propuesta'}: {diaRelativo(v.fecha, estado.ahora)}{' '}
            {formatoHora(v.fecha)}
          </h2>
          <p className="text-sm text-stone-700">
            {v.estado === 'confirmada' ? 'Lucía confirmó la visita.' : 'Falta la confirmación de Lucía.'}
          </p>
        </section>
      ))}
    </>
  );
}
