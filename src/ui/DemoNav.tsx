import { resumenAgua, bandejaEspecialista, casoNuevo, etapaHistoria, type EtapaHistoria } from '../engine/vistas';
import { useStore } from '../state/store';

export type Vista = 'rosa' | 'diego' | 'lucia';

const PERFILES: { id: Vista; nombre: string; rol: string }[] = [
  { id: 'rosa', nombre: 'Rosa', rol: 'Agricultora' },
  { id: 'diego', nombre: 'Diego', rol: 'Especialista' },
  { id: 'lucia', nombre: 'Lucía', rol: 'Organización' },
];

const TEXTO: Record<EtapaHistoria, string> = {
  aviso: 'Rosa recibió un aviso sobre el agua. Responde por ella con los botones.',
  respondiendo: 'Falta una pregunta. Responde por Rosa.',
  derivado: 'Rosa terminó. Su caso llegó a Diego y Lucía ya ve el cambio.',
  en_revision: 'Diego tomó el caso. Rosa ya puede verlo en su teléfono.',
  respondido: 'Rosa solo conversó. Diego tuvo el contexto, Lucía sabe qué falta y todo queda en el historial.',
  sin_derivar: 'Rosa no necesitó al especialista. Pulsa Reiniciar y responde que no tiene agua.',
};

/** A dónde conviene ir ahora, según la etapa y la pantalla abierta. */
function siguiente(etapa: EtapaHistoria, vista: Vista): { texto: string; ir: Vista } | null {
  if (etapa === 'aviso' || etapa === 'respondiendo') {
    return vista === 'rosa' ? null : { texto: 'Ir a Rosa', ir: 'rosa' };
  }
  if (etapa === 'derivado') {
    if (vista === 'rosa') return { texto: 'Ver la bandeja de Diego', ir: 'diego' };
    if (vista === 'diego') return { texto: 'Ver el panel de Lucía', ir: 'lucia' };
    return { texto: 'Volver a Diego', ir: 'diego' };
  }
  if (etapa === 'en_revision') {
    if (vista === 'rosa') return { texto: 'Ver el panel de Lucía', ir: 'lucia' };
    return { texto: 'Ver el teléfono de Rosa', ir: 'rosa' };
  }
  if (etapa === 'respondido') return vista === 'rosa' ? null : { texto: 'Ver el teléfono de Rosa', ir: 'rosa' };
  return null;
}

export function DemoNav({
  vista,
  onVista,
  onReiniciar,
}: {
  vista: Vista;
  onVista: (v: Vista) => void;
  onReiniciar: () => void;
}) {
  const { estado } = useStore();
  const etapa = etapaHistoria(estado);
  const paso = siguiente(etapa, vista);
  const llego = !['aviso', 'respondiendo', 'sin_derivar'].includes(etapa);

  const nuevos = bandejaEspecialista(estado, 'especialista').filter((c) => casoNuevo(estado, c)).length;
  const r = resumenAgua(estado);
  const cambioLucia = estado.lineaBase && r.sinAlternativa !== estado.lineaBase.sinAlternativa;

  const aviso: Record<Vista, string | null> = {
    rosa: null,
    diego: nuevos > 0 ? `${nuevos} nuevo` : null,
    lucia: cambioLucia ? 'Cambió' : null,
  };

  return (
    <header className="sticky top-0 z-20 border-b border-stone-300/70 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 pt-2 sm:px-4">
        <p className="font-titulo text-lg font-extrabold tracking-tight text-oliva-oscuro">KUSICHAT</p>
        <div className="flex items-center gap-2">
          <p className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-900">Datos ficticios</p>
          <button
            onClick={onReiniciar}
            className="min-h-9 rounded-lg px-2 text-sm font-semibold text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline"
          >
            Reiniciar
          </button>
        </div>
      </div>

      <nav aria-label="Perfiles de la demo" className="mx-auto flex max-w-3xl items-center px-3 py-2 sm:px-4">
        {PERFILES.map((p, i) => (
          <div key={p.id} className={`flex items-center ${i === 0 ? 'flex-none' : 'min-w-0 flex-1'}`}>
            {i > 0 && <span className="canal-tramo mx-1 sm:mx-2" data-lleno={llego} data-retraso={i === 2} aria-hidden />}
            <button
              onClick={() => onVista(p.id)}
              aria-current={vista === p.id ? 'page' : undefined}
              className={`relative min-h-14 w-[6.2rem] flex-none rounded-xl border-2 px-2 py-1 text-center transition-colors sm:w-36 ${
                vista === p.id
                  ? 'border-oliva-oscuro bg-oliva-oscuro text-white'
                  : 'border-stone-300 bg-white text-tinta hover:border-oliva'
              }`}
            >
              <span className="block font-titulo text-lg font-bold leading-tight">{p.nombre}</span>
              <span className={`block text-[13px] leading-tight ${vista === p.id ? 'text-white/85' : 'text-stone-600'}`}>
                {p.rol}
              </span>
              {aviso[p.id] && (
                <span className="absolute -right-1 -top-3 rounded-full bg-arcilla px-1.5 text-[12px] font-bold text-white">
                  {aviso[p.id]}
                </span>
              )}
            </button>
          </div>
        ))}
      </nav>

      <div className="border-t border-stone-200 bg-oliva-claro">
        <div className="mx-auto flex min-h-12 max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-1.5 sm:px-4">
          <p role="status" className="text-center text-sm font-medium text-tinta">
            {TEXTO[etapa]}
          </p>
          {paso && (
            <button
              onClick={() => onVista(paso.ir)}
              className="min-h-9 rounded-lg bg-oliva-oscuro px-3 text-sm font-semibold text-white hover:bg-oliva"
            >
              {paso.texto} →
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
