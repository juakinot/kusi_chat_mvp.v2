import { beforeEach, describe, expect, it } from 'vitest';
import { crearEstadoDemo, eventoCaudalAlto } from '../data/seed';
import {
  adelantarTiempo,
  alternarRegla,
  anotarCoordinacion,
  aplicar,
  cerrarCaso,
  marcarEnRevision,
  pedirPersona,
  procesarEvento,
  procesarRespuesta,
  procesarTextoLibre,
  responderComoAgronomo,
  TEXTO_SOLO_BOTONES,
} from './engine';
import { PERMISOS, puede } from './permisos';
import type { Estado, Resultado } from './types';
import {
  antecedentes,
  bandejaEspecialista,
  casoNuevo,
  estadoSolicitud,
  etapaHistoria,
  historialCaso,
  reportesRelacionados,
  resumenAgua,
  todosLosCasos,
  vistaOrganizacion,
} from './vistas';

const INICIO = new Date(2026, 10, 5, 8, 30).toISOString();
const ROSA = 'PA-ROSA';
const MANANA = new Date(2026, 10, 6, 9, 0).toISOString();

let estado: Estado;

const correr = (paso: (e: Estado) => Resultado) => {
  estado = aplicar(estado, paso(estado));
};
const casoRosa = () => estado.casos.find((c) => c.parcelaId === ROSA && c.eventoId === 'EV-CORTE-BAJO')!;
const responder = (id: string) => correr((e) => procesarRespuesta(e, casoRosa().id, id, e.ahora));
const chat = () => estado.mensajes.filter((m) => m.parcelaId === ROSA);
const rosaSinAgua = () => {
  responder('todavia_no');
  responder('esta_vacio');
};

beforeEach(() => {
  estado = crearEstadoDemo(INICIO);
});

describe('escenario inicial', () => {
  it('40 parcelas: 14 regaron, 10 con alternativa, 8 sin alternativa, 8 sin respuesta', () => {
    expect(resumenAgua(estado)).toEqual({
      total: 40,
      yaRegaron: 14,
      conAlternativa: 10,
      sinAlternativa: 8,
      sinRespuesta: 8,
    });
  });

  it('Rosa está entre las parcelas sin respuesta y tiene el aviso esperándola', () => {
    expect(casoRosa()).toMatchObject({ estado: 'pendiente_respuesta', paso: 'inicial' });
    expect(casoRosa().situacion).toBeUndefined();
    expect(chat()).toHaveLength(1);
    expect(chat()[0].texto).toBe(
      'Hola, Rosa 🌱. Tenemos un aviso sobre el agua de tu sector para mañana. ¿Ya regaste tus olivos?',
    );
    expect(chat()[0].botones?.map((b) => b.etiqueta)).toEqual(['Sí, ya regué', 'Todavía no', 'No sé']);
  });

  it('todas las personas están marcadas como ficticias', () => {
    expect(estado.productores.length).toBeGreaterThanOrEqual(40);
    expect(estado.productores.every((p) => p.ficticio)).toBe(true);
    expect(estado.eventos[0].descripcion).toContain('ficticio');
  });

  it('el reloj sigue en la hora de inicio y nada queda como "nuevo"', () => {
    expect(estado.ahora).toBe(INICIO);
    expect(estado.casos.filter((c) => casoNuevo(estado, c))).toHaveLength(0);
  });
});

describe('la historia conectada', () => {
  it('Rosa termina en dos respuestas y su caso llega a Diego y a Lucía sin más pasos', () => {
    const antes = bandejaEspecialista(estado, 'especialista').length;
    responder('todavia_no');
    expect(chat().at(-1)?.texto).toBe('¿Tienes agua disponible en tu reservorio?');
    expect(chat().at(-1)?.botones?.map((b) => b.etiqueta)).toEqual(['Sí', 'No', 'No sé']);
    responder('esta_vacio');

    expect(chat().at(-1)?.texto).toBe(
      'Rosa, registré que no tienes agua disponible. Enviaré tu caso al especialista para que revise las alternativas. Te avisaremos cuando haya una respuesta.',
    );
    expect(chat().filter((m) => m.de === 'productor')).toHaveLength(2);

    const bandeja = bandejaEspecialista(estado, 'especialista');
    expect(bandeja).toHaveLength(antes + 1);
    expect(bandeja[0].id).toBe(casoRosa().id);
    expect(casoNuevo(estado, bandeja[0])).toBe(true);
    expect(casoRosa()).toMatchObject({ situacion: 'sin_alternativa', barrera: 'reservorio_vacio' });
    expect(casoRosa().respuestas).toEqual({ inicial: 'Todavía no', reservorio: 'No' });

    expect(resumenAgua(estado)).toEqual({
      total: 40,
      yaRegaron: 14,
      conAlternativa: 10,
      sinAlternativa: 9,
      sinRespuesta: 7,
    });
    expect(vistaOrganizacion(estado).frase).toBe(
      '9 parcelas reportan no tener una alternativa de agua y 7 todavía no han respondido.',
    );
  });

  it('una respuesta a medias sigue contando como sin respuesta', () => {
    responder('todavia_no');
    expect(resumenAgua(estado).sinRespuesta).toBe(8);
    expect(etapaHistoria(estado)).toBe('respondiendo');
  });

  it('Diego marca En revisión: Rosa lo ve y Lucía ve que ya está en atención', () => {
    rosaSinAgua();
    expect(estadoSolicitud(estado, ROSA)?.titulo).toBe('Enviado al especialista');
    correr((e) => marcarEnRevision(e, casoRosa().id, e.ahora));

    expect(casoRosa().estado).toBe('en_revision');
    expect(estadoSolicitud(estado, ROSA)?.titulo).toBe('En revisión');
    expect(chat().at(-1)?.texto).toContain('Diego ya está revisando tu caso');
    expect(vistaOrganizacion(estado).necesidades[0].detalle[0]).toContain('8 por revisar · 1 en atención');
    expect(resumenAgua(estado).sinAlternativa).toBe(9);
    expect(etapaHistoria(estado)).toBe('en_revision');
  });

  it('Diego responde y programa seguimiento; el historial conserva todo', () => {
    rosaSinAgua();
    correr((e) => marcarEnRevision(e, casoRosa().id, e.ahora));
    correr((e) => responderComoAgronomo(e, casoRosa().id, 'Rosa, te llamo hoy.', e.ahora, MANANA));

    expect(casoRosa()).toMatchObject({ estado: 'seguimiento_programado', plazo: MANANA });
    expect(estadoSolicitud(estado, ROSA)).toMatchObject({ titulo: 'Diego respondió' });
    expect(chat().some((m) => m.de === 'agronomo' && m.texto === 'Rosa, te llamo hoy.')).toBe(true);
    expect(etapaHistoria(estado)).toBe('respondido');

    const historia = historialCaso(estado, casoRosa().id, 'especialista').map((l) => l.quien);
    expect(historia).toEqual(['KUSI', 'Rosa', 'KUSI', 'Rosa', 'KUSI', 'KUSI', 'Diego', 'KUSI']);

    correr((e) => adelantarTiempo(e, 24));
    expect(casoRosa()).toMatchObject({ estado: 'seguimiento_pendiente', paso: 'seguimiento' });
    responder('si_pude');
    expect(casoRosa()).toMatchObject({ estado: 'cerrado', situacion: 'ya_rego' });
    expect(resumenAgua(estado)).toMatchObject({ total: 40, yaRegaron: 15, sinAlternativa: 8 });
  });

  it('Diego ve el antecedente de Rosa y el contexto de su parcela', () => {
    rosaSinAgua();
    const previos = antecedentes(estado, casoRosa(), 'especialista');
    expect(previos.map((c) => c.motivo)).toEqual(['Corte anterior: regó con el agua de su reservorio']);
    expect(resumenAgua(estado).total).toBe(40);
  });

  it('si Rosa tiene agua y un plan aprobado, no molesta a Diego', () => {
    const antes = bandejaEspecialista(estado, 'especialista').length;
    responder('todavia_no');
    responder('si_agua');
    expect(casoRosa().estado).toBe('accion_sugerida');
    expect(bandejaEspecialista(estado, 'especialista')).toHaveLength(antes);
    expect(resumenAgua(estado)).toMatchObject({ conAlternativa: 11, sinRespuesta: 7, total: 40 });
    expect(etapaHistoria(estado)).toBe('sin_derivar');
  });

  it('"No sé" dos veces llega al especialista sin afirmar que no tiene agua', () => {
    responder('no_se');
    responder('no_se');
    expect(casoRosa()).toMatchObject({ estado: 'revision_tecnica', barrera: 'no_confirmado' });
    expect(chat().at(-1)?.texto).toContain('no pude confirmar si tienes agua disponible');
  });

  it('pedir una persona no se cuenta como respuesta sobre el agua', () => {
    correr((e) => pedirPersona(e, ROSA, e.ahora));
    expect(casoRosa().estado).toBe('revision_tecnica');
    expect(resumenAgua(estado).sinRespuesta).toBe(8);
  });
});

describe('totales y situaciones sin respuesta', () => {
  it('las parcelas sin respuesta no pasan a resueltas al vencer ni al cerrarse', () => {
    const callado = estado.casos.find((c) => c.parcelaId === 'PA-RAUL')!;
    correr((e) => adelantarTiempo(e, 24));
    expect(estado.casos.find((c) => c.id === callado.id)?.estado).toBe('vencido');
    expect(resumenAgua(estado)).toMatchObject({ total: 40, sinRespuesta: 8, yaRegaron: 14 });

    correr((e) => cerrarCaso(e, callado.id, e.ahora));
    expect(resumenAgua(estado)).toMatchObject({ total: 40, sinRespuesta: 8, yaRegaron: 14 });
  });

  it('la suma de los cuatro indicadores siempre da el total', () => {
    const suma = () => {
      const r = resumenAgua(estado);
      return r.yaRegaron + r.conAlternativa + r.sinAlternativa + r.sinRespuesta;
    };
    expect(suma()).toBe(40);
    rosaSinAgua();
    expect(suma()).toBe(40);
    correr((e) => marcarEnRevision(e, casoRosa().id, e.ahora));
    correr((e) => adelantarTiempo(e, 24));
    expect(suma()).toBe(40);
  });

  it('reiniciar no acumula casos ni mensajes', () => {
    rosaSinAgua();
    correr((e) => marcarEnRevision(e, casoRosa().id, e.ahora));
    const limpio = crearEstadoDemo(INICIO);
    const otra = crearEstadoDemo(INICIO);
    expect(otra).toEqual(limpio);
    expect(limpio.casos.filter((c) => c.parcelaId === ROSA)).toHaveLength(2); // aviso y antecedente
    expect(limpio.mensajes.filter((m) => m.parcelaId === ROSA)).toHaveLength(1);
    expect(resumenAgua(limpio).sinAlternativa).toBe(8);
  });
});

describe('reportes relacionados', () => {
  it('seis reportes, tres del mismo sector, y salen de la lista individual', () => {
    const r = reportesRelacionados(estado, 'especialista');
    expect(r.casos).toHaveLength(6);
    expect(r.sectores[0]).toMatchObject({ sector: 'Alto' });
    expect(r.sectores[0].casos).toHaveLength(3);
    const ids = bandejaEspecialista(estado, 'especialista').map((c) => c.id);
    expect(r.casos.some((c) => ids.includes(c.id))).toBe(false);
  });

  it('Diego los toma juntos y cada productor ve la actualización', () => {
    const alto = reportesRelacionados(estado, 'especialista').sectores[0].casos.map((c) => c.id);
    correr((e) => marcarEnRevision(e, alto, e.ahora));
    const tomados = estado.casos.filter((c) => alto.includes(c.id));
    expect(tomados.every((c) => c.estado === 'en_revision')).toBe(true);
    expect(estadoSolicitud(estado, 'PA-JUAN')?.titulo).toBe('En revisión');
    expect(reportesRelacionados(estado, 'especialista').casos).toHaveLength(6);

    const mensajes = estado.mensajes.length;
    correr((e) => marcarEnRevision(e, alto, e.ahora));
    expect(estado.mensajes).toHaveLength(mensajes);
  });

  it('no afirma una plaga ni una causa común en lo que ve cualquier perfil', () => {
    const textos = [
      ...estado.casos.filter((c) => c.tema === 'plaga').map((c) => c.motivo),
      ...estado.mensajes.filter((m) => m.de !== 'productor').map((m) => m.texto),
      JSON.stringify(vistaOrganizacion(estado)),
    ].join(' ');
    expect(textos).not.toMatch(/plaga|hongo|enfermedad|mosca|repil/i);
  });
});

describe('sin recomendaciones inventadas', () => {
  it('KUSI no da cantidades ni instrucciones de riego o productos', () => {
    rosaSinAgua();
    const dichos = estado.mensajes.filter((m) => m.de === 'kusi').map((m) => m.texto).join(' ');
    expect(dichos).not.toMatch(/litros?|m3|mililitros|aplica|fumiga|dosis|fertiliz/i);
    expect(dichos).not.toMatch(/\d+\s*(l|ml|kg|horas de riego)\b/i);
  });

  it('solo recuerda un paso cuando existe un plan aprobado para esa parcela', () => {
    const conPaso = estado.casos.filter((c) => c.estado === 'accion_sugerida');
    expect(conPaso).toHaveLength(10);
    for (const c of conPaso) {
      expect(estado.parcelas.find((p) => p.id === c.parcelaId)?.planAprobado).toBeTruthy();
    }
  });
});

describe('permisos', () => {
  it('Lucía recibe solo cifras: ningún nombre, teléfono, parcela ni conversación', () => {
    rosaSinAgua();
    const vista = JSON.stringify(vistaOrganizacion(estado));
    for (const p of estado.productores) {
      expect(vista).not.toContain(p.telefono);
      expect(vista).not.toMatch(new RegExp(`\\b${p.nombre}\\b`));
    }
    for (const p of estado.parcelas) expect(vista).not.toContain(p.alias);
    expect(vista).not.toContain('registré que no tienes agua');
  });

  it('Lucía no puede leer casos ni historiales', () => {
    rosaSinAgua();
    expect(bandejaEspecialista(estado, 'organizacion')).toEqual([]);
    expect(todosLosCasos(estado, 'organizacion')).toEqual([]);
    expect(reportesRelacionados(estado, 'organizacion').casos).toEqual([]);
    expect(historialCaso(estado, casoRosa().id, 'organizacion')).toEqual([]);
    expect(antecedentes(estado, casoRosa(), 'organizacion')).toEqual([]);
  });

  it('un agricultor tampoco ve la bandeja ni el historial de otro', () => {
    expect(bandejaEspecialista(estado, 'agricultor')).toEqual([]);
    expect(historialCaso(estado, casoRosa().id, 'agricultor')).toEqual([]);
  });

  it('Lucía no puede gestionar casos ni reglas: no cambia nada y queda registrado', () => {
    rosaSinAgua();
    const id = casoRosa().id;
    for (const intento of [
      (e: Estado) => marcarEnRevision(e, id, e.ahora, 'organizacion'),
      (e: Estado) => responderComoAgronomo(e, id, 'Hola', e.ahora, MANANA, 'organizacion'),
      (e: Estado) => cerrarCaso(e, id, e.ahora, 'organizacion'),
      (e: Estado) => alternarRegla(e, 'R-AGUA-03', e.ahora, 'organizacion'),
    ]) {
      const antes = { casos: estado.casos, mensajes: estado.mensajes, reglas: estado.reglas };
      correr(intento);
      expect(estado).toMatchObject(antes);
      expect(estado.auditoria.at(-1)).toMatchObject({ tipo: 'bloqueo' });
    }
  });

  it('Diego no anota coordinación; Lucía sí, una vez, sin marcar nada como hecho', () => {
    correr((e) => anotarCoordinacion(e, 'sin_alternativa', 'Prueba', e.ahora, 'especialista'));
    expect(estado.coordinacion).toHaveLength(0);

    const casos = estado.casos;
    const mensajes = estado.mensajes;
    correr((e) => anotarCoordinacion(e, 'sin_alternativa', '8 parcelas sin alternativa', e.ahora));
    correr((e) => anotarCoordinacion(e, 'sin_alternativa', '8 parcelas sin alternativa', e.ahora));
    expect(estado.coordinacion).toHaveLength(1);
    expect(estado.casos).toBe(casos);
    expect(estado.mensajes).toBe(mensajes);
  });

  it('cada perfil tiene permisos propios', () => {
    expect(PERMISOS.agricultor).toEqual(['ver_mi_conversacion']);
    expect(puede('organizacion', 'ver_agregados')).toBe(true);
    expect(puede('organizacion', 'ver_casos')).toBe(false);
    expect(puede('especialista', 'gestionar_casos')).toBe(true);
  });
});

describe('a quién atender primero', () => {
  const nombres = () =>
    bandejaEspecialista(estado, 'especialista').map((c) => {
      const parcela = estado.parcelas.find((p) => p.id === c.parcelaId);
      return estado.productores.find((p) => p.id === parcela?.productorId)?.nombre;
    });

  it('ordena por turno de riego, no por quién llegó último', () => {
    expect(nombres()).toEqual(['Marta', 'Olga', 'Nelson', 'Pablo', 'Nora', 'Paula', 'Óscar', 'Quintín']);
  });

  it('Rosa entra primera porque su turno es el más próximo, y sigue primera en revisión', () => {
    rosaSinAgua();
    expect(nombres()[0]).toBe('Rosa');
    correr((e) => marcarEnRevision(e, casoRosa().id, e.ahora));
    expect(nombres()[0]).toBe('Rosa');
  });

  it('con turno después de mañana el caso es prioridad media', () => {
    const prioridad = (id: string) => estado.casos.find((c) => c.parcelaId === id && c.barrera)?.prioridad;
    expect(prioridad('PA-MARTA')).toBe('alta');
    expect(prioridad('PA-NORA')).toBe('media');
  });

  it('un seguimiento ya programado deja pasar a quien sigue sin atención', () => {
    rosaSinAgua();
    correr((e) => marcarEnRevision(e, casoRosa().id, e.ahora));
    correr((e) => responderComoAgronomo(e, casoRosa().id, 'Te llamo.', e.ahora, MANANA));
    expect(nombres().at(-1)).toBe('Rosa');
  });

  it('Lucía ve cuántas riegan pronto, sin nombres', () => {
    rosaSinAgua();
    const [necesidad, callados] = vistaOrganizacion(estado).necesidades;
    expect(necesidad.detalle).toContain('5 de 9 riegan hoy o mañana: son las primeras por atender.');
    expect(callados.detalle).toContain('El primer turno es mañana 7:00 a. m.');
  });
});

describe('respuestas escritas', () => {
  const escribir = (texto: string, parcelaId = ROSA) => correr((e) => procesarTextoLibre(e, parcelaId, texto, e.ahora));

  it('"no tengo agua" contesta las dos preguntas y deriva igual que los botones', () => {
    escribir('No tengo agua');
    expect(chat().filter((m) => m.de === 'productor').map((m) => m.texto)).toEqual(['No tengo agua']);
    expect(chat().some((m) => m.texto === '¿Tienes agua disponible en tu reservorio?')).toBe(false);
    expect(chat().at(-1)?.texto).toContain('Rosa, registré que no tienes agua disponible.');
    expect(chat()[0].botones).toBeUndefined();
    expect(casoRosa()).toMatchObject({
      estado: 'revision_tecnica',
      situacion: 'sin_alternativa',
      barrera: 'reservorio_vacio',
      respuestas: { inicial: 'Todavía no', reservorio: 'No' },
    });
    expect(resumenAgua(estado)).toMatchObject({ total: 40, sinAlternativa: 9, sinRespuesta: 7 });
    expect(estado.auditoria.at(-1)?.resultado ?? '').toBeTruthy();
    expect(estado.auditoria.some((a) => a.resultado.includes('escribió "No tengo agua"'))).toBe(true);
  });

  it('sin reservorio, "no tengo agua" lo deriva por esa barrera', () => {
    const juan = 'PA-JUAN';
    correr((e) => procesarEvento(e, eventoCaudalAlto(e.inicio), e.ahora));
    escribir('sin agua', juan);
    const caso = estado.casos.find((c) => c.parcelaId === juan && c.tema === 'agua')!;
    expect(caso).toMatchObject({ situacion: 'sin_alternativa', barrera: 'sin_reservorio' });
  });

  it.each([
    ['ya regué', 'cerrado'],
    ['Sí', 'cerrado'],
    ['todavía no', 'pendiente_respuesta'],
    ['NO', 'pendiente_respuesta'],
  ])('entiende "%s" en la primera pregunta', (texto, estadoCaso) => {
    escribir(texto);
    expect(casoRosa().estado).toBe(estadoCaso);
  });

  it('en la pregunta del reservorio entiende sí, no y no sé', () => {
    escribir('todavía no');
    escribir('no sé');
    expect(casoRosa().conteoNoSe).toBe(1);
    escribir('sí tengo agua');
    expect(casoRosa().estado).toBe('accion_sugerida');
  });

  it('si no hay certeza no adivina: la pregunta sigue abierta', () => {
    for (const texto of ['no tengo reservorio', 'creo que sí, mañana veo', 'mi hijo regó ayer']) {
      escribir(texto);
      expect(chat().at(-1)?.texto).toBe(TEXTO_SOLO_BOTONES);
      expect(casoRosa()).toMatchObject({ estado: 'pendiente_respuesta', paso: 'inicial' });
    }
  });

  it('sin pregunta abierta, una frase no cambia el caso', () => {
    rosaSinAgua();
    const antes = casoRosa();
    escribir('no tengo agua');
    expect(casoRosa()).toEqual(antes);
  });

  it('PERSONA gana a cualquier otra frase', () => {
    escribir('no tengo agua, necesito una persona');
    expect(casoRosa().situacion).toBeUndefined();
    expect(casoRosa().motivo).toBe('El productor pidió hablar con una persona');
  });
});
