import { useState } from 'react';
import { useStore } from './state/store';
import { AgronomistPanel } from './ui/AgronomistPanel';
import { ConexionEnVivo } from './ui/ConexionEnVivo';
import { DemoNav, type Vista } from './ui/DemoNav';
import { HerramientasDemo } from './ui/HerramientasDemo';
import { PanelLucia } from './ui/PanelLucia';
import { PhoneChat } from './ui/PhoneChat';

const ROSA = 'PA-ROSA';

export default function App() {
  const { dispatch } = useStore();
  const [vista, setVista] = useState<Vista>('rosa');
  const [chatId, setChatId] = useState(ROSA);
  const [corrida, setCorrida] = useState(0);

  const irA = (v: Vista) => {
    setVista(v);
    if (v === 'rosa') setChatId(ROSA);
    window.scrollTo({ top: 0 });
  };

  const reiniciar = () => {
    dispatch({ type: 'REINICIAR' });
    setVista('rosa');
    setChatId(ROSA);
    setCorrida((n) => n + 1); // las pantallas vuelven a su estado inicial
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DemoNav vista={vista} onVista={irA} onReiniciar={reiniciar} />

      <main key={corrida} className="mx-auto w-full max-w-7xl flex-1 p-3 sm:p-4">
        <div className={vista === 'rosa' ? 'grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]' : 'hidden'}>
          <PhoneChat parcelaId={chatId} />
          <div className="min-w-0 space-y-4">
            <ConexionEnVivo onVista={irA} />
            <HerramientasDemo chatId={chatId} onChat={setChatId} />
          </div>
        </div>
        <div className={vista === 'diego' ? '' : 'hidden'}>
          <AgronomistPanel />
        </div>
        <div className={vista === 'lucia' ? '' : 'hidden'}>
          <PanelLucia />
        </div>
      </main>
    </div>
  );
}
