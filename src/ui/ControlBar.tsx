import type { ReactNode } from 'react';
import { diaRelativo, formatoHora, PARCELA_NUEVA } from '../engine/engine';
import { useStore } from '../state/store';

const ROSA = 'PA-ROSA';

function Boton({
  children,
  onClick,
  tono = 'normal',
  ancho = false,
}: {
  children: ReactNode;
  onClick: () => void;
  tono?: 'principal' | 'normal' | 'aviso';
  ancho?: boolean;
}) {
  const tonos = {
    principal: 'bg-oliva text-white hover:bg-oliva-oscuro border-oliva',
    normal: 'bg-white text-stone-800 hover:bg-stone-100 border-stone-300',
    aviso: 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300',
  };
  return (
    <button onClick={onClick} className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ${ancho ? 'col-span-2' : ''} ${tonos[tono]}`}>
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
    <div className="col-span-2 flex flex-wrap items-center gap-2" role="group" aria-label={etiqueta}>
      <span className="text-sm font-medium text-stone-700">{etiqueta}</span>
      <div className="flex overflow-hidden rounded-lg border border-stone-300 bg-white">
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

export function ControlBar({ chatId, onChat }: { chatId: string; onChat: (id: string) => void }) {
  const { estado, dispatch } = useStore();
  const rosa = estado.parcelas.find((p) => p.id === ROSA);
  const dia = diaRelativo(estado.ahora, estado.inicio);

  return (
    <section aria-label="Controles de la demo" className="border-b border-stone-200 bg-white px-4 py-3">
      <div className="mx-auto grid max-w-7xl grid-cols-2 items-center gap-2 lg:flex lg:flex-wrap">
        <Boton tono="principal" ancho onClick={() => dispatch({ type: 'AVISO_CORTE' })}>
          1. Llega aviso de corte (sector Bajo)
        </Boton>
        <Boton tono="principal" ancho onClick={() => dispatch({ type: 'AVISO_CAUDAL' })}>
          2. Menos caudal (sector Alto)
        </Boton>
        <Boton tono="principal" ancho onClick={() => dispatch({ type: 'AGENDA' })}>
          3. Revisar cuotas de agua
        </Boton>
        <Segmentado
          etiqueta="Reservorio de Rosa:"
          valor={rosa?.reservorioEstado ?? 'desconocido'}
          opciones={[
            { valor: 'con_agua', texto: 'Con agua' },
            { valor: 'vacio', texto: 'Vacío' },
          ]}
          onChange={(valor) => dispatch({ type: 'RESERVORIO', parcelaId: ROSA, valor })}
        />
        <Boton tono="aviso" onClick={() => dispatch({ type: 'AVISO_VENCIDO' })}>
          Enviar aviso vencido
        </Boton>
        <Boton tono="aviso" onClick={() => dispatch({ type: 'AVISO_SIN_FUENTE' })}>
          Enviar aviso sin fuente verificada
        </Boton>
        <Boton onClick={() => dispatch({ type: 'ADELANTAR', horas: 24 })}>Adelantar 24 h</Boton>
        <Boton
          onClick={() => {
            dispatch({ type: 'REINICIAR' });
            onChat(ROSA);
          }}
        >
          Reiniciar demo
        </Boton>
        <Segmentado
          etiqueta="Ver teléfono de:"
          valor={chatId}
          opciones={[
            ...estado.parcelas.map((p) => ({
              valor: p.id,
              texto: estado.productores.find((x) => x.id === p.productorId)?.nombre ?? p.alias,
            })),
            ...(estado.registro.paso === 'completo' ? [] : [{ valor: PARCELA_NUEVA, texto: 'Número nuevo' }]),
          ]}
          onChange={onChat}
        />
        <p className="col-span-2 text-sm text-stone-600 lg:ml-auto">
          Reloj de la demo: <strong className="text-stone-900">{dia} {formatoHora(estado.ahora)}</strong>
        </p>
      </div>
    </section>
  );
}
