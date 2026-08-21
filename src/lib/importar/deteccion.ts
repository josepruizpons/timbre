// Encontrar las variables de un documento recién importado.
//
// La idea que sostiene todo esto: la agencia no pega una plantilla en blanco,
// pega un documento REAL de un expediente que Timbre ya conoce. Así que los
// filtros de formato se pueden usar al revés —renderizar cada dato del
// expediente y buscarlo literalmente en el texto— y lo que sale no es una
// conjetura, es una coincidencia exacta que además dice qué filtro hacía falta:
//
//   precio = 425000  →  euros()          →  «425.000,00 €»   →  {{precio|eur}}
//                    →  eurosEnLetras()  →  «CUATROCIENTOS…» →  {{precio|letra}}
//
// Lo que no case contra el expediente lo recogen los detectores de patrón (un
// NIF tiene forma de NIF) y los de hueco (un documento de Word ya trae sus
// huecos escritos: ____, [NOMBRE], XXXX).

import { DATOS_EXPEDIENTE, DATO_POR_CLAVE } from '../../data/contexto'
import { euros, eurosEnLetras, fechaLarga } from '../format'
import { contextoDe } from '../expediente'
import type { Expediente, TipoCampo, UserInfo } from '../../types'

export type Confianza = 'alta' | 'media'

export interface Rango {
  inicio: number
  fin: number
  literal: string
}

export interface Hallazgo {
  id: string
  clave: string
  etiqueta: string
  tipo: TipoCampo
  grupo: string
  /** Clave del expediente con la que se rellena solo, si la hay. */
  auto: string | null
  filtro: string | null
  opciones?: string[]
  ocurrencias: Rango[]
  confianza: Confianza
  motivo: string
}

const tokenRe = () => /\{\{[^}\n]*\}\}/g

/** Un valor pegado a letras o cifras es otra palabra, no una coincidencia. */
function enLimite(texto: string, inicio: number, fin: number): boolean {
  const esPalabra = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c)
  const abreEnPalabra = esPalabra(texto[inicio])
  const cierraEnPalabra = esPalabra(texto[fin - 1])
  if (abreEnPalabra && esPalabra(texto[inicio - 1])) return false
  if (cierraEnPalabra && esPalabra(texto[fin])) return false
  return true
}

/**
 * Word sustituye los apóstrofos y las comillas por sus versiones tipográficas
 * en cuanto se teclean, así que «Carrer d'Aribau» del expediente y «Carrer
 * d’Aribau» del documento son la misma calle escrita de dos formas. Todas las
 * sustituciones son de un carácter por otro, de modo que las posiciones dentro
 * del texto no se mueven y siguen sirviendo para marcar.
 */
const TIPOGRAFICOS: Record<string, string> = {
  '\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'", '\u02bc': "'", '\u00b4': "'",
  '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u201f': '"', '\u00ab': '"', '\u00bb': '"',
  '\u2013': '-', '\u2014': '-', '\u2212': '-', '\u00a0': ' ',
}

function plegar(texto: string): string {
  return texto.replace(/[\u2018\u2019\u201a\u201b\u02bc\u00b4\u201c\u201d\u201e\u201f\u00ab\u00bb\u2013\u2014\u2212\u00a0]/g,
    (c) => TIPOGRAFICOS[c] ?? c).toLowerCase()
}

export function buscarTodo(texto: string, aguja: string): Rango[] {
  if (!aguja) return []
  const plano = plegar(texto)
  const agujaPlana = plegar(aguja)
  const salida: Rango[] = []
  let i = plano.indexOf(agujaPlana)
  while (i !== -1) {
    const fin = i + agujaPlana.length
    // El literal sale del texto original: lo que se marca es lo que hay escrito,
    // con sus comillas y sus guiones tal cual.
    if (enLimite(texto, i, fin)) salida.push({ inicio: i, fin, literal: texto.slice(i, fin) })
    i = plano.indexOf(agujaPlana, i + 1)
  }
  return salida
}

/** El espacio duro que mete Intl no es el que sobrevive a un copiar y pegar. */
const normalizar = (t: string) => t.replace(/\u00a0/g, ' ').trim()

interface Variante {
  texto: string
  filtro: string | null
}

/**
 * Todas las formas en que un dato puede aparecer escrito. Un precio se escribe
 * de seis maneras distintas en un contrato y hay que reconocerlas todas.
 */
function variantesDe(valor: string | number, tipo: TipoCampo): Variante[] {
  const bruto = String(valor)
  const salida: Variante[] = []
  const anadir = (texto: string, filtro: string | null) => {
    const limpio = normalizar(texto)
    if (limpio && !salida.some((v) => v.texto.toLowerCase() === limpio.toLowerCase())) {
      salida.push({ texto: limpio, filtro })
    }
  }

  if (tipo === 'money') {
    const n = Number(bruto)
    if (Number.isFinite(n)) {
      const conMiles = new Intl.NumberFormat('es-ES').format(n)
      const conDecimales = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(n)
      anadir(euros(n), 'eur')
      anadir(`${conDecimales} euros`, 'eur')
      anadir(`${conMiles} €`, 'eur')
      anadir(`${conMiles} euros`, 'eur')
      anadir(eurosEnLetras(n), 'letra')
      // «cuatrocientos veinticinco mil euros», sin el «con cero céntimos».
      anadir(eurosEnLetras(Math.floor(n)), 'letra')
    }
    return salida
  }

  if (tipo === 'date') {
    const largo = fechaLarga(bruto)
    anadir(largo, 'fecha')
    // «08 de septiembre» además de «8 de septiembre».
    anadir(largo.replace(/^(\d) /, '0$1 '), 'fecha')
    const [a, m, d] = bruto.split('-')
    if (a && m && d) {
      anadir(`${d}/${m}/${a}`, null)
      anadir(`${Number(d)}/${Number(m)}/${a}`, null)
      anadir(bruto, null)
    }
    return salida
  }

  anadir(bruto, null)
  if (tipo === 'text' && bruto.length > 3) anadir(bruto.toUpperCase(), 'may')
  return salida
}

/** Cifras cortas: solo valen si el texto de alrededor habla de lo que son. */
function pasaElContexto(texto: string, rango: Rango, contexto: RegExp | undefined): boolean {
  if (!contexto) return true
  const desde = Math.max(0, rango.inicio - 60)
  const hasta = Math.min(texto.length, rango.fin + 60)
  return contexto.test(texto.slice(desde, hasta))
}

interface Patron {
  nombre: string
  re: RegExp
  tipo: TipoCampo
  etiqueta: string
  grupo: string
  motivo: string
}

const PATRONES: Patron[] = [
  {
    nombre: 'nif',
    re: /\b\d{8}\s?-?\s?[A-HJ-NP-TV-Z]\b/g,
    tipo: 'nif', etiqueta: 'NIF', grupo: 'Partes',
    motivo: 'Tiene forma de NIF',
  },
  {
    nombre: 'nie',
    re: /\b[XYZ]\s?-?\s?\d{7}\s?-?\s?[A-HJ-NP-TV-Z]\b/g,
    tipo: 'nif', etiqueta: 'NIE', grupo: 'Partes',
    motivo: 'Tiene forma de NIE',
  },
  {
    nombre: 'importe',
    re: /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s?(?:€|euros)\b/gi,
    tipo: 'money', etiqueta: 'Importe', grupo: 'Operación',
    motivo: 'Es un importe en euros',
  },
  {
    nombre: 'catastral',
    re: /\b[0-9]{7}[A-Z]{2}[0-9]{4}[A-Z]\d{4}[A-Z]{2}\b/g,
    tipo: 'text', etiqueta: 'Referencia catastral', grupo: 'Inmueble',
    motivo: 'Tiene forma de referencia catastral',
  },
  {
    nombre: 'fecha',
    re: /\b\d{1,2} de (?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}\b/gi,
    tipo: 'date', etiqueta: 'Fecha', grupo: 'Operación',
    motivo: 'Es una fecha escrita en largo',
  },
  {
    nombre: 'iban',
    re: /\bES\d{2}(?:\s?\d{4}){5}\b/g,
    tipo: 'text', etiqueta: 'Cuenta bancaria', grupo: 'Operación',
    motivo: 'Tiene forma de IBAN',
  },
  {
    nombre: 'protocolo',
    re: /\b(?:protocolo|n[úu]mero de protocolo)\s+(?:n[.ºo]{0,2}\s*)?[\w/.-]{1,20}\b/gi,
    tipo: 'text', etiqueta: 'Número de protocolo', grupo: 'Operación',
    motivo: 'Menciona un número de protocolo',
  },
]

/**
 * Huecos que la plantilla de Word ya traía. Son la señal más clara de todas:
 * alguien ya decidió que ahí va un dato variable, solo falta ponerle nombre.
 */
const HUECOS: { re: RegExp; nombrado: boolean }[] = [
  { re: /\[[^\]\n]{2,48}\]/g, nombrado: true },
  { re: /<<[^>\n]{2,48}>>/g, nombrado: true },
  { re: /_{3,}/g, nombrado: false },
  { re: /\.{5,}/g, nombrado: false },
  { re: /…{2,}/g, nombrado: false },
  { re: /\bX{4,}\b/gi, nombrado: false },
]

function clavePara(base: string, usadas: Set<string>): string {
  let clave = base || 'dato'
  let n = 2
  while (usadas.has(clave)) clave = `${base}${n++}`
  usadas.add(clave)
  return clave
}

export const solapa = (a: Rango, b: Rango) => a.inicio < b.fin && b.inicio < a.fin

export interface OpcionesDeteccion {
  cuerpo: string
  expediente: Expediente | null
  agente: UserInfo | null
}

/**
 * Devuelve las variables candidatas del documento, sin tocarlo. Quien importa
 * las acepta una a una o todas de golpe.
 */
export function detectar({ cuerpo, expediente, agente }: OpcionesDeteccion): Hallazgo[] {
  // Lo que ya es un token no se vuelve a detectar.
  const vetados: Rango[] = []
  const reToken = tokenRe()
  let t: RegExpExecArray | null
  while ((t = reToken.exec(cuerpo)) !== null) {
    vetados.push({ inicio: t.index, fin: t.index + t[0].length, literal: t[0] })
  }
  const libre = (r: Rango) => !vetados.some((v) => solapa(v, r))

  const candidatos: Hallazgo[] = []

  // ─── 1. Contra el expediente del que salió el documento ───────────────────
  if (expediente) {
    const contexto = contextoDe(expediente, agente)

    for (const dato of DATOS_EXPEDIENTE) {
      const valor = contexto[dato.clave]
      if (valor === null || valor === undefined || String(valor).trim() === '') continue

      const extra = dato.clave === 'direccion' ? [expediente.direccion] : []

      for (const variante of [...variantesDe(valor, dato.tipo), ...extra.map((texto) => ({ texto, filtro: null }))]) {
        // Menos de tres caracteres coincide con cualquier cosa. Se admiten dos
        // solo cuando el dato lleva guarda de contexto y no puede colarse.
        const minimo = dato.contexto ? 2 : 3
        if (!variante.texto || variante.texto.length < minimo) continue

        const ocurrencias = buscarTodo(cuerpo, variante.texto).filter(
          (r) => libre(r) && pasaElContexto(cuerpo, r, dato.contexto)
        )
        if (ocurrencias.length === 0) continue

        candidatos.push({
          id: `exp:${dato.clave}:${variante.filtro ?? 'crudo'}`,
          clave: dato.clave,
          etiqueta: dato.etiqueta,
          tipo: dato.tipo,
          grupo: dato.grupo,
          auto: dato.clave,
          filtro: variante.filtro,
          ...(dato.opciones ? { opciones: dato.opciones } : {}),
          ocurrencias,
          confianza: 'alta',
          motivo:
            variante.filtro === 'letra'
              ? `Es ${dato.etiqueta.toLowerCase()} del expediente, escrito en palabras`
              : `Coincide con ${dato.etiqueta.toLowerCase()} del expediente`,
        })
        // Sin `break`: un contrato escribe el precio en cifra y acto seguido
        // entre paréntesis en letra. Son dos tokens del mismo campo, y hay que
        // reconocer los dos.
      }
    }
  }

  // ─── 2. Por la forma del dato ─────────────────────────────────────────────
  for (const patron of PATRONES) {
    const porLiteral = new Map<string, Rango[]>()
    const re = new RegExp(patron.re.source, patron.re.flags)
    let m: RegExpExecArray | null
    while ((m = re.exec(cuerpo)) !== null) {
      const rango = { inicio: m.index, fin: m.index + m[0].length, literal: m[0] }
      if (!libre(rango)) continue
      const llave = m[0].toLowerCase()
      porLiteral.set(llave, [...(porLiteral.get(llave) ?? []), rango])
    }

    for (const [llave, ocurrencias] of porLiteral) {
      candidatos.push({
        id: `patron:${patron.nombre}:${llave}`,
        clave: patron.nombre,
        etiqueta: patron.etiqueta,
        tipo: patron.tipo,
        grupo: patron.grupo,
        auto: null,
        filtro: null,
        ocurrencias,
        confianza: 'media',
        motivo: patron.motivo,
      })
    }
  }

  // ─── 3. Los huecos que ya venían en el documento ──────────────────────────
  HUECOS.forEach((hueco, iHueco) => {
    const re = new RegExp(hueco.re.source, hueco.re.flags)
    let m: RegExpExecArray | null
    let n = 0
    while ((m = re.exec(cuerpo)) !== null) {
      const rango = { inicio: m.index, fin: m.index + m[0].length, literal: m[0] }
      if (!libre(rango)) continue
      n += 1

      // Un `[NOMBRE DEL VENDEDOR]` se llama a sí mismo; una raya de subrayado
      // no, y cada una es un hueco distinto.
      const interior = m[0].replace(/^[[<]+|[\]>]+$/g, '').trim()
      const etiqueta = hueco.nombrado && interior ? interior : 'Hueco por rellenar'

      candidatos.push({
        id: `hueco:${iHueco}:${hueco.nombrado ? interior.toLowerCase() : n}:${m.index}`,
        clave: 'hueco',
        etiqueta: etiqueta.length > 60 ? 'Hueco por rellenar' : etiqueta,
        tipo: 'text',
        grupo: 'Datos',
        auto: null,
        filtro: null,
        ocurrencias: [rango],
        confianza: hueco.nombrado ? 'alta' : 'media',
        motivo: hueco.nombrado
          ? 'El documento ya lo traía marcado como hueco'
          : 'El documento deja aquí un espacio en blanco',
      })
    }
  })

  // ─── Resolver solapes ─────────────────────────────────────────────────────
  // Gana lo más fiable, y a igual fiabilidad lo más largo: si «Montserrat Solé
  // Ribas» y «Montserrat» compiten, el nombre entero es el dato de verdad.
  const orden = { alta: 0, media: 1 }
  const ordenados = [...candidatos].sort((a, b) => {
    const porConfianza = orden[a.confianza] - orden[b.confianza]
    if (porConfianza !== 0) return porConfianza
    const largoA = Math.max(...a.ocurrencias.map((o) => o.fin - o.inicio))
    const largoB = Math.max(...b.ocurrencias.map((o) => o.fin - o.inicio))
    return largoB - largoA
  })

  const tomados: Rango[] = []
  const aceptados: Hallazgo[] = []

  // Las claves de los campos del expediente están reservadas de antemano: un
  // patrón no puede quedarse con «precio» y desplazar al dato de verdad.
  const claves = new Set<string>(
    ordenados.filter((c) => c.auto).map((c) => c.auto as string)
  )

  for (const candidato of ordenados) {
    const libres = candidato.ocurrencias.filter((o) => !tomados.some((r) => solapa(r, o)))
    if (libres.length === 0) continue
    tomados.push(...libres)

    aceptados.push({
      ...candidato,
      // Un campo del expediente conserva su clave tal cual, aunque salga dos
      // veces con filtros distintos: es el mismo campo. Lo demás se numera.
      clave: candidato.auto ?? clavePara(candidato.clave, claves),
      ocurrencias: libres.sort((a, b) => a.inicio - b.inicio),
    })
  }

  return aceptados.sort((a, b) => a.ocurrencias[0].inicio - b.ocurrencias[0].inicio)
}

/** Etiqueta legible de un dato del expediente, para el diálogo de nombrado. */
export function etiquetaDe(clave: string): string {
  return DATO_POR_CLAVE[clave]?.etiqueta ?? clave
}
