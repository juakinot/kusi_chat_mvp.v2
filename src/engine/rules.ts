import type { Regla } from './types';

export const SIN_VALIDACION = 'Ejemplo – sin validación profesional';

const VIGENCIA = {
  vigenteDesde: '2026-01-01T00:00:00-05:00',
  vigenteHasta: '2030-12-31T23:59:59-05:00',
};

/** Las reglas son datos: se leen, se suspenden y se auditan sin tocar el motor. */
export const REGLAS: Regla[] = [
  {
    id: 'R-AGUA-01',
    version: 1,
    nombre: 'Aviso por parcela',
    aprobadaPor: SIN_VALIDACION,
    activa: true,
    ...VIGENCIA,
    descripcion:
      'Si llega un evento de agua válido, se avisa solo a las parcelas del sector afectado que tienen riego pendiente.',
  },
  {
    id: 'R-AGUA-02',
    version: 1,
    nombre: 'Alternativa disponible',
    aprobadaPor: SIN_VALIDACION,
    activa: true,
    ...VIGENCIA,
    descripcion:
      'Si el productor no ha regado, tiene reservorio con agua y existe un plan aprobado, se le recuerda el paso del plan y se programa el seguimiento.',
  },
  {
    id: 'R-AGUA-03',
    version: 1,
    nombre: 'Sin alternativa → agrónomo',
    aprobadaPor: SIN_VALIDACION,
    activa: true,
    ...VIGENCIA,
    descripcion:
      'Si el reservorio está vacío, no hay reservorio o la respuesta es "No sé" dos veces, se abre un caso de prioridad alta con plazo antes del turno. KUSI no da instrucciones técnicas.',
  },
  {
    id: 'R-SEG-01',
    version: 1,
    nombre: 'Seguimiento',
    aprobadaPor: SIN_VALIDACION,
    activa: true,
    ...VIGENCIA,
    descripcion:
      'Al vencer el plazo (o al adelantar el tiempo), se pregunta qué ocurrió y el caso se cierra o queda pendiente.',
  },
  {
    id: 'R-REP-01',
    version: 1,
    nombre: 'Reporte de incidencia',
    aprobadaPor: SIN_VALIDACION,
    activa: true,
    ...VIGENCIA,
    descripcion:
      'Si el productor reporta una plaga, un daño o menos agua, se abre un caso para el agrónomo. KUSI no diagnostica. Si hay dos reportes iguales en un sector, los casos suben a prioridad alta.',
  },
  {
    id: 'R-AGE-01',
    version: 1,
    nombre: 'Recordatorio de cuota',
    aprobadaPor: SIN_VALIDACION,
    activa: true,
    ...VIGENCIA,
    descripcion:
      'Si el productor registró una cuota sin pagar, se le recuerda 3 días y 1 día antes del vencimiento. KUSI no cobra ni se conecta con bancos.',
  },
];
