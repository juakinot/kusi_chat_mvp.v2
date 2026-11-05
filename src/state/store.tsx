import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { crearEstadoInicial, eventoCorte, eventoSinFuente, eventoVencido } from '../data/seed';
import {
  adelantarTiempo,
  alternarRegla,
  aplicar,
  cambiarReservorio,
  cerrarCaso,
  pedirPersona,
  procesarEvento,
  procesarRespuesta,
  procesarTextoLibre,
  responderComoAgronomo,
} from '../engine/engine';
import type { Estado, ReservorioEstado } from '../engine/types';

const CLAVE = 'kusichat-mvp-v1';

export type Accion =
  | { type: 'AVISO_CORTE' }
  | { type: 'AVISO_VENCIDO' }
  | { type: 'AVISO_SIN_FUENTE' }
  | { type: 'RESERVORIO'; parcelaId: string; valor: ReservorioEstado }
  | { type: 'ADELANTAR'; horas: number }
  | { type: 'REINICIAR' }
  | { type: 'RESPONDER'; casoId: string; respuestaId: string }
  | { type: 'PERSONA'; parcelaId: string }
  | { type: 'TEXTO'; parcelaId: string; texto: string }
  | { type: 'REGLA'; reglaId: string }
  | { type: 'RESPONDER_AGRONOMO'; casoId: string; texto: string }
  | { type: 'CERRAR_CASO'; casoId: string }
  | { type: 'TICK' };

function reducer(e: Estado, a: Accion): Estado {
  const { ahora } = e;
  switch (a.type) {
    case 'AVISO_CORTE':
      return aplicar(e, procesarEvento(e, eventoCorte(e.inicio), ahora));
    case 'AVISO_VENCIDO':
      return aplicar(e, procesarEvento(e, eventoVencido(ahora), ahora));
    case 'AVISO_SIN_FUENTE':
      return aplicar(e, procesarEvento(e, eventoSinFuente(ahora), ahora));
    case 'RESERVORIO':
      return aplicar(e, cambiarReservorio(e, a.parcelaId, a.valor, ahora));
    case 'ADELANTAR':
      return aplicar(e, adelantarTiempo(e, a.horas));
    case 'REINICIAR':
      return crearEstadoInicial();
    case 'RESPONDER':
      return aplicar(e, procesarRespuesta(e, a.casoId, a.respuestaId, ahora));
    case 'PERSONA':
      return aplicar(e, pedirPersona(e, a.parcelaId, ahora));
    case 'TEXTO':
      return aplicar(e, procesarTextoLibre(e, a.parcelaId, a.texto, ahora));
    case 'REGLA':
      return aplicar(e, alternarRegla(e, a.reglaId, ahora));
    case 'RESPONDER_AGRONOMO':
      return aplicar(e, responderComoAgronomo(e, a.casoId, a.texto, ahora));
    case 'CERRAR_CASO':
      return aplicar(e, cerrarCaso(e, a.casoId, ahora));
    case 'TICK':
      return { ...e, ahora: new Date(new Date(ahora).getTime() + 1000).toISOString() };
  }
}

function cargar(): Estado {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado) return JSON.parse(guardado) as Estado;
  } catch {
    // Sin almacenamiento la demo sigue en memoria.
  }
  return crearEstadoInicial();
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

  useEffect(() => guardar(estado), [estado]);

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
