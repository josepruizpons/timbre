// La lógica de dominio que no toca ni la red ni el navegador: la persecución,
// la ficha de datos y los esquemas por tipo de documento.
//
//   npm run dominio

import { CATALOGO, POR_ID } from '../src/data/catalog'
import { ESQUEMAS, esquemaDe, CAMPO_POR_CLAVE } from '../src/data/esquemas'
import { loQueEsperamos, pendientesDe, porPersona, personaDe } from '../src/lib/pendientes'
import { ficha, mismoValor, respaldo } from '../src/lib/datos'
import type { DatoExpediente, Expediente, RegistroRequisito } from '../src/types'

let ok = 0
let ko = 0
const bien = (t: string, x = '') => { console.log(`  \x1b[32m✔\x1b[0m ${t}${x ? '  ' + x : ''}`); ok++ }
const mal = (t: string, e: unknown) => { console.log(`  \x1b[31m✘\x1b[0m ${t} — ${String(e).split('\n')[0].slice(0, 150)}`); ko++ }
const probar = (t: string, fn: () => string | void) => {
  try { bien(t, fn() || '') } catch (e) { mal(t, e) }
}

const haceDias = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

const req = (p: Partial<RegistroRequisito>): RegistroRequisito => ({
  estado: 'pendiente', emitido: null, plantillaId: null, valores: {}, nota: '',
  pedido: null, recordado: null, ...p,
})

const EXP: Expediente = {
  id: 'exp_1', referencia: 'EXP-2026-004', estado: 'activo', fase: null,
  direccion: 'Carrer d’Aribau 132', municipio: 'Barcelona', provincia: 'Barcelona',
  ccaa: 'Cataluña', cp: '08036', refCatastral: '9872023VH5797S0001WX',
  fincaRegistral: '14.552', registro: 'Registro nº 7', superficie: 88, anioConstruccion: 1972,
  vendedor: 'Marta Puig Serra', vendedorNif: '46789012K', vendedorEstadoCivil: 'casada',
  comprador: 'Iván Delgado Ríos', compradorNif: '52341908B', compradorEstadoCivil: 'soltero',
  precio: 425000, arras: 25000, fechaFirma: '2026-09-14', notaria: 'Notaría de Ana Vidal',
  protocolo: null, abierto: '2026-06-02', cerrado: null,
  hipoteca: true, cargaHipotecaria: false, compradorExtranjero: false, vendedorNoResidente: false,
  obraNueva: false, herencia: false, representacion: false, unifamiliar: false,
  reqs: {
    'IN-01': req({ estado: 'curso', pedido: haceDias(12) }),
    'IN-05': req({ estado: 'curso', pedido: haceDias(2) }),
    'IN-03': req({ estado: 'curso', pedido: haceDias(30), recordado: haceDias(1) }),
  },
  traza: [],
}

const dato = (p: Partial<DatoExpediente> & { clave: string; valor: string }): DatoExpediente => ({
  id: Math.floor(Math.random() * 1e6), fuente: 'agente', documentoId: null,
  documentoNombre: null, reqId: null, confirmado: null, autor: 'Sergio',
  actualizado: '2026-08-01T10:00:00.000Z', ...p,
})

console.log('Comprobando la lógica del dominio\n')

console.log('── El catálogo y sus esquemas ──')
probar('cada requisito del catálogo sabe qué trae dentro su documento', () => {
  const sin = CATALOGO.filter((d) => esquemaDe(d.id).length === 0).map((d) => d.id)
  if (sin.length) throw new Error('sin esquema: ' + sin.join(', '))
  return `${CATALOGO.length} tipos, ${Object.values(ESQUEMAS).flat().length} campos`
})

probar('ningún esquema apunta a un requisito que no existe', () => {
  const fantasmas = Object.keys(ESQUEMAS).filter((id) => !POR_ID[id])
  if (fantasmas.length) throw new Error(fantasmas.join(', '))
})

probar('los campos que alimentan el expediente apuntan a campos suyos', () => {
  const propios = new Set(Object.keys(EXP))
  const malos = Object.values(ESQUEMAS).flat()
    .filter((c) => c.alExpediente && !propios.has(c.alExpediente))
    .map((c) => `${c.clave}→${c.alExpediente}`)
  if (malos.length) throw new Error(malos.join(', '))
  const cuantos = Object.values(ESQUEMAS).flat().filter((c) => c.alExpediente).length
  return `${cuantos} campos nutren el expediente`
})

probar('una clave repetida en dos documentos significa lo mismo', () => {
  // `refCatastral` sale del IBI y de la certificación catastral. Si dos
  // esquemas usan la misma clave con etiquetas distintas, la ficha mezclaría
  // cosas que no son la misma.
  const porClave = new Map<string, Set<string>>()
  for (const campo of Object.values(ESQUEMAS).flat()) {
    const etiquetas = porClave.get(campo.clave) ?? new Set()
    etiquetas.add(campo.etiqueta)
    porClave.set(campo.clave, etiquetas)
  }
  const discordes = [...porClave.entries()].filter(([, e]) => e.size > 1)
  if (discordes.length) {
    throw new Error(discordes.map(([c, e]) => `${c}: ${[...e].join(' / ')}`).join('; '))
  }
  return `${porClave.size} claves distintas`
})

console.log('\n── La persecución ──')
probar('solo entra en la espera lo que ya se ha pedido', () => {
  const esperando = loQueEsperamos([EXP])
  if (esperando.length !== 3) throw new Error(`${esperando.length} en espera`)
  if (esperando.some((p) => p.esperando === null)) throw new Error('hay algo sin pedir')
  // Y lo que falta sin pedir sí sale en la lista del caso.
  const delCaso = pendientesDe(EXP)
  if (delCaso.length <= 3) throw new Error('la lista del caso debería traer más')
})

probar('lo que lleva más tiempo pedido va primero', () => {
  const orden = loQueEsperamos([EXP]).map((p) => p.req.id)
  if (orden[0] !== 'IN-03') throw new Error(orden.join(' → '))
  return orden.join(' → ')
})

probar('a la semana sin respuesta toca insistir', () => {
  const esperando = loQueEsperamos([EXP])
  const doce = esperando.find((p) => p.req.id === 'IN-01')
  const dos = esperando.find((p) => p.req.id === 'IN-05')
  if (!doce?.tocaInsistir) throw new Error('12 días pedido y no avisa')
  if (dos?.tocaInsistir) throw new Error('2 días pedido y ya insiste')
})

probar('recordar hace ayer compra otra semana de tranquilidad', () => {
  // IN-03 lleva 30 días pedido pero se recordó ayer: no toca volver a insistir.
  const treinta = loQueEsperamos([EXP]).find((p) => p.req.id === 'IN-03')
  if (treinta?.tocaInsistir) throw new Error('insiste al día siguiente de haber insistido')
})

probar('cada cosa se le pide a una persona con nombre', () => {
  const grupos = porPersona(EXP)
  const vendedor = grupos.find((g) => g.responsable === 'Vendedor')
  if (vendedor?.persona !== 'Marta Puig Serra') throw new Error(vendedor?.persona)
  if (personaDe(EXP, 'Comprador') !== 'Iván Delgado Ríos') throw new Error('comprador')
  return grupos.map((g) => `${g.responsable}: ${g.items.length}`).join(' · ')
})

probar('un expediente cerrado no persigue a nadie', () => {
  const cerrado = { ...EXP, estado: 'firmado' as const }
  if (loQueEsperamos([cerrado]).length !== 0) throw new Error('sigue esperando')
})

console.log('\n── Los datos y sus fuentes ──')
probar('88, 88,00 y 88.00 m² son la misma superficie', () => {
  if (!mismoValor('88', '88,00')) throw new Error('88 vs 88,00')
  if (!mismoValor('88,00', '88.00 m²')) throw new Error('88,00 vs 88.00 m²')
  if (!mismoValor('425.000,00 €', '425000')) throw new Error('el precio con separador de miles')
  if (mismoValor('88', '86,40')) throw new Error('86,40 no es 88')
})

probar('la ficha junta el formulario con lo que dicen los papeles', () => {
  const hechos = ficha(EXP, [], null)
  const superficie = hechos.find((h) => h.clave === 'superficie')
  if (!superficie) throw new Error('no está la superficie')
  if (superficie.valor !== '88') throw new Error(superficie.valor)
  if (superficie.discrepa) throw new Error('discrepa consigo misma')
  return `${hechos.length} hechos solo del formulario`
})

probar('dos papeles que dicen distinto de lo mismo salen como discrepancia', () => {
  const hechos = ficha(EXP, [
    dato({ clave: 'superficieRegistral', valor: '86,40', fuente: 'documento', documentoId: 'd1', documentoNombre: 'Nota simple', reqId: 'IN-01' }),
    dato({ clave: 'superficieCatastral', valor: '88,00', fuente: 'documento', documentoId: 'd2', documentoNombre: 'Certificación catastral', reqId: 'IN-08' }),
  ], null)
  const superficie = hechos.find((h) => h.clave === 'superficie')
  if (!superficie) throw new Error('no se han juntado bajo el mismo hecho')
  if (!superficie.discrepa) throw new Error('no avisa de la discrepancia')
  if (superficie.observaciones.length !== 2) throw new Error(`${superficie.observaciones.length} fuentes`)
  return `${superficie.observaciones.map((o) => `${o.dato.valor} (${o.segun})`).join(' vs ')}`
})

probar('lo que discrepa se enseña antes que lo demás', () => {
  const hechos = ficha(EXP, [
    dato({ clave: 'superficieRegistral', valor: '86,40', fuente: 'documento', documentoId: 'd1', documentoNombre: 'Nota simple', reqId: 'IN-01' }),
  ], null)
  if (!hechos[0].discrepa) throw new Error('la discrepancia no va primera: ' + hechos[0].clave)
})

probar('un dato que no es campo del expediente también cuenta', () => {
  const hechos = ficha(EXP, [
    dato({ clave: 'capitalHipoteca', valor: '210000', fuente: 'documento', documentoId: 'd3', documentoNombre: 'FEIN', reqId: 'FN-01' }),
  ], null)
  const capital = hechos.find((h) => h.clave === 'capitalHipoteca')
  if (!capital) throw new Error('se ha perdido')
  if (capital.etiqueta !== CAMPO_POR_CLAVE.capitalHipoteca.etiqueta) throw new Error(capital.etiqueta)
  if (capital.grupo !== 'Financiación') throw new Error(capital.grupo)
  return `${capital.etiqueta}: ${capital.valor} según ${capital.observaciones[0].segun}`
})

probar('el papel manda sobre lo que tecleó alguien', () => {
  const hechos = ficha(EXP, [
    dato({ clave: 'fincaRegistral', valor: 'a ojo', fuente: 'agente' }),
    dato({ clave: 'fincaRegistral', valor: '14.552', fuente: 'documento', documentoId: 'd1', documentoNombre: 'Nota simple', reqId: 'IN-01' }),
  ], null)
  const finca = hechos.find((h) => h.clave === 'fincaRegistral')
  if (finca?.valor !== '14.552') throw new Error(`vale ${finca?.valor}`)
})

probar('se puede medir cuánto del expediente tiene papel detrás', () => {
  const sinNada = respaldo(ficha(EXP, [], null))
  const conUno = respaldo(ficha(EXP, [
    dato({ clave: 'superficieRegistral', valor: '88', fuente: 'documento', documentoId: 'd1', documentoNombre: 'Nota simple', reqId: 'IN-01' }),
  ], null))
  if (sinNada.conPapel !== 0) throw new Error('empieza con papeles')
  if (conUno.conPapel !== 1) throw new Error(`${conUno.conPapel} con papel`)
  return `de ${conUno.total} hechos, 1 con papel`
})

console.log(`\n${ok} correctas, ${ko} fallidas`)
process.exit(ko === 0 ? 0 : 1)
