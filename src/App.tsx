import { useState } from 'react';
import { AgronomistPanel } from './ui/AgronomistPanel';
import { ControlBar } from './ui/ControlBar';
import { PhoneChat } from './ui/PhoneChat';

export default function App() {
  const [chatId, setChatId] = useState('PA-ROSA');
  const [vistaMovil, setVistaMovil] = useState<'chat' | 'panel'>('chat');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10">
        <p className="bg-amber-200 px-4 py-1.5 text-center text-sm font-semibold text-amber-950">
          DATOS DE DEMOSTRACIÓN · Personas, avisos y reglas ficticias · Las reglas no tienen validación profesional
        </p>
      </header>
      <ControlBar chatId={chatId} onChat={setChatId} />

      <div className="flex border-b border-stone-200 bg-white lg:hidden" role="tablist" aria-label="Vista">
        {(
          [
            ['chat', 'Teléfono'],
            ['panel', 'Panel del agrónomo'],
          ] as const
        ).map(([id, texto]) => (
          <button
            key={id}
            role="tab"
            aria-selected={vistaMovil === id}
            onClick={() => setVistaMovil(id)}
            className={`min-h-11 flex-1 border-b-2 text-sm font-semibold ${
              vistaMovil === id ? 'border-oliva text-oliva-oscuro' : 'border-transparent text-stone-600'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className={vistaMovil === 'chat' ? '' : 'hidden lg:block'}>
          <PhoneChat parcelaId={chatId} />
        </div>
        <div className={`min-w-0 ${vistaMovil === 'panel' ? '' : 'hidden lg:block'}`}>
          <AgronomistPanel />
        </div>
      </main>
    </div>
  );
}
