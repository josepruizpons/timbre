/**
 * La ruta de la aplicación, ida y vuelta con la barra de direcciones.
 *
 * Sin esto, recargar dentro de un expediente devolvía a la cartera y no había
 * forma de mandarle a un compañero el enlace de un caso. Para un agente que
 * trabaja con veinte pestañas abiertas eso no es un detalle.
 *
 * No hay librería de rutas: son siete pantallas y el servidor estático ya sirve
 * `index.html` para cualquier ruta (`serve -s`), así que basta con traducir el
 * camino a un objeto y al revés.
 */

export type Ruta =
  | { v: 'panel' }
  | { v: 'pendientes' }
  | { v: 'exp'; id: string; reqId?: string }
  | { v: 'biblioteca' }
  | { v: 'creador'; plantillaId?: string; requisito?: string; volverA?: Ruta }
  | { v: 'importador'; requisito?: string }
  | { v: 'usuarios' }
  | { v: 'ajustes' }

/** Los identificadores de requisito tienen forma fija: dos letras y dos cifras. */
const REQ = /^[A-Z]{2}-\d{2}$/

export function aPath(ruta: Ruta): string {
  switch (ruta.v) {
    case 'panel':
      return '/'
    case 'pendientes':
      return '/esperas'
    case 'exp':
      return `/expedientes/${ruta.id}${ruta.reqId ? `/${ruta.reqId}` : ''}`
    case 'biblioteca':
      return '/plantillas'
    case 'creador':
      if (ruta.plantillaId) return `/plantillas/${ruta.plantillaId}/editar`
      return ruta.requisito ? `/plantillas/nueva/${ruta.requisito}` : '/plantillas/nueva'
    case 'importador':
      return ruta.requisito ? `/plantillas/importar/${ruta.requisito}` : '/plantillas/importar'
    case 'usuarios':
      return '/equipo'
    case 'ajustes':
      return '/ajustes'
  }
}

export function desdePath(path: string): Ruta {
  const [, uno, dos, tres] = path.split('/')

  if (uno === 'expedientes' && dos) {
    return { v: 'exp', id: dos, ...(tres && REQ.test(tres) ? { reqId: tres } : {}) }
  }
  if (uno === 'plantillas') {
    if (!dos) return { v: 'biblioteca' }
    if (dos === 'nueva') return { v: 'creador', ...(tres && REQ.test(tres) ? { requisito: tres } : {}) }
    if (dos === 'importar') {
      return { v: 'importador', ...(tres && REQ.test(tres) ? { requisito: tres } : {}) }
    }
    if (tres === 'editar') return { v: 'creador', plantillaId: dos }
    return { v: 'biblioteca' }
  }
  if (uno === 'esperas') return { v: 'pendientes' }
  if (uno === 'equipo') return { v: 'usuarios' }
  if (uno === 'ajustes') return { v: 'ajustes' }
  return { v: 'panel' }
}

/**
 * Dos rutas llevan al mismo sitio.
 *
 * `volverA` no entra: es memoria de por dónde se vino, no parte de la
 * dirección, y meterla en la comparación haría escribir la URL dos veces.
 */
export function mismaRuta(a: Ruta, b: Ruta): boolean {
  return aPath(a) === aPath(b)
}
