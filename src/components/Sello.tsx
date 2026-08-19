import { useMemo } from 'react'
import { sealRings } from '../lib/guilloche'

interface SelloProps {
  progreso?: number
  tamano?: number
  referencia?: string
  lugar?: string
  estado?: string
  estampando?: boolean
}

/**
 * El sello del expediente. Cada anillo de guilloche es una porción del avance:
 * los requisitos conformes entintan los anillos de fuera hacia dentro, y al
 * llegar al pleno el sello se estampa en carmín como el de una notaría.
 */
export default function Sello({
  progreso = 0,
  tamano = 96,
  referencia = '',
  lugar = '',
  estado = 'activo',
  estampando = false
}: SelloProps) {
  const detalle = tamano >= 90 ? 'full' : 'compact'
  const anillos = useMemo(() => sealRings(detalle), [detalle])
  const entintados = Math.round(Math.min(1, Math.max(0, progreso)) * anillos.length)
  const pct = Math.round(progreso * 100)

  const firmado = estado === 'firmado'
  const archivado = estado === 'archivado'
  const grande = tamano >= 110
  const idOrla = `orla-${referencia || 'sello'}`

  const clases = ['sello']
  if (firmado) clases.push('es-firmado')
  if (archivado) clases.push('es-archivado')
  if (estampando) clases.push('es-estampando')

  return (
    <svg
      className={clases.join(' ')}
      width={tamano}
      height={tamano}
      viewBox="-50 -50 100 100"
      role="img"
      aria-label={
        firmado
          ? `Expediente ${referencia} firmado`
          : `Avance del expediente: ${pct} por ciento de requisitos conformes`
      }
      style={archivado ? { opacity: 0.45, filter: 'grayscale(1)' } : undefined}
    >
      <defs>
        {/* Línea base de la orla: los glifos crecen hacia fuera, así que el
            radio se elige para que las mayúsculas queden dentro del filete. */}
        <path id={idOrla} d="M0,-43.3 A43.3,43.3 0 1,1 -0.01,-43.3" fill="none" />
      </defs>

      {/* Doble filete exterior y filete interior: el marco del sello */}
      <circle className="sello__borde" cx="0" cy="0" r="48.6" />
      <circle className="sello__borde" cx="0" cy="0" r="47.1" strokeWidth="0.45" />
      <circle className="sello__borde" cx="0" cy="0" r="42.4" strokeWidth="0.45" />

      {grande && referencia && (
        <text className="sello__orla">
          <textPath href={`#${idOrla}`} startOffset="2%">
            {`${referencia} · ${lugar} ·`.toUpperCase()}
          </textPath>
        </text>
      )}

      {anillos.map((a, i) => (
        <path key={a.key} className={`sello__aro${i < entintados ? '' : ' es-hueco'}`} d={a.d} />
      ))}

      <circle className="sello__disco" cx="0" cy="0" r="12.6" />
      <circle className="sello__borde" cx="0" cy="0" r="12.6" strokeWidth="0.55" />

      {firmado ? (
        <path
          d="M-6 0.4 L-1.8 4.8 L6.2 -4.4"
          fill="none"
          stroke="var(--sello)"
          strokeWidth="2.6"
          strokeLinecap="square"
        />
      ) : (
        <text className="sello__cifra" x="0" y="4.9" fontSize="14">
          {pct}
        </text>
      )}
    </svg>
  )
}
