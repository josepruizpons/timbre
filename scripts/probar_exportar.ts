// Comprueba lo que se lleva el agente cuando pulsa «Descargar»: que el ZIP es
// un ZIP de verdad, que el .docx lo abre Word y que dice lo mismo que la
// pantalla.
//
//   npm run exportar

import { execFileSync } from 'child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import mammoth from 'mammoth'

import { zip, comoFichero } from '../src/lib/exportar/zip'
import { comoDocx, nombreDocx } from '../src/lib/exportar/docx'
import { comoCarpeta } from '../src/lib/exportar/expediente'
import { leer, comoTexto } from '../src/lib/documento'
import { resumen } from '../src/lib/expediente'
import type { Documento, Expediente, Plantilla } from '../src/types'

let ok = 0
let ko = 0
const bien = (t: string, extra = '') => { console.log(`  \x1b[32m✔\x1b[0m ${t}${extra ? '  ' + extra : ''}`); ok++ }
const mal = (t: string, e: unknown) => { console.log(`  \x1b[31m✘\x1b[0m ${t} — ${String(e).split('\n')[0].slice(0, 140)}`); ko++ }
const probar = async (t: string, fn: () => Promise<string | void> | string | void) => {
  try { bien(t, (await fn()) || '') } catch (e) { mal(t, e) }
}

const carpeta = mkdtempSync(join(tmpdir(), 'timbre-'))
const guardar = async (blob: Blob, nombre: string) => {
  const ruta = join(carpeta, nombre)
  writeFileSync(ruta, Buffer.from(await blob.arrayBuffer()))
  return ruta
}

const PLANTILLA: Plantilla = {
  id: 'plt_prueba',
  nombre: 'Contrato de arras penitenciales',
  requisito: 'PT-05',
  autor: null,
  version: '1',
  actualizada: null,
  usos: 0,
  descripcion: null,
  campos: [
    { clave: 'vendedor', etiqueta: 'Vendedor', tipo: 'text' },
    { clave: 'precio', etiqueta: 'Precio', tipo: 'money' },
    { clave: 'notario', etiqueta: 'Notario', tipo: 'text' },
  ],
  cuerpo: [
    '# Contrato de arras penitenciales',
    '',
    'En Barcelona, reunidos {{vendedor}} de una parte y la compradora de otra,',
    'convienen la venta por {{precio|eur}} ({{precio|letra}}).',
    '-',
    '§ Primera. Objeto',
    'La finca sita en el carrer d’Aribau, con «comillas» y un & suelto.',
    '> La firma se otorgará ante {{notario}}.',
  ].join('\n'),
}

const VALORES = { vendedor: 'Marta Puig Serra', precio: '425000' }

async function main() {
  console.log('Comprobando lo que se descarga\n')

  console.log('── El ZIP ──')
  let zipRuta = ''
  await probar('arma un ZIP que el sistema da por bueno', async () => {
    const blob = await zip([
      { nombre: 'nota.txt', datos: 'un papel cualquiera' },
      { nombre: 'Sueltos/foto del buzón.txt', datos: 'con tildes y espacios' },
      { nombre: 'binario.bin', datos: new Uint8Array([0, 1, 2, 253, 254, 255]) },
    ])
    zipRuta = await guardar(blob, 'prueba.zip')
    const salida = execFileSync('unzip', ['-t', zipRuta], { encoding: 'utf8' })
    if (!salida.includes('No errors detected')) throw new Error(salida)
    return `${(blob.size / 1024).toFixed(1)} kB`
  })

  await probar('los nombres con tildes llegan enteros', () => {
    // Se lee con `zipfile` de Python y no con `unzip`, porque el `unzip` de
    // Debian es de 2009 y no mira el bit que dice «este nombre va en UTF-8».
    // Los que sí lo miran —Windows, macOS, Python— ven la ñ y la ó.
    const nombres = execFileSync('python3', [
      '-c',
      'import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1])\n' +
        'print("\\n".join(i.filename+"\\t"+hex(i.flag_bits) for i in z.infolist()))',
      zipRuta,
    ], { encoding: 'utf8' })
    if (!nombres.includes('Sueltos/foto del buzón.txt')) throw new Error(nombres)
    if (!nombres.includes('0x800')) throw new Error('falta la marca de UTF-8')
  })

  await probar('el contenido binario sale byte a byte como entró', () => {
    execFileSync('unzip', ['-o', '-q', zipRuta, '-d', join(carpeta, 'abierto')])
    const bytes = readFileSync(join(carpeta, 'abierto', 'binario.bin'))
    if (!bytes.equals(Buffer.from([0, 1, 2, 253, 254, 255]))) throw new Error([...bytes].join(','))
  })

  await probar('guarda sin comprimir, que es lo que dice hacer', () => {
    const detalle = execFileSync('unzip', ['-v', zipRuta], { encoding: 'utf8' })
    if (!/Stored/.test(detalle)) throw new Error(detalle)
    if (/Defl/.test(detalle)) throw new Error('algo ha salido comprimido')
  })

  console.log('\n── El .docx ──')
  let docxRuta = ''
  await probar('arma un .docx que el sistema da por buen ZIP', async () => {
    const blob = await comoDocx({ plantilla: PLANTILLA, valores: VALORES, expedienteId: 'exp_1' })
    docxRuta = await guardar(blob, 'documento.docx')
    const salida = execFileSync('unzip', ['-t', docxRuta], { encoding: 'utf8' })
    if (!salida.includes('No errors detected')) throw new Error(salida)
    return `${(blob.size / 1024).toFixed(1)} kB`
  })

  await probar('lleva dentro las cinco piezas que pide el formato', () => {
    const listado = execFileSync('unzip', ['-l', docxRuta], { encoding: 'utf8' })
    for (const pieza of [
      '[Content_Types].xml', '_rels/.rels',
      'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels',
    ]) {
      if (!listado.includes(pieza)) throw new Error('falta ' + pieza)
    }
  })

  // mammoth es el mismo lector que usa el importador para tragarse los Word de
  // la agencia. Si él lo abre, es un .docx de verdad y no un ZIP con aires.
  let html = ''
  await probar('un lector de .docx de verdad lo abre', async () => {
    const r = await mammoth.convertToHtml({ buffer: readFileSync(docxRuta) })
    html = r.value
    const graves = r.messages.filter((m) => m.type === 'error')
    if (graves.length) throw new Error(JSON.stringify(graves))
    if (!html) throw new Error('no ha salido nada')
    return `${html.length} caracteres de HTML`
  })

  await probar('el título y la cláusula llegan como tales', () => {
    if (!/Contrato de arras penitenciales/.test(html)) throw new Error('falta el título')
    if (!/Primera\. Objeto/.test(html)) throw new Error('falta la cláusula')
  })

  await probar('los valores del expediente van puestos', () => {
    if (!html.includes('Marta Puig Serra')) throw new Error('falta el vendedor')
    if (!html.includes('425.000,00')) throw new Error('el precio no lleva su formato')
    if (!/CUATROCIENTOS VEINTICINCO MIL EUROS/i.test(html)) throw new Error('falta el precio en letras')
  })

  await probar('lo que falta se ve, no se disimula', () => {
    // `notario` se ha quedado sin valor: tiene que salir con su etiqueta.
    if (!html.includes('[Notario]')) throw new Error('el hueco vacío ha desaparecido')
    if (html.includes('{{')) throw new Error('ha quedado un token sin resolver')
  })

  await probar('los caracteres que rompen XML salen enteros', () => {
    if (!html.includes('&amp;')) throw new Error('el & no se ha escapado')
    if (!html.includes('«comillas»')) throw new Error('faltan las comillas')
    if (!html.includes('d’Aribau')) throw new Error('falta el apóstrofo tipográfico')
  })

  await probar('el pie de firmas es el del tipo de documento', () => {
    if (!html.includes('La parte vendedora')) throw new Error('falta la firma del vendedor')
    if (!html.includes('La parte compradora')) throw new Error('falta la firma del comprador')
  })

  console.log('\n── La pantalla y el fichero dicen lo mismo ──')
  await probar('cada línea del cuerpo llega al documento', () => {
    const enPantalla = comoTexto(leer(PLANTILLA.cuerpo, VALORES, PLANTILLA.campos))
    const plano = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
    const faltan = enPantalla
      .split('\n')
      .filter((l) => l !== '—' && l.trim())
      .filter((l) => !plano.includes(l.replace(/\s+/g, ' ').trim()))
    if (faltan.length) throw new Error('no llegaron: ' + faltan.join(' | '))
    return `${enPantalla.split('\n').length} líneas`
  })

  console.log('\n── Los nombres de fichero ──')
  await probar('el nombre lleva delante el requisito', () => {
    const n = nombreDocx(PLANTILLA, 'EXP-2026-004')
    if (n !== 'PT-05 Contrato de arras penitenciales (EXP-2026-004).docx') throw new Error(n)
    return n
  })
  await probar('un nombre imposible se vuelve posible', () => {
    const n = comoFichero('Nota simple 12/03: "urgente" <ya>', '.pdf')
    if (/[\\/:*?"<>|]/.test(n)) throw new Error(n)
    return n
  })

  console.log('\n── El expediente entero ──')
  const EXP: Expediente = {
    id: 'exp_prueba', referencia: 'EXP-2026-004', estado: 'activo', fase: 'Preparando la firma',
    direccion: 'Carrer d’Aribau 132, 3r 2a', municipio: 'Barcelona', provincia: 'Barcelona',
    ccaa: 'Cataluña', cp: '08036', refCatastral: '9872023VH5797S0001WX',
    fincaRegistral: '14.552', registro: 'Registro de la Propiedad nº 7 de Barcelona',
    superficie: 88, anioConstruccion: 1972,
    vendedor: 'Marta Puig Serra', vendedorNif: '46 789 012 K', vendedorEstadoCivil: 'casada',
    comprador: 'Iván Delgado Ríos', compradorNif: '52 341 908 B', compradorEstadoCivil: 'soltero',
    precio: 425000, arras: 25000, fechaFirma: '2026-09-14',
    notaria: 'Notaría de Ana Vidal', protocolo: null, abierto: '2026-06-02', cerrado: null,
    hipoteca: true, cargaHipotecaria: false, compradorExtranjero: false, vendedorNoResidente: false,
    obraNueva: false, herencia: false, representacion: false, unifamiliar: false,
    reqs: { 'PT-05': { estado: 'aportado', emitido: '2026-06-20', plantillaId: PLANTILLA.id, valores: VALORES, nota: '' } },
    traza: [],
  }

  const doc = (id: string, extra: Partial<Documento>): Documento => ({
    id, reqId: null, origen: 'recibido', estado: 'recibido', nombre: 'Documento',
    plantillaId: null, valores: {}, congelado: false,
    nombreFichero: 'papel.pdf', mime: 'application/pdf', tamano: 20, emisor: null,
    emitido: null, caduca: null, nota: '', autor: null, creado: '2026-08-01T09:00:00.000Z',
    ...extra,
  })

  const DOCUMENTOS: Documento[] = [
    doc('d1', { reqId: 'IN-01', nombre: 'Nota simple', emisor: 'Registro nº 7', emitido: '2026-08-01', caduca: '2026-10-30' }),
    // Mismo nombre y mismo requisito: en el ZIP no pueden llamarse igual.
    doc('d2', { reqId: 'IN-01', nombre: 'Nota simple' }),
    doc('d3', { nombre: 'Foto del buzón', nombreFichero: 'buzón.jpg', mime: 'image/jpeg' }),
    doc('d4', { reqId: 'IN-03', nombre: 'Certificado que se cayó' }),
  ]

  let carpetaZip = ''
  let indice = ''
  await probar('arma la carpeta con todo dentro', async () => {
    const hecha = await comoCarpeta({
      exp: EXP,
      res: resumen(EXP),
      plantillas: [PLANTILLA],
      documentos: DOCUMENTOS,
      agente: { nombre: 'Sergio Bravo' },
      // El almacén de mentira: todo baja bien menos `d4`, para ver qué hace
      // la carpeta cuando un fichero no se puede traer.
      urlDe: async (id) => {
        if (id === 'd4') throw new Error('el almacén no responde')
        return `data:text/plain;base64,${Buffer.from('papel ' + id).toString('base64')}`
      },
    })
    if (hecha.nombre !== 'Expediente EXP-2026-004.zip') throw new Error(hecha.nombre)
    carpetaZip = await guardar(hecha.blob, 'expediente.zip')
    const salida = execFileSync('unzip', ['-t', carpetaZip], { encoding: 'utf8' })
    if (!salida.includes('No errors detected')) throw new Error(salida)
    if (hecha.fallidos.length !== 1) throw new Error(`fallidos: ${hecha.fallidos.length}`)
    return `${hecha.fallidos.length} no cabía, el resto sí`
  })

  await probar('cada papel va con su requisito delante, y los sueltos aparte', () => {
    const listado = execFileSync('unzip', ['-l', carpetaZip], { encoding: 'utf8' })
    for (const esperado of ['IN-01 Nota simple.pdf', 'IN-01 Nota simple (2).pdf', 'Sueltos/Foto del buzón.jpg']) {
      if (!listado.includes(esperado)) throw new Error('falta ' + esperado + '\n' + listado)
    }
    // El generado sale del requisito PT-05, en .docx.
    if (!listado.includes('PT-05 Contrato de arras penitenciales.docx')) throw new Error(listado)
  })

  await probar('el índice va el primero y lo abre Windows sin estropear las tildes', () => {
    execFileSync('unzip', ['-o', '-q', carpetaZip, '-d', join(carpeta, 'exp')])
    const crudo = readFileSync(join(carpeta, 'exp', '00 Índice.txt'))
    if (crudo[0] !== 0xef || crudo[1] !== 0xbb || crudo[2] !== 0xbf) {
      throw new Error('sin marca de UTF-8 al principio')
    }
    indice = crudo.toString('utf8')
    const primero = execFileSync('unzip', ['-l', carpetaZip], { encoding: 'utf8' })
      .split('\n').find((l) => /\.(txt|pdf|jpg|docx)/.test(l))
    if (!primero?.includes('00 Índice.txt')) throw new Error('el índice no va delante: ' + primero)
  })

  await probar('el índice dice de qué expediente es', () => {
    for (const dato of ['EXP-2026-004', 'Carrer d’Aribau 132', 'Marta Puig Serra', '425.000,00', '14 de septiembre de 2026']) {
      if (!indice.includes(dato)) throw new Error('falta ' + dato)
    }
  })

  await probar('el índice lista lo que va dentro con su vigencia', () => {
    if (!indice.includes('LO QUE VA EN ESTA CARPETA')) throw new Error('sin sección')
    if (!indice.includes('Nota simple registral actualizada')) throw new Error('falta el nombre del requisito')
    if (!indice.includes('de Registro nº 7')) throw new Error('falta el emisor')
    if (!indice.includes('caduca 30 de octubre de 2026')) throw new Error('falta la caducidad')
    if (!indice.includes('no cubre ningún requisito')) throw new Error('el suelto no se explica')
  })

  await probar('un requisito con papel dentro no sale también como que falta', () => {
    const [, faltan = ''] = indice.split('LO QUE FALTA')
    if (/IN-01/.test(faltan)) throw new Error('IN-01 tiene su nota simple dentro y aún así la reclama')
    if (!/IN-02/.test(faltan)) throw new Error('IN-02 sí falta y no aparece')
  })

  await probar('no repite el municipio cuando la provincia se llama igual', () => {
    if (indice.includes('Barcelona, Barcelona')) throw new Error('Barcelona, Barcelona')
  })

  await probar('el índice lista lo que falta, que es para lo que sirve', () => {
    if (!indice.includes('LO QUE FALTA')) throw new Error('sin sección')
    // IN-02, la escritura del vendedor, no se ha aportado y bloquea la firma.
    if (!/IN-02\s+Escritura de título del vendedor/.test(indice)) throw new Error('falta IN-02')
    if (!indice.includes('BLOQUEA LA FIRMA')) throw new Error('no avisa de lo que bloquea')
    if (!indice.includes('lo aporta: Vendedor')) throw new Error('no dice a quién reclamárselo')
  })

  await probar('el índice no esconde lo que no se pudo traer', () => {
    if (!indice.includes('NO SE PUDIERON INCLUIR')) throw new Error('sin sección')
    if (!indice.includes('Certificado que se cayó')) throw new Error('no lo nombra')
    if (!indice.includes('el almacén no responde')) throw new Error('no dice por qué')
  })

  await probar('el contenido de cada papel es el que bajó del almacén', () => {
    const uno = readFileSync(join(carpeta, 'exp', 'IN-01 Nota simple.pdf'), 'utf8')
    const dos = readFileSync(join(carpeta, 'exp', 'IN-01 Nota simple (2).pdf'), 'utf8')
    if (uno !== 'papel d1' || dos !== 'papel d2') throw new Error(`${uno} / ${dos}`)
  })

  if (process.env.VER_INDICE) {
    console.log('\n' + '━'.repeat(66) + '\n' + indice.replace(/^\ufeff/, '') + '\n' + '━'.repeat(66))
  }

  rmSync(carpeta, { recursive: true, force: true })
  console.log(`\n${ok} correctas, ${ko} fallidas`)
  process.exit(ko === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
