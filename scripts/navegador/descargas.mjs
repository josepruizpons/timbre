// Lo que las pruebas de Node no alcanzan: que los botones estén, que la hoja
// se imprima entera y no el trozo que se ve, y que el ZIP se arme en el
// navegador bajando los ficheros del bucket de verdad.
import { chromium } from 'playwright'
import { writeFileSync, readFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { execFileSync } from 'child_process'

const WEB = process.env.WEB
const EMAIL = process.env.HUMO_EMAIL
const PASSWORD = process.env.HUMO_PASSWORD

let ok = 0, ko = 0
const bien = (t, x = '') => { console.log(`  \x1b[32m✔\x1b[0m ${t}${x ? '  ' + x : ''}`); ok++ }
const mal = (t, e) => { console.log(`  \x1b[31m✘\x1b[0m ${t} — ${String(e).split('\n')[0].slice(0, 160)}`); ko++ }
const probar = async (t, fn) => { try { bien(t, (await fn()) || '') } catch (e) { mal(t, e) } }

const salida = mkdtempSync(join(tmpdir(), 'timbre-nav-'))

const navegador = await chromium.launch()
const ctx = await navegador.newContext({ acceptDownloads: true, locale: 'es-ES' })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('    \x1b[31m! error de página:\x1b[0m', e.message))

console.log(`Probando ${WEB}\n`)
await page.goto(WEB, { waitUntil: 'networkidle' })
await page.fill('input[type=email]', EMAIL)
await page.fill('input[type=password]', PASSWORD)
await page.click('button[type=submit]')
await page.waitForSelector('.lista, .cartera, .panel', { timeout: 30000 })
console.log('── Entrar y abrir un expediente ──')

await probar('entra y hay cartera', async () => {
  const filas = page.locator('button, a').filter({ hasText: /EXP-\d{4}-\d+/ })
  await filas.first().waitFor({ timeout: 20000 })
  return `${await filas.count()} expedientes`
})

// Abrir el primer expediente activo.
await page.locator('button, a').filter({ hasText: /EXP-\d{4}-\d+/ }).first().click()
await page.waitForSelector('.obra, .lista', { timeout: 20000 })

console.log('\n── Un papel de verdad en la carpeta ──')
// Un PDF mínimo pero válido, para que el tipo no sea mentira.
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\n' +
  'trailer<</Root 1 0 R>>\n%%EOF'
)

await probar('sube un PDF arrastrándolo a la carpeta del expediente', async () => {
  await page.locator('.carpeta input[type=file]').first()
    .setInputFiles({ name: 'escritura-de-prueba.pdf', mimeType: 'application/pdf', buffer: PDF })
  await page.locator('.documento__nombre', { hasText: 'escritura-de-prueba' }).first()
    .waitFor({ timeout: 60000 })
  return `${PDF.length} bytes al bucket`
})

console.log('\n── El ZIP del expediente ──')
let zipRuta = ''
await probar('el botón «Descargar todo» está en la carpeta', async () => {
  await page.locator('button', { hasText: 'Descargar todo' }).first().waitFor({ timeout: 10000 })
})

await probar('arma el ZIP en el navegador y lo descarga', async () => {
  const espera = page.waitForEvent('download', { timeout: 60000 })
  await page.locator('button', { hasText: 'Descargar todo' }).first().click()
  const descarga = await espera
  zipRuta = join(salida, descarga.suggestedFilename())
  await descarga.saveAs(zipRuta)
  return descarga.suggestedFilename()
})

await probar('el ZIP que llega al disco es válido', () => {
  const r = execFileSync('unzip', ['-t', zipRuta], { encoding: 'utf8' })
  if (!r.includes('No errors detected')) throw new Error(r)
  const l = execFileSync('unzip', ['-l', zipRuta], { encoding: 'utf8' })
  if (!l.includes('Índice.txt') && !l.includes('ndice.txt')) throw new Error(l)
  return l.trim().split('\n').slice(-1)[0].trim()
})

await probar('el papel que subimos ha bajado del bucket y va dentro, byte a byte', () => {
  execFileSync('unzip', ['-o', '-q', zipRuta, '-d', join(salida, 'abierto')])
  const dentro = execFileSync('find', [join(salida, 'abierto'), '-name', '*escritura-de-prueba*'], { encoding: 'utf8' }).trim()
  if (!dentro) throw new Error('el PDF no está en el ZIP')
  const bytes = readFileSync(dentro.split('\n')[0])
  if (!bytes.equals(PDF)) throw new Error(`bajaron ${bytes.length} bytes de ${PDF.length}`)
  return 'el navegador lo trajo de S3 sin que la API lo tocara'
})

console.log('\n── Un requisito con plantilla ──')
// Buscar un requisito que tenga plantilla puesta: se reconoce porque aparece
// la sección «Vista previa y campos».
let conHoja = false
const reqs = page.locator('.req')
const total = await reqs.count()
for (let i = 0; i < Math.min(total, 31); i++) {
  await reqs.nth(i).click()
  await page.waitForTimeout(350)
  if (await page.locator('.hoja').count()) { conHoja = true; break }
}

await probar('hay un requisito con su hoja delante', () => {
  if (!conHoja) throw new Error('ninguno de los requisitos tenía plantilla puesta')
})

if (conHoja) {
  await probar('descarga el documento en Word', async () => {
    const espera = page.waitForEvent('download', { timeout: 30000 })
    await page.locator('button', { hasText: /^Word$/ }).first().click()
    const d = await espera
    const ruta = join(salida, d.suggestedFilename())
    await d.saveAs(ruta)
    const r = execFileSync('unzip', ['-l', ruta], { encoding: 'utf8' })
    if (!r.includes('word/document.xml')) throw new Error(r)
    return d.suggestedFilename()
  })

  await probar('en papel sale la hoja entera, no el trozo que se ve', async () => {
    // Se reproduce lo que hace `imprimir()` sin abrir el diálogo del sistema.
    // El medio se cambia ANTES de medir: en pantalla la hoja sigue recortada a
    // propósito, y leer ahí el estilo no dice nada de lo que sale en papel.
    await page.emulateMedia({ media: 'print' })
    const medidas = await page.evaluate(() => {
      const hoja = document.querySelector('.hoja')
      const cont = document.createElement('div')
      cont.className = 'impresion'
      cont.appendChild(hoja.cloneNode(true))
      document.body.appendChild(cont)
      document.body.classList.add('es-imprimiendo')
      const clon = cont.querySelector('.hoja')
      const cuerpo = clon.querySelector('.hoja__cuerpo')
      return {
        altoPantalla: Math.round(hoja.getBoundingClientRect().height),
        altoPapel: Math.round(clon.scrollHeight),
        cortado: getComputedStyle(clon).overflow,
        scrollCuerpo: getComputedStyle(cuerpo).overflowY,
        parrafos: clon.querySelectorAll('.doc__parrafo, .doc__clausula, .doc__titulo').length,
      }
    })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    writeFileSync(join(salida, 'hoja.pdf'), pdf)
    const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length
    await page.emulateMedia({ media: 'screen' })
    await page.evaluate(() => {
      document.querySelector('.impresion')?.remove()
      document.body.classList.remove('es-imprimiendo')
    })
    if (medidas.cortado !== 'visible') throw new Error(`la hoja sigue recortada: ${medidas.cortado}`)
    if (medidas.scrollCuerpo !== 'visible') throw new Error(`el cuerpo sigue con scroll: ${medidas.scrollCuerpo}`)
    if (!medidas.parrafos) throw new Error('la hoja clonada salió vacía')
    if (!paginas) throw new Error('el PDF no tiene páginas')
    return `${medidas.parrafos} bloques · ${paginas} pág. · ${(pdf.length / 1024).toFixed(0)} kB`
  })

  await probar('lo que se imprime es solo la hoja', async () => {
    await page.emulateMedia({ media: 'print' })
    const fuera = await page.evaluate(() => {
      const cont = document.createElement('div')
      cont.className = 'impresion'
      cont.appendChild(document.querySelector('.hoja').cloneNode(true))
      document.body.appendChild(cont)
      document.body.classList.add('es-imprimiendo')
      const raiz = document.getElementById('root')
      const visible = getComputedStyle(raiz).display
      cont.remove()
      document.body.classList.remove('es-imprimiendo')
      return visible
    })
    await page.emulateMedia({ media: 'screen' })
    // Se lee con el medio de impresión activo para que valga la regla @media.
    if (fuera !== 'none') throw new Error(`el resto de la aplicación sigue visible (${fuera})`)
  })
}

console.log('\n── Limpieza ──')
await probar('quita el papel de prueba y el expediente queda como estaba', async () => {
  // El papel se subió a la carpeta del expediente, no a la de un requisito, y
  // ahora mismo hay un requisito abierto que solo enseña la suya. Se vuelve a
  // entrar desde la cartera: la aplicación no lleva la ruta en la URL, así que
  // recargar no devuelve al expediente sino a la lista.
  await page.goto(WEB, { waitUntil: 'networkidle' })
  await page.locator('button, a').filter({ hasText: /EXP-\d{4}-\d+/ }).first().click()

  // Se quitan todos, no solo el de esta vuelta: si un recorrido anterior se
  // cortó a medias, su papel sigue ahí y hay que llevárselo también.
  const restos = () => page.locator('.documento').filter({ hasText: 'escritura-de-prueba' })
  await restos().first().waitFor({ timeout: 20000 })
  let quitados = 0
  while (await restos().count()) {
    await restos().first().locator('button', { hasText: 'Quitar' }).click()
    await page.locator('dialog[open] button', { hasText: 'Quitar del expediente' }).click()
    await page.waitForTimeout(1200)
    quitados++
    if (quitados > 10) throw new Error('no se acaban de quitar')
  }
  return `${quitados} quitados`
})

console.log(`\n${ok} correctas, ${ko} fallidas`)
console.log(`Ficheros en ${salida}`)
await navegador.close()
process.exit(ko === 0 ? 0 : 1)
