// Marca blanca. La agencia elige un solo color y de él salen los seis tonos que
// la interfaz necesita: el de acción, el de pulsado, dos rellenos, la variante
// legible sobre papel y la variante legible sobre el margen oscuro.
//
// Lo que NO se deriva de aquí es el carmín de «caducado» y el ocre de «caduca
// pronto». Son semánticos: un documento vencido tiene que verse vencido aunque
// la agencia trabaje en rojo.

import type { Marca } from '../types'

export const ACENTO_POR_DEFECTO = '#0e6f5c'

interface RGB {
  r: number
  g: number
  b: number
}

function aRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const aHex = ({ r, g, b }: RGB): string =>
  '#' + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')

/** Luminancia relativa de la WCAG: decide si encima va tinta o blanco. */
function luminancia({ r, g, b }: RGB): number {
  const lineal = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b)
}

const mezclar = (a: RGB, b: RGB, t: number): RGB => ({
  r: a.r + (b.r - a.r) * t,
  g: a.g + (b.g - a.g) * t,
  b: a.b + (b.b - a.b) * t,
})

const NEGRO: RGB = { r: 0, g: 0, b: 0 }
const BLANCO: RGB = { r: 255, g: 255, b: 255 }
/** El papel de la aplicación: los rellenos se mezclan contra él, no contra blanco. */
const PAPEL: RGB = { r: 245, g: 247, b: 244 }
const TINTA: RGB = { r: 16, g: 30, b: 46 }

export interface Paleta {
  acento: string
  acentoHonda: string
  acentoTenue: string
  acentoVapor: string
  /** Acento oscurecido hasta ser legible como texto sobre papel. */
  acentoTexto: string
  /** Acento aclarado hasta ser legible sobre el margen oscuro. */
  acentoClaro: string
  /** Lo que se lee encima de un relleno de acento. */
  acentoContra: string
}

export function paletaDe(hex: string): Paleta {
  const base = aRgb(hex) ?? aRgb(ACENTO_POR_DEFECTO)!
  const l = luminancia(base)

  // Un acento muy claro no vale como texto sobre papel: se oscurece hasta que
  // pasa de sobra el contraste de lectura.
  let texto = base
  let vueltas = 0
  while (luminancia(texto) > 0.16 && vueltas < 24) {
    texto = mezclar(texto, NEGRO, 0.1)
    vueltas += 1
  }

  // Y un acento muy oscuro no se ve sobre el margen: se aclara.
  let claro = base
  vueltas = 0
  while (luminancia(claro) < 0.3 && vueltas < 24) {
    claro = mezclar(claro, BLANCO, 0.12)
    vueltas += 1
  }

  return {
    acento: aHex(base),
    acentoHonda: aHex(mezclar(base, NEGRO, 0.28)),
    acentoTenue: aHex(mezclar(base, PAPEL, 0.72)),
    acentoVapor: aHex(mezclar(base, PAPEL, 0.9)),
    acentoTexto: aHex(texto),
    acentoClaro: aHex(claro),
    acentoContra: l > 0.42 ? aHex(TINTA) : '#ffffff',
  }
}

/** Escribe la paleta en `:root`. Todo el CSS lee estas variables. */
export function aplicarMarca(marca: Pick<Marca, 'colorAcento'> | null): void {
  const p = paletaDe(marca?.colorAcento ?? ACENTO_POR_DEFECTO)
  const raiz = document.documentElement.style
  raiz.setProperty('--acento', p.acento)
  raiz.setProperty('--acento-honda', p.acentoHonda)
  raiz.setProperty('--acento-tenue', p.acentoTenue)
  raiz.setProperty('--acento-vapor', p.acentoVapor)
  raiz.setProperty('--acento-texto', p.acentoTexto)
  raiz.setProperty('--acento-claro', p.acentoClaro)
  raiz.setProperty('--acento-contra', p.acentoContra)
}

/** Iniciales para el sello de la agencia cuando no hay logotipo. */
export function iniciales(nombre: string): string {
  const palabras = nombre
    .replace(/[&·,.]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 1 && !/^(de|del|la|los|las|y|e|el)$/i.test(p))
  if (palabras.length === 0) return nombre.slice(0, 2).toUpperCase()
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}

/** Paleta sugerida en Ajustes: acentos que funcionan sobre este papel. */
export const ACENTOS_SUGERIDOS: { hex: string; nombre: string }[] = [
  { hex: '#0e6f5c', nombre: 'Verde registral' },
  { hex: '#1d4f8c', nombre: 'Azul de escritura' },
  { hex: '#7a2f6d', nombre: 'Violeta de tampón' },
  { hex: '#0b6a72', nombre: 'Cardenillo' },
  { hex: '#8a4b12', nombre: 'Sepia de archivo' },
  { hex: '#2f5d2a', nombre: 'Verde catastral' },
  { hex: '#a81f35', nombre: 'Carmín notarial' },
  { hex: '#33404d', nombre: 'Grafito' },
]
