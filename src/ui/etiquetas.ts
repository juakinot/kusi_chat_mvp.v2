import type { EstadoCaso, Prioridad, Tema } from '../engine/types';

export const ESTADO_CASO: Record<EstadoCaso, string> = {
  pendiente_respuesta: 'Pendiente de respuesta',
  accion_sugerida: 'Acción sugerida',
  revision_tecnica: 'Revisión técnica',
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
  plaga: 'Plaga',
  dano: 'Daño',
  pago: 'Cuota',
  persona: 'Persona',
};

export function cuentaRegresiva(plazo: string | undefined, ahora: string): string {
  if (!plazo) return 'Sin plazo';
  const seg = Math.floor((new Date(plazo).getTime() - new Date(ahora).getTime()) / 1000);
  if (seg <= 0) return 'Plazo vencido';
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  return `Quedan ${h} h ${String(m).padStart(2, '0')} min ${String(s).padStart(2, '0')} s`;
}
