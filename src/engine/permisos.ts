/** Un solo sistema, tres miradas. Cada perfil ve y hace solo lo que le corresponde. */
export type Perfil = 'agricultor' | 'especialista' | 'organizacion';

export type Permiso =
  | 'ver_mi_conversacion'
  | 'ver_casos'
  | 'ver_conversacion_de_caso'
  | 'gestionar_casos'
  | 'gestionar_reglas'
  | 'ver_agregados'
  | 'anotar_coordinacion'
  | 'proponer_visita'
  | 'confirmar_visita';

export const PERMISOS: Record<Perfil, readonly Permiso[]> = {
  agricultor: ['ver_mi_conversacion'],
  especialista: [
    'ver_casos',
    'ver_conversacion_de_caso',
    'gestionar_casos',
    'gestionar_reglas',
    'ver_agregados',
    'proponer_visita',
  ],
  organizacion: ['ver_agregados', 'anotar_coordinacion', 'confirmar_visita'],
};

export const puede = (perfil: Perfil, permiso: Permiso) => PERMISOS[perfil].includes(permiso);
