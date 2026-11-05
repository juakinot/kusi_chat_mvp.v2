import { useEffect, useRef, useState, type FormEvent } from 'react';
import { INGENIERO, fechaLocal, formatoHora } from '../engine/engine';
import type { Mensaje } from '../engine/types';
import { useStore } from '../state/store';
import { SaleComparator } from './SaleComparator';

const FECHA = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

function Ticks({ estado }: { estado: Mensaje['estadoEnvio'] }) {
  if (estado === 'enviado') return <span aria-label="Enviado">✓</span>;
  return (
    <span aria-label={estado === 'respondido' ? 'Respondido' : 'Entregado'} className={estado === 'respondido' ? 'text-sky-600' : ''}>
      ✓✓
    </span>
  );
}

function Burbuja({ m, onBoton }: { m: Mensaje; onBoton: (casoId: string, respuestaId: string) => void }) {
  const delProductor = m.de === 'productor';
  const fondo = delProductor ? 'bg-white' : m.de === 'agronomo' ? 'bg-amber-100' : 'bg-[#d9fdd3]';
  return (
    <div className={`flex flex-col ${delProductor ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[88%] rounded-lg px-3 py-2 shadow-sm ${fondo}`}>
        {m.de === 'agronomo' && <p className="mb-0.5 text-sm font-bold text-amber-900">{INGENIERO}</p>}
        <p className="whitespace-pre-line break-words text-[15px] leading-snug text-stone-900">{m.texto}</p>
        <p className="mt-1 flex justify-end gap-1 text-sm text-stone-600">
          {formatoHora(m.hora)} <Ticks estado={m.estadoEnvio} />
        </p>
      </div>
      {m.botones && (
        <div className="mt-1.5 flex w-[88%] flex-col gap-1.5">
          {m.botones.map((b) => (
            <button
              key={b.id}
              onClick={() => m.casoId && onBoton(m.casoId, b.id)}
              className="min-h-11 rounded-lg border border-oliva/40 bg-white px-3 py-2 text-[15px] font-semibold text-oliva-oscuro shadow-sm hover:bg-oliva-claro"
            >
              {b.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PhoneChat({ parcelaId }: { parcelaId: string }) {
  const { estado, dispatch } = useStore();
  const [texto, setTexto] = useState('');
  const [vista, setVista] = useState<'chat' | 'venta'>('chat');
  const lista = useRef<HTMLDivElement>(null);

  const parcela = estado.parcelas.find((p) => p.id === parcelaId);
  const productor = estado.productores.find((p) => p.id === parcela?.productorId);
  const mensajes = estado.mensajes.filter((m) => m.parcelaId === parcelaId);

  useEffect(() => {
    setVista('chat');
  }, [mensajes.length, parcelaId]);

  useEffect(() => {
    if (lista.current) lista.current.scrollTop = lista.current.scrollHeight;
  }, [mensajes.length, parcelaId, vista]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio) return;
    dispatch({ type: 'TEXTO', parcelaId, texto: limpio });
    setTexto('');
  };

  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[2rem] border-[7px] border-stone-800 bg-stone-800 shadow-lg">
      <div className="flex h-[calc(100dvh-13rem)] min-h-[520px] max-h-[720px] flex-col overflow-hidden rounded-[1.5rem] bg-[#efe7dd]">
        <header className="flex items-center gap-3 bg-oliva px-4 py-3 text-white">
          <div aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 font-bold">
            K
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-tight">KUSI · KUSICHAT</p>
            <p className="truncate text-sm text-white/90">
              Teléfono de {productor?.nombre} · {parcela?.alias}
            </p>
          </div>
        </header>

        <div role="tablist" aria-label="Vista del teléfono" className="flex bg-oliva-oscuro text-sm font-semibold">
          {(
            [
              ['chat', 'Chat'],
              ['venta', 'Venta'],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              role="tab"
              aria-selected={vista === id}
              onClick={() => setVista(id)}
              className={`min-h-11 flex-1 border-b-2 ${
                vista === id ? 'border-white text-white' : 'border-transparent text-white/80'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <div className={vista === 'venta' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
          <SaleComparator />
        </div>

        <div ref={lista} className={`${vista === 'chat' ? 'flex' : 'hidden'} flex-1 flex-col gap-2 overflow-y-auto p-3`}>
          {mensajes.length === 0 && (
            <p className="m-auto rounded-lg bg-white/70 px-4 py-2 text-center text-sm text-stone-700">Sin mensajes</p>
          )}
          {mensajes.map((m, i) => {
            const nuevoDia = i === 0 || fechaLocal(m.hora) !== fechaLocal(mensajes[i - 1].hora);
            return (
              <div key={m.id} className="flex flex-col gap-2">
                {nuevoDia && (
                  <p className="self-center rounded-md bg-white/80 px-2 py-0.5 text-sm font-medium text-stone-700">
                    {FECHA.format(new Date(m.hora))}
                  </p>
                )}
                <Burbuja m={m} onBoton={(casoId, respuestaId) => dispatch({ type: 'RESPONDER', casoId, respuestaId })} />
              </div>
            );
          })}
        </div>

        <div className={`border-t border-stone-300 bg-[#f6f1ea] p-2 ${vista === 'chat' ? '' : 'hidden'}`}>
          <button
            onClick={() => dispatch({ type: 'PERSONA', parcelaId })}
            className="mb-2 min-h-11 w-full rounded-lg bg-oliva-oscuro px-3 text-sm font-bold tracking-wide text-white hover:bg-oliva"
          >
            PERSONA
          </button>
          <form onSubmit={enviar} className="flex gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe un mensaje"
              aria-label="Escribe un mensaje"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 text-[15px]"
            />
            <button type="submit" className="min-h-11 rounded-full bg-oliva px-4 text-sm font-semibold text-white">
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
