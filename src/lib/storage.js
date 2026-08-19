import { EXPEDIENTES } from '../data/cases.js'
import { PLANTILLAS } from '../data/templates.js'

const CLAVE = 'timbre.datos.v1'

export function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (crudo) {
      const datos = JSON.parse(crudo)
      if (datos?.expedientes?.length && datos?.plantillas?.length) return datos
    }
  } catch {
    // Un almacén corrupto no debe impedir abrir la aplicación.
  }
  return semilla()
}

export function semilla() {
  return {
    expedientes: structuredClone(EXPEDIENTES),
    plantillas: structuredClone(PLANTILLAS)
  }
}

export function guardar(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos))
  } catch {
    // Cuota agotada: la sesión sigue funcionando en memoria.
  }
}

export function reiniciar() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    /* noop */
  }
  return semilla()
}
