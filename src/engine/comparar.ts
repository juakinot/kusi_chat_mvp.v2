import {
  aplicar,
  botonesPara,
  enDia,
  fechaLocal,
  iniciarConsulta,
  procesarEvento,
  procesarRespuesta,
  revisarAgenda,
} from './engine';
import type { Caso, Estado, EventoAgua, Parcela, Resultado, Sector } from './types';

export interface ResultadoPerfil {
  parcelaId: string;
  nombre: string;
  caso?: Caso;
  mensaje: string;
}

export interface Comparacion {
  id: string;
  titulo: string;
  resultados: ResultadoPerfil[];
}

type Paso = (e: Estado) => Resultado;

const responder = (parcelaId: string, respuestas: string[]): Paso[] =>
  respuestas.map((id) => (e) => {
    const parcela = e.parcelas.find((p) => p.id === parcelaId)!;
    const caso = [...e.casos].reverse().find((c) => c.parcelaId === parcelaId && c.paso);
    const disponible = caso?.paso && botonesPara(caso.paso, parcela).some((b) => b.id === id);
    if (!caso || !disponible) return { nuevoEstado: e, auditoria: [] };
    return procesarRespuesta(e, caso.id, id, e.ahora);
  });

/** Ensaya sobre una copia con el motor real: nada de esto toca los chats ni la auditoría. */
function ensayar(base: Estado, parcela: Parcela, pasos: Paso[]): Omit<ResultadoPerfil, 'nombre'> {
  const final = pasos.reduce((e, paso) => aplicar(e, paso(e)), base);
  const caso = final.casos.filter((c) => c.parcelaId === parcela.id && !base.casos.some((b) => b.id === c.id)).pop();
  const nuevos = final.mensajes.filter(
    (m) => m.parcelaId === parcela.id && m.de === 'kusi' && !base.mensajes.some((b) => b.id === m.id),
  );
  return { parcelaId: parcela.id, caso, mensaje: nuevos.pop()?.texto ?? 'No recibe ningún mensaje.' };
}

function corteEnSuSector(parcela: Parcela, ahora: string): EventoAgua {
  return {
    id: `ENSAYO-${parcela.id}`,
    tipo: 'corte',
    origen: 'comision_regantes',
    fuenteVerificada: true,
    sector: parcela.sector as Sector, // sin sector, el motor bloquea el aviso
    fechaAfectada: fechaLocal(enDia(ahora, 1, 12)),
    emitidoEn: ahora,
    vigenteHasta: enDia(ahora, 1, 18),
    descripcion: 'Ensayo de comparación',
  };
}

/** Las parcelas que se pueden abrir como perfil: no las sintéticas del escenario. */
export const perfilesDemo = (estado: Estado) => estado.parcelas.filter((p) => !p.relleno);

/** El mismo motivo y las mismas respuestas para cada perfil. Solo cambia su ficha. */
export function compararPerfiles(estado: Estado): Comparacion[] {
  const { ahora } = estado;
  const perfiles = perfilesDemo(estado);
  // Punto de partida igual para todos: solo los perfiles, sin avisos ni casos del escenario.
  const limpio: Estado = {
    ...estado,
    parcelas: perfiles,
    eventos: [],
    eventosBloqueados: [],
    casos: [],
    mensajes: [],
    auditoria: [],
  };
  const soloFicha = (p: Parcela): Estado => ({
    ...limpio,
    parcelas: [{ ...p, riegoPendiente: true, cuota: p.cuota && { ...p.cuota, avisos: [] } }],
  });
  const consulta = (p: Parcela, id: string): Paso => (e) => iniciarConsulta(e, p.id, id, ahora);

  const escenarios: { id: string; titulo: string; correr: (p: Parcela) => Omit<ResultadoPerfil, 'nombre'> }[] = [
    {
      id: 'corte',
      titulo: 'Corte en su sector: responde "Todavía no" y que sí tiene agua',
      correr: (p) =>
        ensayar(soloFicha(p), p, [
          (e) => procesarEvento(e, corteEnSuSector(p, ahora), ahora),
          ...responder(p.id, ['todavia_no', 'si_agua']),
        ]),
    },
    {
      id: 'menos_agua',
      titulo: 'Reporta "Llega menos agua"',
      correr: (p) => ensayar(limpio, p, [consulta(p, 'menos_agua')]),
    },
    {
      id: 'plaga',
      titulo: 'Reporta cambios en sus olivos desde esta semana',
      correr: (p) =>
        ensayar(limpio, p, [consulta(p, 'plaga'), ...responder(p.id, ['esta_semana'])]),
    },
    {
      id: 'dano',
      titulo: 'Reporta daño en su reservorio',
      correr: (p) =>
        ensayar(limpio, p, [
          consulta(p, 'dano'),
          ...responder(p.id, ['no_personas', 'dano_reservorio']),
        ]),
    },
    {
      id: 'cuota',
      titulo: 'Revisión de cuotas de hoy',
      correr: (p) => ensayar(soloFicha(p), p, [(e) => revisarAgenda(e, ahora)]),
    },
  ];

  return escenarios.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    resultados: perfiles.map((p) => ({
      ...s.correr(p),
      nombre: estado.productores.find((x) => x.id === p.productorId)?.nombre ?? p.alias,
    })),
  }));
}
