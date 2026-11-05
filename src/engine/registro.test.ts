import { beforeEach, describe, expect, it } from 'vitest';
import { crearEstadoInicial, eventoCaudalAlto, eventoCorte } from '../data/seed';
import { compararPerfiles } from './comparar';
import {
  adelantarTiempo,
  alternarRegla,
  aplicar,
  iniciarConsulta,
  PARCELA_NUEVA,
  pedirPersona,
  procesarEvento,
  procesarRespuesta,
  procesarTextoLibre,
  revisarAgenda,
  TEXTO_SOLO_BOTONES,
} from './engine';
import type { Estado, Resultado } from './types';

const INICIO = new Date(2026, 10, 5, 8, 30).toISOString();

let estado: Estado;
const correr = (fn: (e: Estado) => Resultado) => {
  const r = fn(estado);
  estado = aplicar(estado, r);
  return r;
};
const escribir = (texto: string, parcelaId = PARCELA_NUEVA) =>
  correr((e) => procesarTextoLibre(e, parcelaId, texto, e.ahora));
const pulsar = (id: string) => correr((e) => iniciarConsulta(e, PARCELA_NUEVA, id, e.ahora));
const chat = (parcelaId = PARCELA_NUEVA) => estado.mensajes.filter((m) => m.parcelaId === parcelaId);
const ultimo = (parcelaId = PARCELA_NUEVA) => chat(parcelaId).at(-1)?.texto ?? '';
const nueva = () => estado.parcelas.find((p) => p.id === PARCELA_NUEVA);
const casoNuevo = () => [...estado.casos].reverse().find((c) => c.parcelaId === PARCELA_NUEVA);

function registrar(sector = 'Bajo', reservorio = 'si', turno = 'manana') {
  escribir('Hola');
  pulsar('acepta');
  escribir('Carmen');
  escribir('Chacra del canal');
  pulsar(sector);
  pulsar(reservorio);
  pulsar(turno);
  pulsar('correcto');
}

beforeEach(() => {
  estado = crearEstadoInicial(INICIO);
});

describe('consentimiento', () => {
  it('"Hola" explica quién está detrás y pide aceptar', () => {
    escribir('Hola');
    expect(ultimo()).toContain('Guardamos tu nombre, parcela y respuestas solo para atenderte. ¿Aceptas?');
    expect(chat().at(-1)?.botones?.map((b) => b.etiqueta)).toEqual(['Sí', 'No', 'Quiero saber más']);
  });

  it('"No" no guarda nada y permite volver con Hola', () => {
    escribir('Hola');
    pulsar('rechaza');
    expect(ultimo()).toContain('No guardé ningún dato tuyo');
    expect(nueva()).toBeUndefined();
    expect(estado.productores).toHaveLength(3);
    escribir('Hola');
    expect(ultimo()).toContain('¿Aceptas?');
  });

  it('"Quiero saber más" vuelve a preguntar', () => {
    escribir('Hola');
    pulsar('saber_mas');
    expect(ultimo()).toContain('Puedes salir cuando quieras escribiendo BAJA');
    expect(chat().filter((m) => m.botones)).toHaveLength(1);
  });

  it('nada pasa a la ficha antes de confirmar', () => {
    escribir('Hola');
    pulsar('acepta');
    escribir('Carmen');
    expect(nueva()).toBeUndefined();
    expect(estado.productores.some((p) => p.nombre === 'Carmen')).toBe(false);
  });

  it('un botón esperado no se reemplaza con texto', () => {
    escribir('Hola');
    escribir('tal vez');
    expect(ultimo()).toBe(TEXTO_SOLO_BOTONES);
    expect(estado.registro.paso).toBe('consentimiento');
  });

  it('R-REG-01 suspendida: no abre registro', () => {
    correr((e) => alternarRegla(e, 'R-REG-01', e.ahora));
    const r = escribir('Hola');
    expect(ultimo()).toContain('el registro está en pausa');
    expect(r.auditoria.some((a) => a.tipo === 'bloqueo')).toBe(true);
  });

  it('PERSONA funciona antes de tener ficha', () => {
    correr((e) => pedirPersona(e, PARCELA_NUEVA, e.ahora));
    expect(ultimo()).toContain('La facilitadora te llamará');
  });
});

describe('registro completo', () => {
  it('crea la ficha y confirma el resumen', () => {
    registrar();
    expect(nueva()).toMatchObject({
      alias: 'Chacra del canal',
      sector: 'Bajo',
      tieneReservorio: true,
      riegoPendiente: true,
    });
    expect(ultimo()).toContain('Listo, Carmen. Registré "Chacra del canal", sector Bajo, con reservorio o pozo.');
    expect(ultimo()).toContain('Escribe PERSONA si necesitas hablar con alguien o BAJA para salir.');
  });

  it('muestra el resumen y "Corregir" vuelve a empezar sin perder el consentimiento', () => {
    escribir('Hola');
    pulsar('acepta');
    escribir('Carmen');
    escribir('Chacra');
    pulsar('Alto');
    pulsar('no');
    pulsar('pasado');
    expect(ultimo()).toContain('Nombre: Carmen');
    expect(ultimo()).toContain('Sector: Alto');
    pulsar('corregir');
    expect(ultimo()).toContain('¿Cómo te llamas?');
    expect(estado.registro.paso).toBe('nombre');
  });

  it('entra al cruce: el aviso le llega, y sin plan pasa al agrónomo', () => {
    registrar();
    correr((e) => procesarEvento(e, eventoCorte(INICIO), e.ahora));
    expect(ultimo()).toContain('¿Ya regaste "Chacra del canal"?');
    const id = () => casoNuevo()!.id;
    correr((e) => procesarRespuesta(e, id(), 'todavia_no', e.ahora));
    correr((e) => procesarRespuesta(e, id(), 'si_agua', e.ahora));
    expect(casoNuevo()).toMatchObject({
      estado: 'revision_tecnica',
      motivo: 'No hay plan aprobado para esta parcela',
    });
  });

  it('con un aviso vigente en su sector lo recibe al terminar', () => {
    correr((e) => procesarEvento(e, eventoCorte(INICIO), e.ahora));
    registrar();
    expect(ultimo()).toContain('¿Ya regaste "Chacra del canal"?');
  });

  it('un aviso de otro sector no le llega', () => {
    correr((e) => procesarEvento(e, eventoCaudalAlto(INICIO), e.ahora));
    registrar('Bajo');
    expect(ultimo()).toContain('Listo, Carmen');
    expect(casoNuevo()).toBeUndefined();
  });

  it('sector "No sé": no se rellena, no recibe avisos y abre un caso', () => {
    registrar('no_se');
    expect(nueva()?.sector).toBeNull();
    expect(ultimo()).toContain('Hasta confirmar tu sector no recibirás avisos de agua.');
    expect(casoNuevo()).toMatchObject({ estado: 'revision_tecnica', motivo: 'Registro sin sector confirmado' });
    const total = chat().length;
    correr((e) => procesarEvento(e, eventoCorte(INICIO), e.ahora));
    expect(chat()).toHaveLength(total);
    expect(estado.auditoria.some((a) => a.resultado.includes('no afectada (sector sin confirmar)'))).toBe(true);
  });

  it('turno "No sé": queda sin riego pendiente y el aviso no le llega', () => {
    registrar('Bajo', 'si', 'no_se');
    expect(nueva()).toMatchObject({ riegoPendiente: false, proximoRiego: '' });
    expect(ultimo()).toContain('Todavía falta confirmar tu turno.');
    correr((e) => procesarEvento(e, eventoCorte(INICIO), e.ahora));
    expect(casoNuevo()).toBeUndefined();
  });

  it('aparece en Comparar', () => {
    registrar();
    const corte = compararPerfiles(estado).find((c) => c.id === 'corte')!;
    expect(corte.resultados.map((r) => r.nombre)).toEqual(['Rosa', 'Juan', 'Elena', 'Carmen']);
  });

  it('sin sector, Comparar no inventa un aviso', () => {
    registrar('no_se');
    const r = compararPerfiles(estado)
      .find((c) => c.id === 'corte')!
      .resultados.find((x) => x.nombre === 'Carmen')!;
    expect(r.mensaje).toBe('No recibe ningún mensaje.');
  });
});

describe('BAJA', () => {
  it('retira el consentimiento y corta avisos y recordatorios', () => {
    escribir('baja', 'PA-ROSA');
    expect(estado.productores.find((p) => p.id === 'P-ROSA')?.consentimiento).toBe(false);
    expect(ultimo('PA-ROSA')).toContain('te di de baja');
    const total = chat('PA-ROSA').length;
    correr((e) => procesarEvento(e, eventoCorte(INICIO), e.ahora));
    correr((e) => revisarAgenda(e, e.ahora));
    expect(chat('PA-ROSA')).toHaveLength(total);
    expect(estado.auditoria.some((a) => a.resultado === 'Parcela de Rosa no afectada (sin consentimiento)')).toBe(true);
  });

  it('cierra sus casos: no llega el seguimiento', () => {
    correr((e) => procesarEvento(e, eventoCorte(INICIO), e.ahora));
    const id = estado.casos[0].id;
    correr((e) => procesarRespuesta(e, id, 'todavia_no', e.ahora));
    correr((e) => procesarRespuesta(e, id, 'si_agua', e.ahora));
    escribir('BAJA', 'PA-ROSA');
    expect(estado.casos[0]).toMatchObject({ estado: 'cerrado', motivo: 'El productor se dio de baja' });
    const total = chat('PA-ROSA').length;
    correr((e) => adelantarTiempo(e, 24));
    expect(chat('PA-ROSA')).toHaveLength(total);
  });

  it('durante el registro cancela sin guardar', () => {
    escribir('Hola');
    pulsar('acepta');
    escribir('BAJA');
    expect(ultimo()).toContain('No guardé ningún dato tuyo');
    expect(nueva()).toBeUndefined();
  });
});
