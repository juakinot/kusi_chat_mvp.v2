import { useMemo } from 'react';
import { compararPerfiles } from '../engine/comparar';
import { diaRelativo } from '../engine/engine';
import type { Parcela } from '../engine/types';
import { useStore } from '../state/store';
import { ESTADO_CASO, PRIORIDAD } from './etiquetas';

const RESERVORIO = { con_agua: 'con agua', vacio: 'vacío', desconocido: 'estado desconocido' };

function Ficha({ parcela, nombre, ahora }: { parcela: Parcela; nombre: string; ahora: string }) {
  const { cuota } = parcela;
  let textoCuota = 'sin fecha registrada';
  if (cuota) textoCuota = cuota.pagada ? 'pagada' : `vence ${diaRelativo(cuota.vence, ahora)}`;
  return (
    <div className="min-w-0 border-l-2 border-oliva pl-3 text-sm">
      <p className="text-base font-bold">{nombre}</p>
      <p>Sector {parcela.sector ?? 'sin confirmar'}</p>
      <p>Reservorio: {parcela.tieneReservorio ? RESERVORIO[parcela.reservorioEstado] : 'no tiene'}</p>
      <p>Plan aprobado: {parcela.planAprobado ? 'sí' : 'no'}</p>
      <p>Cuota: {textoCuota}</p>
    </div>
  );
}

export function Comparar() {
  const { estado } = useStore();
  const { parcelas, reglas, eventos, casos, mensajes, productores } = estado;

  // El reloj avanza cada segundo; la comparación solo cambia cuando cambian los datos.
  const comparaciones = useMemo(
    () => compararPerfiles(estado),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parcelas, reglas, eventos, casos, mensajes],
  );

  return (
    <div className="space-y-4 p-3">
      <p className="text-sm text-stone-700">
        Mismo motivo y mismas respuestas para todos los perfiles. Solo cambia la ficha. Es un ensayo con el motor real: no envía
        mensajes ni abre casos, y cambia si suspendes una regla o mueves el reservorio de Rosa.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {parcelas.map((p) => (
          <Ficha
            key={p.id}
            parcela={p}
            ahora={estado.ahora}
            nombre={productores.find((x) => x.id === p.productorId)?.nombre ?? p.alias}
          />
        ))}
      </div>

      {comparaciones.map((c) => (
        <section key={c.id}>
          <h3 className="mb-1 font-bold">{c.titulo}</h3>
          <div className="grid gap-2 lg:grid-cols-3">
            {c.resultados.map((r) => (
              <div key={r.parcelaId} className="min-w-0 rounded-lg border border-stone-200 p-2.5 text-sm">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold">{r.nombre}</span>
                  {r.caso ? (
                    <span className={`rounded-full px-2 text-sm font-bold ${PRIORIDAD[r.caso.prioridad].clase}`}>
                      {ESTADO_CASO[r.caso.estado]}
                    </span>
                  ) : (
                    <span className="rounded-full bg-stone-200 px-2 text-sm font-bold text-stone-800">Sin caso</span>
                  )}
                </p>
                <p className="mt-1 break-words">{r.mensaje}</p>
                {r.caso?.reglaId && (
                  <p className="mt-1 text-stone-600">
                    {r.caso.reglaId} v{r.caso.reglaVersion} · {r.caso.motivo}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
