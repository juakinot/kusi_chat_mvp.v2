import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { crearEstadoDemo, eventoCaudalAlto, eventoSinFuente, eventoVencido } from '../data/seed';
import {
  adelantarTiempo,
  alternarRegla,
  anotarCoordinacion,
  aplicar,
  cambiarReservorio,
  cerrarCaso,
  fechaLocal,
  iniciarConsulta,
  marcarEnRevision,
  mostrarMenu,
  pedirPersona,
  procesarEvento,
  procesarRespuesta,
  procesarTextoLibre,
  responderComoAgronomo,
  revisarAgenda,
} from '../engine/engine';
import type { Perfil } from '../engine/permisos';
import type { Estado, NecesidadId, ReservorioEstado } from '../engine/types';

const CLAVE = 'kusichat-2-v2';

export type Accion =
  | { type: 'AVISO_CAUDAL' }
  | { type: 'AGENDA' }
  | { type: 'MENU'; parcelaId: string }
  | { type: 'CONSULTA'; parcelaId: string; consultaId: string }
  | { type: 'AVISO_VENCIDO' }
  | { type: 'AVISO_SIN_FUENTE' }
  | { type: 'RESERVORIO'; parcelaId: string; valor: ReservorioEstado }
  | { type: 'ADELANTAR'; horas: number }
  | { type: 'REINICIAR' }
  | { type: 'RESPONDER'; casoId: string; respuestaId: string }
  | { type: 'PERSONA'; parcelaId: string }
  | { type: 'TEXTO'; parcelaId: string; texto: string }
  | { type: 'REGLA'; reglaId: string; perfil: Perfil }
  | { type: 'EN_REVISION'; casoIds: string | string[]; perfil: Perfil }
  | { type: 'RESPONDER_AGRONOMO'; casoId: string; texto: string; seguimiento?: string; perfil: Perfil }
  | { type: 'CERRAR_CASO'; casoId: string; perfil: Perfil }
  | { type: 'COORDINAR'; necesidad: NecesidadId; detalle: string; perfil: Perfil }
  | { type: 'TICK' };

function reducer(e: Estado, a: Accion): Estado {
  const { ahora } = e;
  switch (a.type) {
    case 'AVISO_CAUDAL':
      return aplicar(e, procesarEvento(e, eventoCaudalAlto(e.inicio), ahora));
    case 'AGENDA':
      return aplicar(e, revisarAgenda(e, ahora));
    case 'MENU':
      return aplicar(e, mostrarMenu(e, a.parcelaId, ahora));
    case 'CONSULTA':
      return aplicar(e, iniciarConsulta(e, a.parcelaId, a.consultaId, ahora));
    case 'AVISO_VENCIDO':
      return aplicar(e, procesarEvento(e, eventoVencido(ahora), ahora));
    case 'AVISO_SIN_FUENTE':
      return aplicar(e, procesarEvento(e, eventoSinFuente(ahora), ahora));
    case 'RESERVORIO':
      return aplicar(e, cambiarReservorio(e, a.parcelaId, a.valor, ahora));
    case 'ADELANTAR':
      return aplicar(e, adelantarTiempo(e, a.horas));
    case 'REINICIAR':
      return crearEstadoDemo();
    case 'RESPONDER':
      return aplicar(e, procesarRespuesta(e, a.casoId, a.respuestaId, ahora));
    case 'PERSONA':
      return aplicar(e, pedirPersona(e, a.parcelaId, ahora));
    case 'TEXTO':
      return aplicar(e, procesarTextoLibre(e, a.parcelaId, a.texto, ahora));
    case 'REGLA':
      return aplicar(e, alternarRegla(e, a.reglaId, ahora, a.perfil));
    case 'EN_REVISION':
      return aplicar(e, marcarEnRevision(e, a.casoIds, ahora, a.perfil));
    case 'RESPONDER_AGRONOMO':
      return aplicar(e, responderComoAgronomo(e, a.casoId, a.texto, ahora, a.seguimiento, a.perfil));
    case 'CERRAR_CASO':
      return aplicar(e, cerrarCaso(e, a.casoId, ahora, a.perfil));
    case 'COORDINAR':
      return aplicar(e, anotarCoordinacion(e, a.necesidad, a.detalle, ahora, a.perfil));
    case 'TICK':
      return { ...e, ahora: new Date(new Date(ahora).getTime() + 1000).toISOString() };
  }
}

function cargar(): Estado {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado) {
      const estado = JSON.parse(guardado) as Estado;
      // Una corrida de otro día diría "mañana" por una fecha que ya pasó.
      if (fechaLocal(estado.inicio) === fechaLocal(new Date().toISOString())) return estado;
    }
  } catch {
    // Sin almacenamiento la demo sigue en memoria.
  }
  return crearEstadoDemo();
}

function guardar(estado: Estado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Sin almacenamiento la demo sigue en memoria.
  }
}

const Contexto = createContext<{ estado: Estado; dispatch: Dispatch<Accion> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, undefined, cargar);

  // Cada cambio real sube `seq`. Así el reloj no reescribe todo el estado cada segundo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => guardar(estado), [estado.seq]);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(id);
  }, []);

  return <Contexto.Provider value={{ estado, dispatch }}>{children}</Contexto.Provider>;
}

export function useStore() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useStore fuera de StoreProvider');
  return valor;
}
