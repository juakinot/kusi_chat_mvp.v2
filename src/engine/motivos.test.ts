import { beforeEach, describe, expect, it } from 'vitest';
import { crearEstadoInicial, eventoCaudalAlto, eventoCorte } from '../data/seed';
import { compararPerfiles } from './comparar';
import {
  adelantarTiempo,
  alternarRegla,
  aplicar,
  iniciarConsulta,
  mostrarMenu,
  procesarEvento,
  procesarRespuesta,
  revisarAgenda,
} from './engine';
import type { Estado, Resultado } from './types';

const INICIO = new Date(2026, 10, 5, 8, 30).toISOString();
const ROSA = 'PA-ROSA';
const JUAN = 'PA-JUAN';
const ELENA = 'PA-ELENA';

let estado: Estado;
const correr = (fn: (e: Estado) => Resultado) => {
  const r = fn(estado);
  estado = aplicar(estado, r);
  return r;
};
const consultar = (parcelaId: string, id: string) => correr((e) => iniciarConsulta(e, parcelaId, id, e.ahora));
const casoDe = (parcelaId: string) => [...estado.casos].reverse().find((c) => c.parcelaId === parcelaId)!;
const responder = (parcelaId: string, id: string) =>
  correr((e) => procesarRespuesta(e, casoDe(parcelaId).id, id, e.ahora));
const chat = (parcelaId: string) => estado.mensajes.filter((m) => m.parcelaId === parcelaId);
const ultimo = (parcelaId: string) => chat(parcelaId).at(-1)?.texto ?? '';

beforeEach(() => {
  estado = crearEstadoInicial(INICIO);
});

describe('tercer perfil', () => {
  it('el corte del sector Bajo tampoco llega a Elena', () => {
    correr((e) => procesarEvento(e, eventoCorte(INICIO), e.ahora));
    expect(chat(ELENA)).toHaveLength(0);
    expect(estado.auditoria.some((a) => a.resultado === 'Parcela de Elena no afectada (sector Alto)')).toBe(true);
  });

  it('menos caudal en el sector Alto: Juan y Elena reciben aviso, Rosa no; la misma respuesta da caminos distintos', () => {
    correr((e) => procesarEvento(e, eventoCaudalAlto(INICIO), e.ahora));
    expect(chat(ROSA)).toHaveLength(0);
    expect(chat(JUAN)[0].texto).toBe('Hola, Juan 🌱. Tenemos un aviso sobre el agua de tu sector para mañana. ¿Ya regaste tus olivos?');

    responder(JUAN, 'todavia_no');
    expect(casoDe(JUAN)).toMatchObject({ estado: 'revision_tecnica', motivo: 'No tiene reservorio' });

    responder(ELENA, 'todavia_no');
    expect(ultimo(ELENA)).toBe('¿Tienes agua disponible en tu reservorio?');
    responder(ELENA, 'si_agua');
    expect(casoDe(ELENA)).toMatchObject({
      estado: 'revision_tecnica',
      motivo: 'No hay plan aprobado para esta parcela',
    });
  });
});

describe('menú', () => {
  it('se reemplaza: solo queda un menú con botones', () => {
    correr((e) => mostrarMenu(e, ROSA, e.ahora));
    correr((e) => mostrarMenu(e, ROSA, e.ahora));
    expect(chat(ROSA).filter((m) => m.botones)).toHaveLength(1);
    consultar(ROSA, 'cuota');
    expect(chat(ROSA).filter((m) => m.botones)).toHaveLength(0);
  });
});

describe('plaga', () => {
  it('abre caso prioritario y no diagnostica', () => {
    consultar(ROSA, 'plaga');
    expect(casoDe(ROSA)).toMatchObject({ tema: 'plaga', estado: 'pendiente_respuesta' });
    responder(ROSA, 'esta_semana');
    expect(casoDe(ROSA)).toMatchObject({ estado: 'revision_tecnica', prioridad: 'alta', reglaId: 'R-REP-01' });
    expect(ultimo(ROSA)).toBe('El especialista lo revisará y te escribirá antes de las 7:00 p. m.');
  });

  it('dos reportes del mismo sector se cruzan; otro sector no', () => {
    consultar(ROSA, 'plaga');
    responder(ROSA, 'esta_semana');
    consultar(JUAN, 'plaga');
    responder(JUAN, 'esta_semana');
    expect(casoDe(JUAN).motivo).not.toContain('reportes');

    consultar(ELENA, 'plaga');
    responder(ELENA, 'mas_tiempo');
    expect(casoDe(JUAN).motivo).toContain('2 reportes de cambios en hojas o ramas en el sector Alto');
    expect(casoDe(ELENA).motivo).toContain('2 reportes de cambios en hojas o ramas en el sector Alto');
    expect(casoDe(ROSA).motivo).not.toContain('reportes');
  });
});

describe('daño', () => {
  it('quien no tiene reservorio no ve esa opción', () => {
    consultar(JUAN, 'dano');
    responder(JUAN, 'no_personas');
    expect(chat(JUAN).at(-1)?.botones?.map((b) => b.id)).toEqual(['dano_canal', 'dano_arboles']);
    consultar(ROSA, 'dano');
    responder(ROSA, 'no_personas');
    expect(chat(ROSA).at(-1)?.botones?.map((b) => b.id)).toContain('dano_reservorio');
  });

  it('personas en peligro: deriva a emergencias', () => {
    consultar(ROSA, 'dano');
    responder(ROSA, 'si_personas');
    expect(casoDe(ROSA)).toMatchObject({ estado: 'revision_tecnica', prioridad: 'alta' });
    expect(ultimo(ROSA)).toContain('Llama ahora a emergencias');
  });

  it('un reservorio dañado cambia la decisión del corte de agua', () => {
    consultar(ROSA, 'dano');
    responder(ROSA, 'no_personas');
    responder(ROSA, 'dano_reservorio');
    correr((e) => procesarEvento(e, eventoCorte(INICIO), e.ahora));
    responder(ROSA, 'todavia_no');
    responder(ROSA, 'si_agua');
    expect(casoDe(ROSA)).toMatchObject({
      estado: 'revision_tecnica',
      motivo: 'No hay plan aprobado para esta parcela',
    });
  });

  it('R-REP-01 suspendida: sigue llegando al agrónomo con el motivo', () => {
    correr((e) => alternarRegla(e, 'R-REP-01', e.ahora));
    consultar(ROSA, 'plaga');
    responder(ROSA, 'esta_semana');
    expect(casoDe(ROSA).motivo).toContain('Regla suspendida');
  });
});

describe('menos agua reportada por el productor', () => {
  it('sin aviso abre caso medio y no avisa a nadie más', () => {
    consultar(JUAN, 'menos_agua');
    expect(casoDe(JUAN)).toMatchObject({ estado: 'revision_tecnica', prioridad: 'media', tema: 'agua' });
    expect(chat(ELENA)).toHaveLength(0);
    expect(ultimo(JUAN)).toContain('No avisamos a otros productores hasta confirmarlo.');
  });

  it('con aviso verificado vigente no abre caso', () => {
    correr((e) => procesarEvento(e, eventoCorte(INICIO), e.ahora));
    const casos = estado.casos.length;
    consultar(ROSA, 'menos_agua');
    expect(estado.casos).toHaveLength(casos);
    expect(ultimo(ROSA)).toContain('Ya tenemos un aviso verificado');
  });

  it('un segundo reporte del sector sube los dos a prioridad alta', () => {
    consultar(JUAN, 'menos_agua');
    consultar(ELENA, 'menos_agua');
    expect(casoDe(JUAN).prioridad).toBe('alta');
    expect(casoDe(ELENA).prioridad).toBe('alta');
  });
});

describe('cuota de agua', () => {
  const agenda = () => correr((e) => revisarAgenda(e, e.ahora));

  it('el mismo día: Rosa recibe 3 días antes, Juan 1 día antes, Elena nada', () => {
    agenda();
    expect(ultimo(ROSA)).toBe('El domingo vence tu cuota de agua. ¿Ya la pagaste?');
    expect(ultimo(JUAN)).toBe('Mañana vence tu cuota de agua. ¿Ya la pagaste?');
    expect(chat(ELENA)).toHaveLength(0);
    expect(estado.auditoria.some((a) => a.resultado === 'Elena no registró fecha de cuota: no se envía nada')).toBe(true);
  });

  it('no repite el recordatorio', () => {
    agenda();
    const total = estado.mensajes.length;
    agenda();
    expect(estado.mensajes).toHaveLength(total);
  });

  it('"Todavía no" responde según los días que faltan', () => {
    agenda();
    responder(ROSA, 'pago_no');
    responder(JUAN, 'pago_no');
    expect(ultimo(ROSA)).toContain('Te lo recuerdo 1 día antes');
    expect(ultimo(JUAN)).toContain('pide hablar con una persona');
  });

  it('"Ya pagué" apaga los recordatorios', () => {
    agenda();
    responder(ROSA, 'ya_pague');
    correr((e) => adelantarTiempo(e, 48));
    const total = chat(ROSA).length;
    agenda();
    expect(chat(ROSA)).toHaveLength(total);
  });

  it('la consulta del menú responde con la ficha', () => {
    consultar(ROSA, 'cuota');
    consultar(ELENA, 'cuota');
    expect(ultimo(ROSA)).toBe('Tu cuota de agua vence el domingo.');
    expect(ultimo(ELENA)).toContain('No tengo una fecha de cuota registrada');
  });

  it('un recordatorio vencido no sube a prioridad alta', () => {
    agenda();
    correr((e) => adelantarTiempo(e, 72));
    expect(casoDe(JUAN)).toMatchObject({ estado: 'vencido', prioridad: 'baja' });
  });
});

describe('comparar perfiles', () => {
  const fila = (id: string, nombre: string) =>
    compararPerfiles(estado)
      .find((c) => c.id === id)!
      .resultados.find((r) => r.nombre === nombre)!;

  it('el mismo corte da tres caminos', () => {
    expect(fila('corte', 'Rosa').caso).toMatchObject({ estado: 'accion_sugerida', reglaId: 'R-AGUA-02' });
    expect(fila('corte', 'Juan').caso).toMatchObject({ estado: 'revision_tecnica', motivo: 'No tiene reservorio' });
    expect(fila('corte', 'Elena').caso).toMatchObject({
      estado: 'revision_tecnica',
      motivo: 'No hay plan aprobado para esta parcela',
    });
  });

  it('usa las reglas vivas y no toca chats ni auditoría', () => {
    correr((e) => alternarRegla(e, 'R-AGUA-02', e.ahora));
    const antes = JSON.stringify(estado);
    expect(fila('corte', 'Rosa').caso?.motivo).toContain('Regla suspendida');
    expect(JSON.stringify(estado)).toBe(antes);
  });

  it('Juan no puede reportar un reservorio que no tiene', () => {
    expect(fila('dano', 'Juan').caso?.paso).toBe('dano_que');
    expect(fila('dano', 'Rosa').caso?.estado).toBe('revision_tecnica');
  });
});
