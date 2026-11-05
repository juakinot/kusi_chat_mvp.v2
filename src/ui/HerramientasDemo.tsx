import type { ReactNode } from 'react';
import { perfilesDemo } from '../engine/comparar';
import { diaRelativo, formatoHora, PARCELA_NUEVA } from '../engine/engine';
import { useStore } from '../state/store';

const ROSA = 'PA-ROSA';

function Boton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100"
    >
      {children}
    </button>
  );
}

function Segmentado<T extends string>({
  etiqueta,
  opciones,
  valor,
  onChange,
}: {
  etiqueta: string;
  opciones: { valor: T; texto: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={etiqueta}>
      <span className="text-sm font-medium text-stone-700">{etiqueta}</span>
      <div className="flex flex-wrap overflow-hidden rounded-lg border border-stone-300 bg-white">
        {opciones.map((o) => (
          <button
            key={o.valor}
            aria-pressed={o.valor === valor}
            onClick={() => onChange(o.valor)}
            className={`min-h-11 px-3 text-sm font-semibold ${
              o.valor === valor ? 'bg-oliva text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Funciones anteriores del MVP. Se conservan fuera del recorrido principal. */
export function HerramientasDemo({ chatId, onChat }: { chatId: string; onChat: (id: string) => void }) {
  const { estado, dispatch } = useStore();
  const rosa = estado.parcelas.find((p) => p.id === ROSA);
  const dia = diaRelativo(estado.ahora, estado.inicio);

  return (
    <details className="rounded-2xl bg-white/60 px-4 py-2">
      <summary className="min-h-9 cursor-pointer py-1 text-sm font-semibold text-stone-700">Más herramientas de la demo</summary>
      <div className="space-y-3 py-2">
        <Segmentado
          etiqueta="Ver teléfono de:"
          valor={chatId}
          opciones={[
            ...perfilesDemo(estado).map((p) => ({
              valor: p.id,
              texto: estado.productores.find((x) => x.id === p.productorId)?.nombre ?? p.alias,
            })),
            ...(estado.registro.paso === 'completo' ? [] : [{ valor: PARCELA_NUEVA, texto: 'Número nuevo' }]),
          ]}
          onChange={onChat}
        />
        <Segmentado
          etiqueta="Reservorio de Rosa:"
          valor={rosa?.reservorioEstado ?? 'desconocido'}
          opciones={[
            { valor: 'con_agua', texto: 'Con agua' },
            { valor: 'vacio', texto: 'Vacío' },
          ]}
          onChange={(valor) => dispatch({ type: 'RESERVORIO', parcelaId: ROSA, valor })}
        />
        <div className="flex flex-wrap gap-2">
          <Boton onClick={() => dispatch({ type: 'AVISO_CAUDAL' })}>Menos caudal en el sector Alto</Boton>
          <Boton onClick={() => dispatch({ type: 'AGENDA' })}>Revisar cuotas de agua</Boton>
          <Boton onClick={() => dispatch({ type: 'AVISO_VENCIDO' })}>Enviar aviso vencido</Boton>
          <Boton onClick={() => dispatch({ type: 'AVISO_SIN_FUENTE' })}>Enviar aviso sin fuente verificada</Boton>
          <Boton onClick={() => dispatch({ type: 'ADELANTAR', horas: 24 })}>Adelantar 24 h</Boton>
        </div>
        <p className="text-sm text-stone-600">
          Reloj de la demo:{' '}
          <strong className="text-stone-900">
            {dia} {formatoHora(estado.ahora)}
          </strong>
        </p>
      </div>
    </details>
  );
}
