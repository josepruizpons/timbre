
export const API_HOSTNAME = import.meta.env.VITE_API_HOSTNAME

export const ESTADO_EXPEDIENTE = {
  ACTIVO: 'activo',
  HISTORIAL: 'historial',
} as const

export const ESTADO_REQUISITO = {
  PENDIENTE: 'pendiente',
  CURSO: 'curso',
  APORTADO: 'aportado',
} as const
