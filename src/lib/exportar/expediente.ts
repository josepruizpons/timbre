import { comoDocx } from './docx'
import { comoFichero, zip, type EntradaZip } from './zip'
import { euros, fechaLarga } from '../format'
import { POR_ID } from '../../data/catalog'
import type { ResumenExpediente } from '../expediente'
import type { Documento, Expediente, Plantilla, UserInfo } from '../../types'

/** De quien prepara la carpeta solo hace falta el nombre, para firmar el índice. */
type Firmante = Pick<UserInfo, 'nombre'> | null

/**
 * El expediente entero en un ZIP: lo que se manda a la notaría la semana antes
 * de firmar, y que hoy se arma a mano adjuntando veinte ficheros a un correo.
 *
 * Dentro va también un índice, y ahí está lo que de verdad aporta esto: la
 * lista de lo que falta viaja con la carpeta. Sin él, el que la recibe tiene
 * que abrir los veinte ficheros para saber qué no le has mandado, y acaba
 * llamando por teléfono.
 *
 * Los recibidos van tal cual llegaron —un escaneo firmado no se toca— y los
 * generados van en .docx, que es lo que se puede componer aquí sin pedirle
 * nada al servidor.
 */

/** Una línea del apartado «lo que va en esta carpeta». */
interface Dentro {
  req: string | null
  fichero: string
  detalle: string
}

export interface OpcionesCarpeta {
  exp: Expediente
  res: ResumenExpediente
  plantillas: Plantilla[]
  documentos: Documento[]
  agente: Firmante
  /** Pide al almacén la URL firmada de un documento recibido. */
  urlDe: (documentoId: string) => Promise<string>
  /** Para poder enseñar por dónde va: los escaneos tardan en bajar. */
  alAvanzar?: (hechos: number, total: number) => void
}

export interface Carpeta {
  blob: Blob
  nombre: string
  /** Documentos que no se pudieron traer del almacén, con su porqué. */
  fallidos: { nombre: string; porque: string }[]
}

const raya = (n = 62) => '─'.repeat(n)

function cabecera(exp: Expediente, res: ResumenExpediente, agente: Firmante): string {
  // En Barcelona, Madrid o Murcia el municipio y la provincia se llaman igual,
  // y repetirlo queda a máquina.
  const lugar = [exp.direccion, exp.municipio, exp.provincia]
    .filter(Boolean)
    .filter((parte, i, todos) => parte !== todos[i - 1])
    .join(', ')
  const lineas = [
    `EXPEDIENTE ${exp.referencia}`,
    raya(),
    lugar,
    exp.refCatastral ? `Referencia catastral: ${exp.refCatastral}` : '',
    exp.fincaRegistral ? `Finca registral ${exp.fincaRegistral}${exp.registro ? ` · ${exp.registro}` : ''}` : '',
    '',
    exp.vendedor ? `Vende:  ${exp.vendedor}${exp.vendedorNif ? ` · ${exp.vendedorNif}` : ''}` : '',
    exp.comprador ? `Compra: ${exp.comprador}${exp.compradorNif ? ` · ${exp.compradorNif}` : ''}` : '',
    exp.precio ? `Precio: ${euros(exp.precio)}` : '',
    exp.fechaFirma ? `Firma prevista: ${fechaLarga(exp.fechaFirma)}` : '',
    exp.notaria ? `Notaría: ${exp.notaria}` : '',
    '',
    `Preparado el ${fechaLarga(new Date().toISOString().slice(0, 10))}${
      agente?.nombre ? ` por ${agente.nombre}` : ''
    }.`,
    `${res.conformes} de ${res.total} requisitos conformes.`,
  ]
  return lineas.filter((l) => l !== '').join('\n')
}

/** El índice: qué va dentro, qué falta y qué está a punto de caducar. */
function indice(
  exp: Expediente,
  res: ResumenExpediente,
  agente: Firmante,
  dentro: Dentro[],
  fallidos: { nombre: string; porque: string }[]
): string {
  const partes = [cabecera(exp, res, agente), '']

  partes.push('LO QUE VA EN ESTA CARPETA', raya())
  if (dentro.length === 0) {
    partes.push('  (nada todavía)')
  } else {
    for (const d of dentro) {
      partes.push(`  ${d.fichero}`)
      const pie = [d.req ? POR_ID[d.req]?.nombre : 'no cubre ningún requisito', d.detalle]
        .filter(Boolean)
        .join(' · ')
      if (pie) partes.push(`      ${pie}`)
    }
  }

  // Un requisito con papel dentro no puede aparecer también como que falta: el
  // que recibe la carpeta se fía de esta lista y no va a abrir los veinte
  // ficheros para desmentirla.
  const cubiertos = new Set(dentro.map((d) => d.req).filter(Boolean))
  const faltan = res.reqs.filter(
    (r) => (r.estado === 'pendiente' || r.estado === 'curso') && !cubiertos.has(r.id)
  )
  partes.push('', 'LO QUE FALTA', raya())
  if (faltan.length === 0) {
    partes.push('  Nada: el expediente está completo.')
  } else {
    for (const r of faltan) {
      const marcas = [
        r.estado === 'curso' ? 'pedido' : 'pendiente',
        r.def.critico ? 'BLOQUEA LA FIRMA' : '',
        `lo aporta: ${r.def.responsable}`,
      ].filter(Boolean)
      partes.push(`  ${r.id.padEnd(8)}${r.def.nombre}`)
      partes.push(`  ${' '.repeat(8)}${marcas.join(' · ')}`)
    }
  }

  const vigencia = res.reqs.filter((r) => r.estado === 'caducado' || r.estado === 'caduca')
  if (vigencia.length) {
    partes.push('', 'OJO CON LA VIGENCIA', raya())
    for (const r of vigencia) {
      const dias = r.dias ?? 0
      partes.push(
        `  ${r.id.padEnd(8)}${r.def.nombre}: ${
          dias < 0 ? `caducó hace ${Math.abs(dias)} días` : `caduca en ${dias} días`
        }${r.caduca ? ` (${fechaLarga(r.caduca)})` : ''}`
      )
    }
  }

  if (fallidos.length) {
    partes.push('', 'NO SE PUDIERON INCLUIR', raya())
    for (const f of fallidos) partes.push(`  ${f.nombre} — ${f.porque}`)
  }

  partes.push('', raya(), 'Generado con Timbre.')
  return partes.join('\n')
}

/** La extensión del fichero original, para no cambiársela al escaneo. */
function extensionDe(d: Documento): string {
  return d.nombreFichero?.match(/\.[^.]+$/)?.[0] ?? ''
}

export async function comoCarpeta({
  exp,
  res,
  plantillas,
  documentos,
  agente,
  urlDe,
  alAvanzar,
}: OpcionesCarpeta): Promise<Carpeta> {
  const recibidos = documentos.filter((d) => d.origen === 'recibido')
  const generados = documentos.filter((d) => d.origen === 'generado')

  // Los documentos generados viven hoy en dos sitios: como fila propia y, los
  // de siempre, colgados del requisito. Se recorren los dos sin duplicar.
  const conFilaPropia = new Set(generados.map((d) => d.reqId).filter(Boolean))
  const delRequisito = res.reqs.filter(
    (r) => r.plantillaId && !conFilaPropia.has(r.id) && plantillas.some((p) => p.id === r.plantillaId)
  )

  const total = recibidos.length + generados.length + delRequisito.length
  let hechos = 0
  const avanzar = () => alAvanzar?.(++hechos, total)

  const entradas: EntradaZip[] = []
  const dentro: Dentro[] = []
  const fallidos: { nombre: string; porque: string }[] = []
  // Dos papeles pueden llamarse igual; el ZIP no admite dos rutas iguales.
  const usados = new Set<string>()
  const unico = (nombre: string): string => {
    let n = nombre
    let i = 2
    while (usados.has(n.toLowerCase())) {
      n = nombre.replace(/(\.[^.]+)?$/, (ext) => ` (${i})${ext}`)
      i++
    }
    usados.add(n.toLowerCase())
    return n
  }

  for (const d of recibidos) {
    const carpeta = d.reqId ? '' : 'Sueltos/'
    const nombre = unico(
      carpeta + comoFichero(`${d.reqId ? `${d.reqId} ` : ''}${d.nombre}`, extensionDe(d))
    )
    try {
      const respuesta = await fetch(await urlDe(d.id))
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
      entradas.push({ nombre, datos: await respuesta.blob(), fecha: new Date(d.creado) })
      dentro.push({
        req: d.reqId,
        fichero: nombre,
        detalle: [
          d.emisor ? `de ${d.emisor}` : '',
          d.emitido ? `emitido ${fechaLarga(d.emitido)}` : '',
          d.caduca ? `caduca ${fechaLarga(d.caduca)}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      })
    } catch (e) {
      fallidos.push({ nombre: d.nombre, porque: e instanceof Error ? e.message : 'no se pudo descargar' })
    }
    avanzar()
  }

  const componer = async (plantilla: Plantilla, valores: Record<string, string>, reqId: string | null) => {
    const nombre = unico(comoFichero(`${reqId ? `${reqId} ` : ''}${plantilla.nombre}`, '.docx'))
    entradas.push({ nombre, datos: await comoDocx({ plantilla, valores, expedienteId: exp.id }) })
    dentro.push({ req: reqId, fichero: nombre, detalle: 'redactado con Timbre' })
    avanzar()
  }

  for (const d of generados) {
    const plantilla = plantillas.find((p) => p.id === d.plantillaId)
    if (!plantilla) {
      fallidos.push({ nombre: d.nombre, porque: 'su plantilla ya no existe' })
      avanzar()
      continue
    }
    await componer(plantilla, d.valores, d.reqId)
  }

  for (const r of delRequisito) {
    const plantilla = plantillas.find((p) => p.id === r.plantillaId)!
    await componer(plantilla, r.valores, r.id)
  }

  // El índice va delante para que sea lo primero que se ve al abrir el ZIP.
  entradas.unshift({
    nombre: '00 Índice.txt',
    datos: '﻿' + indice(exp, res, agente, dentro, fallidos),
  })

  return {
    blob: await zip(entradas),
    nombre: comoFichero(`Expediente ${exp.referencia}`, '.zip'),
    fallidos,
  }
}
