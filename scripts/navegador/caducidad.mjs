// Que la caducidad salga sola del papel, y que corregir la fecha la mueva.
import { chromium } from 'playwright'

const WEB = process.env.WEB
let ok = 0, ko = 0
const bien = (t, x = '') => { console.log(`  \x1b[32m✔\x1b[0m ${t}${x ? '  ' + x : ''}`); ok++ }
const mal = (t, e) => { console.log(`  \x1b[31m✘\x1b[0m ${t} — ${String(e).split('\n')[0].slice(0, 170)}`); ko++ }
const probar = async (t, fn) => { try { bien(t, (await fn()) || '') } catch (e) { mal(t, e) } }

const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
)
const haceDias = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

const navegador = await chromium.launch()
const page = await (await navegador.newContext({ locale: 'es-ES' })).newPage()
page.on('pageerror', (e) => console.log('    \x1b[31m! error de página:\x1b[0m', e.message))

console.log(`Probando ${WEB}\n`)
await page.goto(WEB, { waitUntil: 'networkidle' })
await page.fill('input[type=email]', process.env.HUMO_EMAIL)
await page.fill('input[type=password]', process.env.HUMO_PASSWORD)
await page.click('button[type=submit]')
// El expediente de demostración no vale: ya tiene una nota simple vigente en
// IN-01, y una nota nueva manda sobre una vieja — que es lo correcto, pero
// tapa lo que aquí se quiere comprobar.
const casos = () => page.locator('button, a').filter({ hasText: /EXP-\d{4}-\d+/ })
await casos().first().waitFor({ timeout: 30000 })
const cuantos = await casos().count()
let entrado = false
for (let i = 0; i < cuantos && !entrado; i++) {
  // Se vuelve por la URL y no con «atrás»: ahora que la ruta está en el
  // historial, atrás lleva al expediente, no a la cartera.
  await page.goto(WEB, { waitUntil: 'networkidle' })
  const fila = casos().nth(i)
  await fila.waitFor({ timeout: 20000 })
  if (/Rosselló/.test(await fila.innerText())) continue
  await fila.click()
  await page.locator('.req').first().waitFor({ timeout: 20000 })
  await page.locator('.req').filter({ hasText: 'Nota simple registral' }).first().click()
  await page.waitForTimeout(800)
  entrado = (await page.locator('.carpeta.es-compacta .documento').count()) === 0
}

console.log('── Subir la nota simple en su requisito ──')
await probar('hay un expediente con IN-01 vacío donde probar', () => {
  if (!entrado) throw new Error('todos los expedientes tienen ya nota simple')
  return 'IN-01 sin papel dentro'
})

await probar('sube el PDF dentro del requisito', async () => {
  await page.locator('.carpeta.es-compacta input[type=file]').first()
    .setInputFiles({ name: 'nota-simple-de-prueba.pdf', mimeType: 'application/pdf', buffer: PDF })
  await page.locator('.carpeta.es-compacta .documento__nombre', { hasText: 'nota-simple-de-prueba' })
    .waitFor({ timeout: 60000 })
})

await probar('el requisito se pone conforme solo, sin tocar ningún botón', async () => {
  const casilla = page.locator('.req.es-abierto')
  await casilla.filter({ has: page.locator('.casilla.es-conforme, .es-conforme') }).first()
    .waitFor({ timeout: 15000 })
    .catch(async () => {
      const t = await casilla.first().innerText()
      throw new Error('el requisito no se marcó: ' + t.replace(/\n/g, ' '))
    })
})

await probar('un papel de hoy vale hasta dentro de 90 días', async () => {
  const marca = await page.locator('.carpeta.es-compacta .documento').first().innerText()
  if (!/vale hasta/.test(marca)) throw new Error('sin vigencia en la carpeta: ' + marca.replace(/\n/g, ' '))
  return marca.split('\n').find((l) => /vale hasta/.test(l))
})

console.log('\n── Corregir la fecha del papel ──')
await probar('el formulario dice qué pasa al cambiar la fecha', async () => {
  await page.locator('.carpeta.es-compacta .documento').first()
    .locator('button', { hasText: 'Datos' }).click()
  await page.locator('#doc-emitido').waitFor({ timeout: 10000 })
  await page.fill('#doc-emitido', haceDias(100))
  await page.waitForTimeout(200)
  const consecuencia = await page.locator('.consecuencia').first().innerText()
  if (!/caduc/.test(consecuencia)) throw new Error(consecuencia)
  return consecuencia.replace(/\s+/g, ' ').slice(0, 90)
})

await probar('al guardar, el papel pasa a caducado', async () => {
  await page.locator('.modal button', { hasText: 'Guardar' }).click()
  await page.locator('.carpeta.es-compacta .documento .marca.es-sello', { hasText: /caducado hace/ })
    .waitFor({ timeout: 20000 })
  return await page.locator('.carpeta.es-compacta .documento .marca.es-sello').first().innerText()
})

await probar('y el requisito deja de estar conforme', async () => {
  await page.waitForTimeout(1500)
  const t = await page.locator('.req.es-abierto').first().innerText()
  if (!/caducado/.test(t)) throw new Error('el requisito sigue como estaba: ' + t.replace(/\n/g, ' '))
  return t.split('\n').filter((l) => /caducado/.test(l)).join(' ')
})

console.log('\n── Limpieza ──')
await probar('quitar el papel deja el requisito como estaba', async () => {
  await page.locator('.carpeta.es-compacta .documento').first()
    .locator('button', { hasText: 'Quitar' }).click()
  await page.locator('dialog[open] button', { hasText: 'Quitar del expediente' }).click()
  await page.locator('.carpeta.es-compacta .documento').filter({ hasText: 'nota-simple-de-prueba' })
    .waitFor({ state: 'detached', timeout: 20000 })
  await page.waitForTimeout(1200)
  const t = await page.locator('.req.es-abierto').first().innerText()
  if (/caducado|caduca en/.test(t)) throw new Error('quedó rastro: ' + t.replace(/\n/g, ' '))
})

console.log(`\n${ok} correctas, ${ko} fallidas`)
await navegador.close()
process.exit(ko === 0 ? 0 : 1)
