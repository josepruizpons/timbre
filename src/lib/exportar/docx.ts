import { leer, type LineaDoc, type TipoLinea } from '../documento'
import { serial } from '../guilloche'
import { FIRMAS } from '../../data/firmas'
import { comoFichero, zip } from './zip'
import type { Plantilla } from '../../types'

/**
 * El documento en .docx, para que el agente lo termine en Word.
 *
 * El PDF que sale de imprimir la hoja es el documento acabado; esto es lo
 * contrario: el documento abierto, con sus estilos puestos, para retocar una
 * cláusula antes de mandarlo. La agencia lleva años trabajando en Word y pedir
 * que deje de hacerlo sería justo el trabajo extra que Timbre quiere quitar.
 *
 * Un .docx es un ZIP con cuatro XML dentro. Se arma a mano porque el marcado
 * que hay que verter es corto —títulos, cláusulas, notas, párrafos— y traerse
 * una librería de medio mega para eso sería pagar mucho por poco.
 *
 * Los huecos sin rellenar salen resaltados en amarillo y con la etiqueta entre
 * corchetes: al abrirlo en Word se ve de un golpe qué falta, igual que en la
 * pantalla se ven las ranuras punteadas.
 */

const CABECERA = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Un tramo de texto con su formato. `hueco` marca lo que está sin rellenar. */
function tramo(texto: string, { hueco = false, tenue = false } = {}): string {
  if (!texto) return ''
  const props = [
    hueco ? '<w:highlight w:val="yellow"/>' : '',
    tenue ? '<w:color w:val="6B6560"/><w:sz w:val="16"/>' : '',
  ].join('')
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(texto)}</w:t></w:r>`
}

const ESTILO: Record<Exclude<TipoLinea, 'regla'>, string> = {
  titulo: 'TimbreTitulo',
  clausula: 'TimbreClausula',
  nota: 'TimbreNota',
  parrafo: 'TimbreParrafo',
}

function parrafo(linea: LineaDoc): string {
  if (linea.tipo === 'regla') {
    return (
      '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="C9C2B8"/>' +
      '</w:pBdr><w:spacing w:before="120" w:after="120"/></w:pPr></w:p>'
    )
  }
  const tramos = linea.trozos
    .map((t) =>
      t.tipo === 'texto'
        ? tramo(t.texto)
        : tramo(t.valor || `[${t.etiqueta}]`, { hueco: !t.valor })
    )
    .join('')
  return `<w:p><w:pPr><w:pStyle w:val="${ESTILO[linea.tipo]}"/></w:pPr>${tramos}</w:p>`
}

/** El pie de firmas, en una tabla de dos columnas sin bordes visibles. */
function firmas(nombres: string[]): string {
  const celdas = nombres
    .map(
      (n) =>
        '<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/>' +
        (n
          ? '<w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="1C1B19"/></w:tcBorders>'
          : '') +
        `</w:tcPr><w:p><w:pPr><w:pStyle w:val="TimbreFirma"/></w:pPr>${tramo(n)}</w:p></w:tc>`
    )
    .join('')
  return (
    '<w:p/><w:p/><w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>' +
    '<w:tblLayout w:type="fixed"/></w:tblPr>' +
    `<w:tr>${celdas}</w:tr></w:tbl>`
  )
}

const ESTILOS =
  CABECERA +
  `<w:styles xmlns:w="${NS_W}">` +
  '<w:docDefaults><w:rPrDefault><w:rPr>' +
  '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="21"/><w:lang w:val="es-ES"/>' +
  '</w:rPr></w:rPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
  // Título: centrado, versales y espaciado, como en la hoja.
  '<w:style w:type="paragraph" w:styleId="TimbreTitulo"><w:name w:val="Timbre título"/>' +
  '<w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="160"/><w:keepNext/></w:pPr>' +
  '<w:rPr><w:b/><w:caps/><w:spacing w:val="30"/><w:sz w:val="24"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="TimbreClausula"><w:name w:val="Timbre cláusula"/>' +
  '<w:pPr><w:spacing w:before="220" w:after="80"/><w:keepNext/></w:pPr>' +
  '<w:rPr><w:b/><w:sz w:val="21"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="TimbreParrafo"><w:name w:val="Timbre párrafo"/>' +
  '<w:pPr><w:jc w:val="both"/><w:spacing w:after="120" w:line="276" w:lineRule="auto"/>' +
  '<w:widowControl/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="TimbreNota"><w:name w:val="Timbre nota"/>' +
  '<w:pPr><w:ind w:left="454"/><w:spacing w:after="120"/></w:pPr>' +
  '<w:rPr><w:i/><w:color w:val="6B6560"/><w:sz w:val="19"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="TimbreFirma"><w:name w:val="Timbre firma"/>' +
  '<w:pPr><w:spacing w:before="80"/></w:pPr>' +
  '<w:rPr><w:color w:val="6B6560"/><w:sz w:val="17"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="TimbreSerie"><w:name w:val="Timbre serie"/>' +
  '<w:pPr><w:jc w:val="right"/><w:spacing w:after="200"/></w:pPr></w:style>' +
  '</w:styles>'

const TIPOS =
  CABECERA +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '</Types>'

const RELS_RAIZ =
  CABECERA +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="word/document.xml"/>` +
  '</Relationships>'

const RELS_DOC =
  CABECERA +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  `<Relationship Id="rId1" Type="${NS_REL}/styles" Target="styles.xml"/>` +
  '</Relationships>'

// A4 en vigésimas de punto, con los márgenes del papel timbrado: más ancho a
// la izquierda, que es donde se encuaderna.
const PAGINA =
  '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
  '<w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1701" w:header="709" w:footer="709"/>' +
  '</w:sectPr>'

export interface OpcionesDocx {
  plantilla: Plantilla
  valores: Record<string, string> | undefined
  expedienteId?: string
}

/** El .docx completo, listo para descargar. */
export async function comoDocx({ plantilla, valores, expedienteId = '' }: OpcionesDocx): Promise<Blob> {
  const lineas = leer(plantilla.cuerpo, valores, plantilla.campos)
  const pie = plantilla.requisito ? FIRMAS[plantilla.requisito] : undefined

  const serie =
    '<w:p><w:pPr><w:pStyle w:val="TimbreSerie"/></w:pPr>' +
    tramo(serial(plantilla.id, expedienteId), { tenue: true }) +
    '</w:p>'

  const documento =
    CABECERA +
    `<w:document xmlns:w="${NS_W}"><w:body>` +
    serie +
    lineas.map(parrafo).join('') +
    (pie ? firmas(pie) : '') +
    PAGINA +
    '</w:body></w:document>'

  // `[Content_Types].xml` va primero porque es lo que Word busca al abrir.
  return zip([
    { nombre: '[Content_Types].xml', datos: TIPOS },
    { nombre: '_rels/.rels', datos: RELS_RAIZ },
    { nombre: 'word/_rels/document.xml.rels', datos: RELS_DOC },
    { nombre: 'word/styles.xml', datos: ESTILOS },
    { nombre: 'word/document.xml', datos: documento },
  ])
}

/** El nombre con el que se guarda: el del documento, no el de la plantilla. */
export function nombreDocx(plantilla: Plantilla, referencia?: string): string {
  const prefijo = plantilla.requisito ? `${plantilla.requisito} ` : ''
  const sufijo = referencia ? ` (${referencia})` : ''
  return comoFichero(`${prefijo}${plantilla.nombre}${sufijo}`, '.docx')
}
