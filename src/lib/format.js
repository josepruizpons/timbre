// Spanish formatting helpers. Legal documents spell amounts out in words as
// well as figures, so `enLetras` is load-bearing, not ornamental.

const UNI = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'
]
const DEC = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CEN = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

const apocope = (s) => s.replace(/uno$/, 'ún')

function dosDigitos(n) {
  if (n < 30) return UNI[n]
  const d = Math.floor(n / 10)
  const u = n % 10
  return u ? `${DEC[d]} y ${UNI[u]}` : DEC[d]
}

function tresDigitos(n) {
  if (n === 100) return 'cien'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const cabeza = CEN[c]
  if (!resto) return cabeza
  return cabeza ? `${cabeza} ${dosDigitos(resto)}` : dosDigitos(resto)
}

function hastaMillon(n) {
  const m = Math.floor(n / 1000)
  const r = n % 1000
  let out = ''
  if (m === 1) out = 'mil'
  else if (m > 1) out = `${apocope(tresDigitos(m))} mil`
  if (r) out = out ? `${out} ${tresDigitos(r)}` : tresDigitos(r)
  return out
}

export function enLetras(valor) {
  const n = Math.floor(Math.abs(Number(valor) || 0))
  if (n === 0) return 'cero'
  const millones = Math.floor(n / 1e6)
  const resto = n % 1e6
  let out = ''
  if (millones === 1) out = 'un millón'
  else if (millones > 1) out = `${apocope(hastaMillon(millones))} millones`
  if (resto) out = out ? `${out} ${hastaMillon(resto)}` : hastaMillon(resto)
  return out
}

export function euros(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2
  }).format(n)
}

export function eurosEnLetras(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return ''
  const entero = Math.floor(n)
  const centimos = Math.round((n - entero) * 100)
  let out = `${enLetras(entero)} euros`
  if (centimos) out += ` con ${enLetras(centimos)} céntimos`
  return out.toUpperCase()
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function parseISO(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function fechaLarga(iso) {
  const dt = parseISO(iso)
  if (!dt) return ''
  return `${dt.getDate()} de ${MESES[dt.getMonth()]} de ${dt.getFullYear()}`
}

export function fechaCorta(iso) {
  const dt = parseISO(iso)
  if (!dt) return '—'
  return `${String(dt.getDate()).padStart(2, '0')} ${MESES[dt.getMonth()].slice(0, 3)} ${dt.getFullYear()}`
}

export const HOY = '2026-08-14'

export function diasHasta(iso, desde = HOY) {
  const a = parseISO(iso)
  const b = parseISO(desde)
  if (!a || !b) return null
  return Math.round((a - b) / 86400000)
}

export function addDays(iso, days) {
  const dt = parseISO(iso)
  if (!dt) return null
  dt.setDate(dt.getDate() + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** `{{clave|filtro}}` substitution used by document bodies. */
export function applyFilter(raw, filtro) {
  if (raw === undefined || raw === null || raw === '') return ''
  switch (filtro) {
    case 'eur': return euros(raw)
    case 'letra': return eurosEnLetras(raw)
    case 'fecha': return fechaLarga(raw)
    case 'may': return String(raw).toUpperCase()
    default: return String(raw)
  }
}
