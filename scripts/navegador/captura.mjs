// Que el papel se pueda leer hacia el expediente sin perder nada por el camino.
//
// Corre sobre el expediente de demostración (`npm run demo` en timbre-api) y lo
// deja como estaba.
import { chromium } from 'playwright'

const WEB = process.env.WEB
let ok = 0, ko = 0
const bien = (t, x = '') => { console.log(`  \x1b[32m✔\x1b[0m ${t}${x ? '  ' + x : ''}`); ok++ }
const mal = (t, e) => { console.log(`  \x1b[31m✘\x1b[0m ${t} — ${String(e).split('\n')[0].slice(0, 170)}`); ko++ }
const probar = async (t, fn) => { try { bien(t, (await fn()) || '') } catch (e) { mal(t, e) } }

/** Lo que el expediente de demostración deja escrito en ese campo. */
const ORIGINAL = '89,15'

const navegador = await chromium.launch()
const page = await (await navegador.newContext({ locale: 'es-ES', viewport: { width: 1500, height: 1000 } })).newPage()
page.on('pageerror', (e) => console.log('    \x1b[31m! error de página:\x1b[0m', e.message))

console.log(`Probando ${WEB}\n`)
await page.goto(WEB, { waitUntil: 'networkidle' })
await page.fill('input[type=email]', process.env.HUMO_EMAIL)
await page.fill('input[type=password]', process.env.HUMO_PASSWORD)
await page.click('button[type=submit]')
await page.locator('button, a').filter({ hasText: /EXP-\d{4}-\d+/ }).first().waitFor({ timeout: 30000 })

console.log('── El expediente de demostración ──')
await probar('está montado y se abre', async () => {
  const fila = page.locator('button, a').filter({ hasText: 'Rosselló' }).first()
  await fila.waitFor({ timeout: 10000 })
  await fila.click()
  await page.locator('.deuda').first().waitFor({ timeout: 20000 })
  return `${await page.locator('.deuda').count()} personas deben algo`
})

await probar('la ficha señala la superficie que no cuadra', async () => {
  const discrepa = page.locator('.hecho.es-discrepa')
  await discrepa.first().waitFor({ timeout: 15000 })
  const texto = await discrepa.first().innerText()
  if (!/Superficie/i.test(texto)) throw new Error(texto.replace(/\n/g, ' '))
  return texto.split('\n').slice(0, 2).join(' = ')
})

console.log('\n── Leer el papel hacia el expediente ──')
await probar('el botón «Leer» sale en la nota simple', async () => {
  const leer = page.locator('.documento').filter({ hasText: 'Nota simple' }).first()
    .locator('button', { hasText: 'Leer' })
  await leer.waitFor({ timeout: 10000 })
  await leer.click()
  await page.locator('dialog[open] .captura').waitFor({ timeout: 20000 })
})

await probar('el papel se enseña al lado, no se descarga', async () => {
  const visor = page.locator('dialog[open] .captura__visor')
  await visor.waitFor({ timeout: 20000 })
  const url = await visor.getAttribute('data')
  if (!url) throw new Error('el visor no tiene documento')
  // La URL firmada tiene que venir marcada como «enseñar», no «guardar».
  const r = await page.request.get(url)
  const disposicion = r.headers()['content-disposition'] ?? ''
  if (!disposicion.startsWith('inline')) throw new Error('content-disposition: ' + disposicion)
  return disposicion.slice(0, 44)
})

await probar('trae ya lo que se leyó la vez anterior', async () => {
  const valor = await page.locator('#cap-superficieRegistral').inputValue()
  if (valor !== ORIGINAL) throw new Error(`vale «${valor}», esperaba «${ORIGINAL}»`)
  return valor + ' m²'
})

await probar('avisa de que no cuadra con lo que ya tenía el expediente', async () => {
  const contraste = page.locator('dialog[open] .contraste.es-discrepa').first()
  if (!(await contraste.count())) throw new Error('no dice nada de la diferencia')
  return (await contraste.innerText()).replace(/\s+/g, ' ').slice(0, 70)
})

// El fallo que motivó esta prueba: un campo numérico se come la coma decimal y
// el dato se pierde sin decir nada. En España la superficie lleva coma.
await probar('una cifra con coma decimal se guarda entera', async () => {
  await page.fill('#cap-superficieRegistral', '89,99')
  if ((await page.locator('#cap-superficieRegistral').inputValue()) !== '89,99') {
    throw new Error('el propio campo se ha comido la coma')
  }
  await page.locator('dialog[open] button', { hasText: 'Guardar lo leído' }).click()
  await page.locator('dialog[open]').waitFor({ state: 'detached', timeout: 20000 })

  await page.locator('.documento').filter({ hasText: 'Nota simple' }).first()
    .locator('button', { hasText: 'Leer' }).click()
  await page.locator('#cap-superficieRegistral').waitFor({ timeout: 20000 })
  const guardado = await page.locator('#cap-superficieRegistral').inputValue()
  if (guardado !== '89,99') throw new Error(`ha vuelto como «${guardado}»`)
  return '89,99 sigue siendo 89,99'
})

console.log('\n── Dejarlo como estaba ──')
await probar('se restaura el valor de la demostración', async () => {
  await page.fill('#cap-superficieRegistral', ORIGINAL)
  await page.locator('dialog[open] button', { hasText: 'Guardar lo leído' }).click()
  await page.locator('dialog[open]').waitFor({ state: 'detached', timeout: 20000 })
  const discrepa = page.locator('.hecho.es-discrepa').first()
  await discrepa.waitFor({ timeout: 15000 })
  if (!/89,15/.test(await discrepa.innerText())) throw new Error('no ha vuelto a su sitio')
})

console.log(`\n${ok} correctas, ${ko} fallidas`)
await navegador.close()
process.exit(ko === 0 ? 0 : 1)
