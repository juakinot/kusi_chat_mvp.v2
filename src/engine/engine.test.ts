import { beforeEach, describe, expect, it } from 'vitest';
import { crearEstadoInicial, eventoCorte, eventoSinFuente, eventoVencido } from '../data/seed';
import {
  adelantarTiempo,
  alternarRegla,
  aplicar,
  cambiarReservorio,
  cerrarCaso,
  parcelasAfectadas,
  pedirPersona,
  procesarEvento,
  procesarRespuesta,
  procesarTextoLibre,
  responderComoAgronomo,
  TEXTO_SOLO_BOTONES,
  validarEvento,
} from './engine';
import type { Estado, EventoAgua, Resultado } from './types';

const INICIO = new Date(2026, 10, 5, 8, 30).toISOString();

let estado: Estado;
const correr = (fn: (e: Estado) => Resultado) => {
  const r = fn(estado);
  estado = aplicar(estado, r);
  return r;
};
const aviso = () => correr((e) => procesarEvento(e, eventoCorte(INICIO), e.ahora));
const responder = (id: string) => correr((e) => procesarRespuesta(e, e.casos[0].id, id, e.ahora));
const chat = (parcelaId: string) => estado.mensajes.filter((m) => m.parcelaId === parcelaId);
const caso = () => estado.casos[0];

beforeEach(() => {
  estado = crearEstadoInicial(INICIO);
});

describe('aviso de agua', () => {
  it('1. aviso válido del sector Bajo: caso solo para Rosa, Juan no recibe nada', () => {
    aviso();
    expect(estado.casos).toHaveLength(1);
    expect(caso().parcelaId).toBe('PA-ROSA');
    expect(caso().estado).toBe('pendiente_respuesta');
    expect(chat('PA-ROSA')).toHaveLength(1);
    expect(chat('PA-JUAN')).toHaveLength(0);
    expect(chat('PA-ROSA')[0].texto).toBe(
      'Hola, Rosa 🌱. Tenemos un aviso sobre el agua de tu sector para mañana. ¿Ya regaste tus olivos?',
    );
    expect(estado.auditoria.some((a) => a.resultado === 'Parcela de Juan no afectada (sector Alto)')).toBe(true);
  });

  it('2. el mismo evento dos veces no duplica casos ni mensajes', () => {
    aviso();
    const r = aviso();
    expect(estado.casos).toHaveLength(1);
    expect(estado.mensajes).toHaveLength(1);
    expect(r.auditoria[0].resultado).toContain('Evento duplicado ignorado');
  });

  it('3. aviso vencido: ningún mensaje y bloqueo auditado', () => {
    const r = correr((e) => procesarEvento(e, eventoVencido(e.ahora), e.ahora));
    expect(estado.mensajes).toHaveLength(0);
    expect(estado.casos).toHaveLength(0);
    expect(r.auditoria.some((a) => a.tipo === 'bloqueo')).toBe(true);
    expect(estado.eventosBloqueados).toHaveLength(1);
  });

  it('4. aviso sin fuente verificada: ningún mensaje y bloqueo auditado', () => {
    const r = correr((e) => procesarEvento(e, eventoSinFuente(e.ahora), e.ahora));
    expect(estado.mensajes).toHaveLength(0);
    expect(r.auditoria.some((a) => a.tipo === 'bloqueo')).toBe(true);
  });

  it('no rellena campos faltantes', () => {
    const sinSector = { ...eventoCorte(INICIO), sector: undefined } as unknown as EventoAgua;
    const sinFecha = { ...eventoCorte(INICIO), fechaAfectada: '' };
    expect(validarEvento(sinSector, INICIO).valido).toBe(false);
    expect(validarEvento(sinFecha, INICIO).valido).toBe(false);
  });

  it('solo cuenta parcelas con riego pendiente', () => {
    const parcelas = estado.parcelas.map((p) => ({ ...p, riegoPendiente: false }));
    expect(parcelasAfectadas(eventoCorte(INICIO), parcelas)).toHaveLength(0);
  });

  it('R-AGUA-01 suspendida: no envía; al reactivarla el aviso sí pasa', () => {
    correr((e) => alternarRegla(e, 'R-AGUA-01', e.ahora));
    aviso();
    expect(estado.mensajes).toHaveLength(0);
    expect(estado.eventosBloqueados).toHaveLength(1);
    correr((e) => alternarRegla(e, 'R-AGUA-01', e.ahora));
    aviso();
    expect(estado.mensajes).toHaveLength(1);
    expect(estado.eventosBloqueados).toHaveLength(0);
  });
});

describe('conversación', () => {
  beforeEach(() => {
    aviso();
  });

  it('"Ya regué" cierra el caso', () => {
    responder('ya_regue');
    expect(caso().estado).toBe('cerrado');
    expect(chat('PA-ROSA').at(-1)?.texto).toBe('Perfecto, lo registré. Te avisaré cuando haya un nuevo turno.');
  });

  it('5. "Todavía no" + reservorio con agua: acción sugerida con el plan', () => {
    responder('todavia_no');
    expect(chat('PA-ROSA').at(-1)?.texto).toBe('¿Tienes agua disponible en tu reservorio?');
    responder('si_agua');
    expect(caso().estado).toBe('accion_sugerida');
    const texto = chat('PA-ROSA').at(-1)?.texto ?? '';
    expect(texto).toContain('Usar el agua del reservorio en el turno previsto');
    expect(texto).toContain('Mañana a las 7:00 p. m. te pregunto cómo te fue.');
    expect(texto).not.toContain('..');
  });

  it('6. "Todavía no" + reservorio vacío: revisión técnica, alta, con plazo', () => {
    responder('todavia_no');
    responder('esta_vacio');
    expect(caso().estado).toBe('revision_tecnica');
    expect(caso().prioridad).toBe('alta');
    expect(caso().plazo).toBe(new Date(2026, 10, 5, 19, 0).toISOString());
    expect(estado.parcelas[0].reservorioEstado).toBe('vacio');
    expect(chat('PA-ROSA').at(-1)?.texto).toBe(
      'Rosa, registré que no tienes agua disponible. Enviaré tu caso al especialista para que revise las alternativas. Te avisaremos cuando haya una respuesta.',
    );
  });

  it('cambia el dato, cambia la decisión: reservorio vacío en el registro no da paso seguro', () => {
    correr((e) => cambiarReservorio(e, 'PA-ROSA', 'vacio', e.ahora));
    responder('todavia_no');
    responder('si_agua');
    expect(caso().estado).toBe('revision_tecnica');
    expect(caso().reglaId).toBe('R-AGUA-03');
  });

  it('7. dos "No sé" pasan a revisión técnica', () => {
    responder('no_se');
    expect(caso().estado).toBe('pendiente_respuesta');
    expect(chat('PA-ROSA').at(-1)?.botones?.map((b) => b.etiqueta)).toEqual(['Sí recibió', 'No recibió', 'No sé']);
    responder('no_se');
    expect(caso().estado).toBe('revision_tecnica');
    expect(caso().reglaId).toBe('R-AGUA-03');
  });

  it('"No sé" y luego "No sé" sobre el reservorio también suma dos', () => {
    responder('no_se');
    responder('no_recibio');
    responder('no_se');
    expect(caso().estado).toBe('revision_tecnica');
  });

  it('8. R-AGUA-02 suspendida + reservorio con agua: revisión técnica por regla suspendida', () => {
    correr((e) => alternarRegla(e, 'R-AGUA-02', e.ahora));
    responder('todavia_no');
    responder('si_agua');
    expect(caso().estado).toBe('revision_tecnica');
    expect(caso().motivo).toContain('Regla suspendida');
  });

  it('una respuesta repetida se ignora: los botones valen una sola vez', () => {
    responder('ya_regue');
    const total = estado.mensajes.length;
    const r = responder('ya_regue');
    expect(estado.mensajes).toHaveLength(total);
    expect(r.auditoria[0].tipo).toBe('bloqueo');
  });

  it('PERSONA lleva a revisión técnica en cualquier momento', () => {
    correr((e) => pedirPersona(e, 'PA-ROSA', e.ahora));
    expect(caso().estado).toBe('revision_tecnica');
    expect(caso().motivo).toBe('El productor pidió hablar con una persona');
    expect(chat('PA-ROSA').some((m) => m.botones)).toBe(false);
  });

  it('el texto libre recibe respuesta fija y "persona" escala', () => {
    correr((e) => procesarTextoLibre(e, 'PA-ROSA', 'hola', e.ahora));
    expect(chat('PA-ROSA').at(-1)?.texto).toBe(TEXTO_SOLO_BOTONES);
    expect(caso().estado).toBe('pendiente_respuesta');
    correr((e) => procesarTextoLibre(e, 'PA-ROSA', 'quiero una persona', e.ahora));
    expect(caso().estado).toBe('revision_tecnica');
  });

  it('el agrónomo responde y el mensaje llega al chat; luego cierra', () => {
    responder('todavia_no');
    responder('esta_vacio');
    correr((e) => responderComoAgronomo(e, e.casos[0].id, 'Rosa, ya vi tu reporte.', e.ahora));
    expect(chat('PA-ROSA').at(-1)).toMatchObject({ de: 'agronomo', texto: 'Rosa, ya vi tu reporte.' });
    correr((e) => cerrarCaso(e, e.casos[0].id, e.ahora));
    expect(caso().estado).toBe('cerrado');
  });
});

describe('paso del tiempo', () => {
  it('9. sin respuesta y 24 h después: caso vencido y el aviso no se reenvía', () => {
    aviso();
    const mensajes = estado.mensajes.length;
    correr((e) => adelantarTiempo(e, 24));
    expect(caso().estado).toBe('vencido');
    expect(caso().prioridad).toBe('alta');
    expect(estado.mensajes).toHaveLength(mensajes);
    expect(chat('PA-ROSA').some((m) => m.botones)).toBe(false);
    correr((e) => adelantarTiempo(e, 24));
    expect(estado.mensajes).toHaveLength(mensajes);
  });

  describe('seguimiento (R-SEG-01)', () => {
    beforeEach(() => {
      aviso();
      responder('todavia_no');
      responder('si_agua');
    });

    it('pregunta a la hora prometida', () => {
      correr((e) => adelantarTiempo(e, 24));
      expect(caso().estado).toBe('seguimiento_pendiente');
      expect(estado.ahora).toBe(new Date(2026, 10, 6, 19, 0).toISOString());
      expect(chat('PA-ROSA').at(-1)?.texto).toBe('Hola Rosa, ¿pudiste regar "Chacra del bajo"?');
    });

    it('"Sí pude" cierra', () => {
      correr((e) => adelantarTiempo(e, 24));
      responder('si_pude');
      expect(caso().estado).toBe('cerrado');
    });

    it('"No pude" deja el caso pendiente con la barrera registrada', () => {
      correr((e) => adelantarTiempo(e, 24));
      responder('no_pude');
      expect(caso()).toMatchObject({ estado: 'seguimiento_pendiente', prioridad: 'media', motivo: 'Barrera registrada' });
    });

    it('"Necesito una persona" va a revisión técnica', () => {
      correr((e) => adelantarTiempo(e, 24));
      responder('necesito_persona');
      expect(caso().estado).toBe('revision_tecnica');
    });

    it('R-SEG-01 suspendida: revisión técnica', () => {
      correr((e) => alternarRegla(e, 'R-SEG-01', e.ahora));
      correr((e) => adelantarTiempo(e, 24));
      expect(caso().estado).toBe('revision_tecnica');
      expect(caso().motivo).toContain('Regla suspendida');
    });
  });
});

describe('auditoría', () => {
  it('10. cada transición deja entrada con regla y versión', () => {
    const conRegla = (r: Resultado, id: string) => r.auditoria.some((a) => a.reglaId === id && a.reglaVersion === 1);

    expect(conRegla(aviso(), 'R-AGUA-01')).toBe(true);
    expect(responder('todavia_no').auditoria.length).toBeGreaterThan(0);
    expect(conRegla(responder('si_agua'), 'R-AGUA-02')).toBe(true);
    expect(conRegla(correr((e) => adelantarTiempo(e, 24)), 'R-SEG-01')).toBe(true);
    expect(conRegla(responder('no_pude'), 'R-SEG-01')).toBe(true);

    estado = crearEstadoInicial(INICIO);
    aviso();
    responder('todavia_no');
    expect(conRegla(responder('esta_vacio'), 'R-AGUA-03')).toBe(true);
    expect(caso()).toMatchObject({ reglaId: 'R-AGUA-03', reglaVersion: 1 });
    expect(new Set(estado.auditoria.map((a) => a.id)).size).toBe(estado.auditoria.length);
  });

  it('el motor no muta el estado recibido', () => {
    const copia = JSON.stringify(estado);
    procesarEvento(estado, eventoCorte(INICIO), estado.ahora);
    expect(JSON.stringify(estado)).toBe(copia);
  });
});
