import { REGLAS } from '../engine/rules';
import { enDia, fechaLocal, sumarHoras } from '../engine/engine';
import type { Estado, EventoAgua } from '../engine/types';

/** La demo siempre arranca a las 8:30 a. m. del día real: el plazo de las 7:00 p. m. nunca queda atrás. */
export function inicioDemo(): string {
  return enDia(new Date().toISOString(), 0, 8, 30);
}

export function crearEstadoInicial(inicio: string = inicioDemo()): Estado {
  return {
    inicio,
    ahora: inicio,
    seq: 0,
    productores: [
      { id: 'P-ROSA', nombre: 'Rosa', telefono: '+51 900 000 001', consentimiento: true },
      { id: 'P-JUAN', nombre: 'Juan', telefono: '+51 900 000 002', consentimiento: true },
    ],
    parcelas: [
      {
        id: 'PA-ROSA',
        productorId: 'P-ROSA',
        alias: 'Chacra del bajo',
        sector: 'Bajo',
        proximoRiego: enDia(inicio, 1, 6),
        riegoPendiente: true,
        tieneReservorio: true,
        reservorioEstado: 'con_agua',
        planAprobado:
          'Usar el agua del reservorio en el turno previsto, según tu plan revisado con el agrónomo.',
      },
      {
        id: 'PA-JUAN',
        productorId: 'P-JUAN',
        alias: 'Chacra de arriba',
        sector: 'Alto',
        proximoRiego: enDia(inicio, 1, 6),
        riegoPendiente: true,
        tieneReservorio: false,
        reservorioEstado: 'desconocido',
      },
    ],
    reglas: REGLAS.map((r) => ({ ...r })),
    eventos: [],
    eventosBloqueados: [],
    casos: [],
    mensajes: [],
    auditoria: [],
  };
}

export function eventoCorte(inicio: string): EventoAgua {
  return {
    id: 'EV-CORTE-BAJO',
    tipo: 'corte',
    origen: 'comision_regantes',
    fuenteVerificada: true,
    sector: 'Bajo',
    fechaAfectada: fechaLocal(enDia(inicio, 1, 12)),
    emitidoEn: inicio,
    vigenteHasta: enDia(inicio, 1, 18),
    descripcion: 'Corte del canal en el sector Bajo',
  };
}

/** Ya venció respecto al reloj actual de la demo. */
export function eventoVencido(ahora: string): EventoAgua {
  return {
    ...eventoCorte(ahora),
    id: 'EV-VENCIDO',
    emitidoEn: sumarHoras(ahora, -26),
    fechaAfectada: fechaLocal(sumarHoras(ahora, -24)),
    vigenteHasta: sumarHoras(ahora, -2),
    descripcion: 'Aviso antiguo de corte en el sector Bajo',
  };
}

export function eventoSinFuente(ahora: string): EventoAgua {
  return {
    ...eventoCorte(ahora),
    id: 'EV-SIN-FUENTE',
    origen: 'reporte_productor',
    fuenteVerificada: false,
    emitidoEn: ahora,
    descripcion: 'Rumor de corte en el sector Bajo, sin confirmar',
  };
}
