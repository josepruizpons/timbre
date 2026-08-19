// Parametric security-print line work.
// Spanish official paper (papel timbrado, notas simples, sellos registrales) is
// underprinted with guilloche rosettes: closed curves traced by a point on a
// circle rolling inside another. We generate the real curves rather than
// faking them, so ring density and lobe counts stay mathematically coherent.

/**
 * Rosette traced by an epitrochoid-family curve.
 *   x = A·cos t + B·cos(n t)
 *   y = A·sin t − B·sin(n t)
 * Produces n+1 lobes of amplitude B around a circle of radius A.
 */
export function rosette({ radius, amplitude, lobes, samples = 360, cx = 0, cy = 0, phase = 0 }) {
  const pts = []
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * Math.PI * 2 + phase
    const x = cx + radius * Math.cos(t) + amplitude * Math.cos(lobes * t)
    const y = cy + radius * Math.sin(t) - amplitude * Math.sin(lobes * t)
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return 'M' + pts.join('L') + 'Z'
}

// Ring stack for the expediente seal, outermost first. Lobe counts are coprime
// with each other so the rings never phase-lock into a moiré. The outer radius
// stops at 39 to leave a clean annulus for the perimeter lettering.
const RING_SPEC = [
  { radius: 38.4, amplitude: 2.4, lobes: 47 },
  { radius: 34, amplitude: 2.9, lobes: 31 },
  { radius: 29.6, amplitude: 2.8, lobes: 23 },
  { radius: 25.2, amplitude: 2.6, lobes: 17 },
  { radius: 20.8, amplitude: 2.4, lobes: 13 },
  { radius: 16.6, amplitude: 2.0, lobes: 7 }
]

export const RING_COUNT = RING_SPEC.length

export function sealRings(detail = 'full') {
  const samples = detail === 'compact' ? 120 : 480
  const spec = detail === 'compact' ? RING_SPEC.filter((_, i) => i % 2 === 0 || i === 1) : RING_SPEC
  return spec.map((r, i) => ({
    d: rosette({ ...r, samples, phase: i * 0.19 }),
    key: `${r.lobes}`
  }))
}

/**
 * Wave band used along the head and foot of a document sheet — the same
 * device that runs across the top of stamped paper.
 */
export function waveBand({ width, height, cycles, phase = 0, samples = 240 }) {
  const pts = []
  const mid = height / 2
  const amp = height / 2 - 0.5
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * width
    const t = (i / samples) * Math.PI * 2 * cycles + phase
    const y = mid + amp * Math.sin(t) * (0.55 + 0.45 * Math.sin(t * 0.5 + phase))
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return 'M' + pts.join('L')
}

/** Deterministic stamped-paper serial, so a given sheet always reads the same. */
export function serial(...seed) {
  const s = seed.join('·')
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const n = Math.abs(h) % 100000000
  const letter = 'ABCDEFGHJKLMNPRSTUVW'[Math.abs(h >> 7) % 20]
  return `${letter}${String(n).padStart(8, '0')}`
}
