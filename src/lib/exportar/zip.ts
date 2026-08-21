/**
 * Un escritor de ZIP, sin dependencias.
 *
 * Hace falta para dos cosas que parecen distintas y son la misma: un .docx es
 * un ZIP de unos cuantos XML, y el expediente que se manda a la notaría es un
 * ZIP de los papeles del caso. Una sola pieza cubre las dos.
 *
 * Guarda sin comprimir (método 0). Los PDF y las fotos —que son casi todo el
 * peso— ya vienen comprimidos, así que desinflar solo costaría tiempo; y el
 * XML de un .docx pesa unos pocos kilobytes. A cambio, el formato cabe en dos
 * cabeceras y se puede leer entero de un vistazo.
 */

/** Un fichero dentro del ZIP. `nombre` es su ruta: las barras hacen carpetas. */
export interface EntradaZip {
  nombre: string
  datos: Blob | Uint8Array<ArrayBuffer> | string
  fecha?: Date
}

const TABLA_CRC = /* @__PURE__ */ (() => {
  const tabla = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[i] = c >>> 0
  }
  return tabla
})()

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** La fecha en el formato de MS-DOS de 1980, que es el que lleva el ZIP dentro. */
function fechaDos(d: Date): { hora: number; dia: number } {
  const anio = Math.max(1980, d.getFullYear())
  return {
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    dia: ((anio - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  }
}

async function comoBytes(datos: Blob | Uint8Array<ArrayBuffer> | string): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof datos === 'string') return new TextEncoder().encode(datos)
  if (datos instanceof Uint8Array) return datos
  return new Uint8Array(await datos.arrayBuffer())
}

/** 4 GB: el tope del ZIP clásico. Más allá haría falta ZIP64. */
const TOPE = 0xffffffff

/**
 * Arma el ZIP. Los ficheros se van convirtiendo en `Blob` de uno en uno, así
 * que en memoria nunca hay más de uno a la vez: el navegador se encarga del
 * resto, y un expediente con veinte escaneados no revienta la pestaña.
 */
export async function zip(entradas: EntradaZip[]): Promise<Blob> {
  const codificar = new TextEncoder()
  const partes: BlobPart[] = []
  const directorio: Uint8Array<ArrayBuffer>[] = []
  let desplazamiento = 0

  for (const entrada of entradas) {
    const nombre = codificar.encode(entrada.nombre)
    const bytes = await comoBytes(entrada.datos)
    const crc = crc32(bytes)
    const tamano = bytes.length
    const { hora, dia } = fechaDos(entrada.fecha ?? new Date())

    if (desplazamiento + tamano > TOPE) {
      throw new Error('El expediente pasa de 4 GB y no cabe en un ZIP normal.')
    }

    const cabecera = new Uint8Array(30 + nombre.length)
    const c = new DataView(cabecera.buffer)
    c.setUint32(0, 0x04034b50, true) // firma de cabecera local
    c.setUint16(4, 20, true) // versión mínima para leerlo
    c.setUint16(6, 0x0800, true) // bit 11: el nombre va en UTF-8, con sus tildes
    c.setUint16(8, 0, true) // método 0: guardado tal cual
    c.setUint16(10, hora, true)
    c.setUint16(12, dia, true)
    c.setUint32(14, crc, true)
    c.setUint32(18, tamano, true)
    c.setUint32(22, tamano, true)
    c.setUint16(26, nombre.length, true)
    c.setUint16(28, 0, true) // sin campos extra
    cabecera.set(nombre, 30)

    // El Blob se queda con los bytes y el Uint8Array puede irse: a partir de
    // aquí el fichero lo gestiona el navegador, que puede llevarlo a disco.
    partes.push(cabecera, new Blob([bytes]))

    const ficha = new Uint8Array(46 + nombre.length)
    const f = new DataView(ficha.buffer)
    f.setUint32(0, 0x02014b50, true) // firma de ficha del directorio central
    // El byte alto dice qué sistema lo creó. Puesto a 3 —Unix— los
    // descompresores viejos tratan el nombre como UTF-8 en vez de suponer la
    // tabla de caracteres del MS-DOS de 1985 y comerse las tildes.
    f.setUint16(4, (3 << 8) | 20, true)
    f.setUint16(6, 20, true) // versión mínima para leerlo
    f.setUint16(8, 0x0800, true)
    f.setUint16(10, 0, true)
    f.setUint16(12, hora, true)
    f.setUint16(14, dia, true)
    f.setUint32(16, crc, true)
    f.setUint32(20, tamano, true)
    f.setUint32(24, tamano, true)
    f.setUint16(28, nombre.length, true)
    // Diciendo que lo hizo un Unix hay que decir también con qué permisos, o
    // el fichero se extrae sin poder abrirse: 0100644, fichero normal de lectura.
    f.setUint32(38, (0o100644 << 16) >>> 0, true)
    f.setUint32(42, desplazamiento, true) // dónde empieza su cabecera local
    ficha.set(nombre, 46)
    directorio.push(ficha)

    desplazamiento += cabecera.length + tamano
  }

  const tamanoDirectorio = directorio.reduce((n, d) => n + d.length, 0)
  const fin = new Uint8Array(22)
  const e = new DataView(fin.buffer)
  e.setUint32(0, 0x06054b50, true) // firma del final del directorio central
  e.setUint16(8, directorio.length, true)
  e.setUint16(10, directorio.length, true)
  e.setUint32(12, tamanoDirectorio, true)
  e.setUint32(16, desplazamiento, true)

  return new Blob([...partes, ...directorio, fin], { type: 'application/zip' })
}

/**
 * Deja el fichero en el ordenador del agente.
 *
 * Con un enlace y no con `window.open`, porque después de un `await` el
 * navegador ya no reconoce el gesto del usuario y lo bloquea como emergente.
 */
export function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.rel = 'noopener'
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Sin margen, Safari cancela la descarga al revocar la URL demasiado pronto.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Limpia un nombre para que valga como fichero en Windows, macOS y Linux. */
export function comoFichero(nombre: string, extension = ''): string {
  const limpio = nombre
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 120)
  return (limpio || 'documento') + extension
}
