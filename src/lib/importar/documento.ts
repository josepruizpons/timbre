// De un documento de Word al cuerpo de una plantilla.
//
// La entrada es HTML: el del portapapeles cuando pegan desde Word, Google Docs
// o LibreOffice, o el que produce mammoth al leer un .docx. La salida es el
// marcado de `Hoja`: `# título`, `§ cláusula`, `> nota`, `-` regla.
//
// Lo que se conserva es la ESTRUCTURA, no el formato. Cuarenta documentos
// escritos por cuatro personas distintas entran con cuarenta tipografías y
// salen todos con la cara de Timbre, que es justamente lo que se quiere.

/** Bloques que, si no contienen otros bloques, se vuelcan como una línea. */
const BLOQUES = new Set([
  'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'BLOCKQUOTE', 'PRE', 'TR', 'TD', 'TH', 'HR', 'SECTION', 'ARTICLE',
])

// Los ordinales con los que se numeran las cláusulas de un contrato español.
const ORDINAL =
  'PRIMER[AO]|SEGUND[AO]|TERCER[AO]|CUART[AO]|QUINT[AO]|SEXT[AO]|S[ÉE]PTIM[AO]|' +
  'OCTAV[AO]|NOVEN[AO]|D[ÉE]CIM[AO]|UND[ÉE]CIM[AO]|DUOD[ÉE]CIM[AO]|' +
  'DECIMOTERCER[AO]|DECIMOCUART[AO]|DECIMOQUINT[AO]|DECIMOSEXT[AO]'

/** «PRIMERA.-», «CLÁUSULA TERCERA», «ESTIPULACIÓN 2ª». */
const CLAUSULA = new RegExp(
  `^\\s*(?:(?:CL[ÁA]USULA|ESTIPULACI[ÓO]N|PACTO|ART[ÍI]CULO)\\s+)?` +
    `(?:${ORDINAL}|\\d{1,2}[ªº.-]?)\\s*[.\\-–—:)]`,
  'i'
)

/** Los apartados fijos de una escritura o un contrato. */
const APARTADO = new RegExp(
  '^\\s*(REUNIDOS|INTERVIENEN?|COMPARECEN?|EXPONEN?|MANIFIESTAN?|ANTECEDENTES|' +
    'ACUERDAN|CONVIENEN|ESTIPULACIONES|CL[ÁA]USULAS|PACTOS|OTORGAN)\\b\\s*[:.]?\\s*$',
  'i'
)

/** Notas al pie y advertencias legales, que en la hoja van en cuerpo menor. */
const NOTA = /^\s*(N\.?B\.?|NOTA|AVISO|ADVERTENCIA|IMPORTANTE|\(\*\))\s*[:.\-–—]/i

interface Bloque {
  texto: string
  /** Nivel del encabezado de origen: 1 para h1/h2, 2 para h3+, 0 si es párrafo. */
  encabezado: number
  /** Todo el texto del bloque venía en negrita. */
  destacado: boolean
  regla: boolean
}

const limpiar = (t: string) =>
  t
    // El espacio duro de Word y las marcas invisibles de dirección de texto no
    // sobreviven a una comparación literal: fuera antes de nada.
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** ¿Todo el texto con contenido del elemento está dentro de negritas? */
function todoEnNegrita(el: Element): boolean {
  const texto = limpiar(el.textContent ?? '')
  if (!texto) return false
  const negritas = Array.from(el.querySelectorAll('b, strong'))
    .map((n) => limpiar(n.textContent ?? ''))
    .join(' ')
  return limpiar(negritas) === texto
}

function esMayusculas(texto: string): boolean {
  const letras = texto.replace(/[^\p{L}]/gu, '')
  return letras.length > 2 && letras === letras.toLocaleUpperCase('es')
}

/**
 * Recorre el árbol quedándose con los bloques hoja. Un `div` que contiene
 * párrafos no produce línea propia: la producen sus párrafos.
 */
function recogerBloques(nodo: Element, salida: Bloque[]): void {
  for (const hijo of Array.from(nodo.children)) {
    const etiqueta = hijo.tagName

    if (etiqueta === 'HR') {
      salida.push({ texto: '', encabezado: 0, destacado: false, regla: true })
      continue
    }

    // Una fila de tabla se aplana a una sola línea: el formato de la hoja no
    // tiene tablas, y repartir las celdas en líneas sueltas se lee peor.
    if (etiqueta === 'TR') {
      const celdas = Array.from(hijo.children)
        .map((c) => limpiar(c.textContent ?? ''))
        .filter(Boolean)
      if (celdas.length) {
        salida.push({ texto: celdas.join(' · '), encabezado: 0, destacado: false, regla: false })
      }
      continue
    }

    const tieneBloquesDentro = Array.from(hijo.children).some(
      (n) => BLOQUES.has(n.tagName) && limpiar(n.textContent ?? '') !== ''
    )

    if (tieneBloquesDentro) {
      recogerBloques(hijo, salida)
      continue
    }

    if (!BLOQUES.has(etiqueta)) {
      // Contenedor desconocido con texto suelto: se sigue bajando.
      if (hijo.children.length) recogerBloques(hijo, salida)
      else {
        const suelto = limpiar(hijo.textContent ?? '')
        if (suelto) salida.push({ texto: suelto, encabezado: 0, destacado: false, regla: false })
      }
      continue
    }

    const encabezado = /^H([1-6])$/.exec(etiqueta)
    const destacado = todoEnNegrita(hijo)

    // Un <br> dentro del párrafo corta línea: en este formato, cada línea es
    // su propio bloque.
    const trozos = (hijo.innerHTML || '')
      .split(/<br\s*\/?>/i)
      .map((html) => {
        const caja = hijo.ownerDocument.createElement('div')
        caja.innerHTML = html
        return limpiar(caja.textContent ?? '')
      })
      .filter(Boolean)

    for (const texto of trozos) {
      salida.push({
        texto,
        encabezado: encabezado ? (Number(encabezado[1]) <= 2 ? 1 : 2) : 0,
        destacado,
        regla: false,
      })
    }
  }
}

/** Clasifica un bloque ya limpio y le pone su marca de línea. */
function marcar(b: Bloque, indice: number): string {
  if (b.regla) return '-'

  const texto = b.texto

  if (APARTADO.test(texto)) return `§ ${texto.replace(/[:.]\s*$/, '')}`
  if (CLAUSULA.test(texto) && texto.length < 120) return `§ ${texto}`
  if (b.encabezado === 1) return `# ${texto}`
  if (b.encabezado === 2) return `§ ${texto}`
  if (NOTA.test(texto)) return `> ${texto}`

  // Sin encabezados de verdad —lo normal en un documento de despacho, donde el
  // título va en negrita y ya está— hay que deducirlo: línea corta, sin punto
  // final, destacada o en mayúsculas.
  const corta = texto.length <= 90
  const sinPunto = !/[.;,]$/.test(texto)
  if (corta && sinPunto && (b.destacado || esMayusculas(texto))) {
    return indice <= 2 ? `# ${texto}` : `§ ${texto}`
  }

  return texto
}

/**
 * Los títulos de los documentos de despacho van en versales —«CONTRATO DE ARRAS
 * PENITENCIALES»— y eso, puesto como nombre de plantilla, grita en la
 * biblioteca y en el titular de la pantalla. Se baja a caja normal.
 */
function comoNombre(titulo: string): string {
  const letras = titulo.replace(/[^\p{L}]/gu, '')
  const mayusculas = titulo.replace(/[^\p{Lu}]/gu, '')
  if (letras.length < 4 || mayusculas.length / letras.length < 0.8) return titulo

  const bajado = titulo.toLocaleLowerCase('es')
  return bajado.charAt(0).toLocaleUpperCase('es') + bajado.slice(1)
}

export interface DocumentoImportado {
  cuerpo: string
  /** Título que se propone para la plantilla: la primera línea de título. */
  titulo: string
  lineas: number
  /** Lo que se ha perdido por el camino, para poder decírselo a quien importa. */
  avisos: string[]
}

function ensamblar(bloques: Bloque[], avisos: string[]): DocumentoImportado {
  const lineas = bloques.map(marcar)

  // Dos reglas seguidas, o una regla al principio, no dicen nada.
  const podadas: string[] = []
  for (const linea of lineas) {
    if (linea === '-' && (podadas.length === 0 || podadas[podadas.length - 1] === '-')) continue
    podadas.push(linea)
  }
  while (podadas.length && podadas[podadas.length - 1] === '-') podadas.pop()

  const primerTitulo = podadas.find((l) => l.startsWith('# '))

  return {
    cuerpo: podadas.join('\n\n'),
    titulo: primerTitulo ? comoNombre(primerTitulo.slice(2)) : '',
    lineas: podadas.length,
    avisos,
  }
}

/** HTML (portapapeles o mammoth) → cuerpo de plantilla. */
export function desdeHtml(html: string): DocumentoImportado {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  for (const basura of Array.from(doc.querySelectorAll('style, script, meta, link, title'))) {
    basura.remove()
  }

  const avisos: string[] = []
  const imagenes = doc.querySelectorAll('img').length
  if (imagenes > 0) {
    avisos.push(
      `Se ${imagenes === 1 ? 'ha quitado 1 imagen' : `han quitado ${imagenes} imágenes`}: la hoja de Timbre lleva su propio membrete.`
    )
  }
  if (doc.querySelector('table')) {
    avisos.push('Las tablas se han aplanado a líneas; revísalas en la vista previa.')
  }

  const bloques: Bloque[] = []
  recogerBloques(doc.body, bloques)

  const utiles = bloques.filter((b) => b.regla || b.texto !== '')
  return ensamblar(utiles, avisos)
}

/** Texto pelado, para cuando el portapapeles no trae HTML. */
export function desdeTexto(texto: string): DocumentoImportado {
  const bloques: Bloque[] = texto
    .split(/\r?\n/)
    .map((l) => limpiar(l))
    .filter(Boolean)
    .map((t) => ({
      texto: t,
      encabezado: 0,
      destacado: false,
      regla: /^[-–—_*=]{3,}$/.test(t),
    }))

  return ensamblar(bloques, [])
}

/** .docx → cuerpo. mammoth se carga solo cuando hace falta: pesa. */
export async function desdeDocx(fichero: File): Promise<DocumentoImportado> {
  const mammoth = await import('mammoth')
  const buffer = await fichero.arrayBuffer()
  const { value, messages } = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    // Word marca los títulos con estilos de párrafo con nombre; sin esto
    // mammoth los devuelve como párrafos normales y se pierde la estructura.
    {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Título'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Subtítulo'] => h2:fresh",
      ],
    }
  )

  const importado = desdeHtml(value)
  const perdidas = messages.filter((m) => m.type === 'warning').length
  if (perdidas > 6) {
    importado.avisos.push(`Word traía ${perdidas} detalles de formato que no se conservan.`)
  }
  return importado
}
