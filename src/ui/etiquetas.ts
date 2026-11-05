import { diaRelativo, formatoHora } from '../engine/engine';
import type { EstadoCaso, Prioridad, Tema } from '../engine/types';

export const ESTADO_CASO: Record<EstadoCaso, string> = {
  pendiente_respuesta: 'Pendiente de respuesta',
  accion_sugerida: 'Acción sugerida',
  revision_tecnica: 'Por revisar',
  en_revision: 'En revisión',
  seguimiento_programado: 'Seguimiento programado',
  seguimiento_pendiente: 'Seguimiento pendiente',
  cerrado: 'Cerrado',
  vencido: 'Vencido',
  bloqueado: 'Bloqueado',
};

export const PRIORIDAD: Record<Prioridad, { texto: string; clase: string }> = {
  alta: { texto: 'Prioridad alta', clase: 'bg-red-100 text-red-900' },
  media: { texto: 'Prioridad media', clase: 'bg-amber-100 text-amber-900' },
  baja: { texto: 'Prioridad baja', clase: 'bg-emerald-100 text-emerald-900' },
};

export const TEMA: Record<Tema, string> = {
  agua: 'Agua',
  plaga: 'Hojas o ramas',
  dano: 'Daño',
  pago: 'Cuota',
  persona: 'Persona',
};

export function textoPlazo(plazo: string | undefined, ahora: string): string {
  if (!plazo) return 'Sin plazo';
  if (new Date(plazo).getTime() <= new Date(ahora).getTime()) return 'Plazo vencido';
  const dia = diaRelativo(plazo, ahora);
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, antes de las ${formatoHora(plazo)}`;
}
