import { useMemo, type RefObject } from 'react'

import { waveBand, serial } from '../lib/guilloche'
import { leer, type Trozo } from '../lib/documento'
import { FIRMAS } from '../data/firmas'
import type { Plantilla } from '../types'

function Onda({ invertida = false }: { invertida?: boolean }) {
  const trazos = useMemo(
    () =>
      [0, 1, 2].map((i) => ({
        d: waveBand({ width: 600, height: 13, cycles: 26 + i * 5, phase: i * 1.1 }),
        o: 0.5 - i * 0.13
      })),
    []
  )
  return (
    <svg
      className="hoja__onda"
      viewBox="0 0 600 13"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={invertida ? { transform: 'scaleY(-1)' } : undefined}
    >
      {trazos.map((t, i) => (
        <path
          key={i}
          d={t.d}
          fill="none"
          stroke="var(--acento)"
          strokeWidth="0.5"
          opacity={t.o}
        />
      ))}
    </svg>
  )
}

/** Un trozo de línea: texto tal cual, o el hueco de un campo. */
function Pieza({ trozo, mirado }: { trozo: Trozo; mirado: string | null }) {
  if (trozo.tipo === 'texto') return <span>{trozo.texto}</span>
  return (
    <span
      data-token={trozo.clave}
      className={`ranura ${trozo.valor ? 'es-lleno' : 'es-vacia'}${
        mirado === trozo.clave ? ' es-mirada' : ''
      }`}
    >
      {trozo.valor || trozo.etiqueta.toLowerCase()}
    </span>
  )
}

/**
 * Vista previa del documento sobre papel timbrado. Los campos sin rellenar
 * quedan como ranuras punteadas: el agente ve exactamente qué falta y dónde.
 */
interface HojaProps {
  plantilla: Plantilla | null
  valores: Record<string, string> | undefined
  expedienteId?: string
  campoMirado?: string | null
  /** Referencia al papel, para poder mandarlo a la impresora. */
  refHoja?: RefObject<HTMLElement | null>
}

export default function Hoja({
  plantilla,
  valores,
  expedienteId = '',
  campoMirado = null,
  refHoja,
}: HojaProps) {
  const numero = useMemo(
    () => serial(plantilla?.id || 'plt', expedienteId),
    [plantilla?.id, expedienteId]
  )
  const lineas = useMemo(
    () => (plantilla ? leer(plantilla.cuerpo, valores, plantilla.campos) : []),
    [plantilla, valores]
  )

  if (!plantilla) return null

  const firmas = plantilla.requisito ? FIRMAS[plantilla.requisito] : undefined

  return (
    <article className="hoja" ref={refHoja}>
      <div className="hoja__timbre">
        <span className="hoja__leyenda">Timbre del Estado</span>
        <span className="hoja__serie">{numero}</span>
      </div>
      <Onda />

      <div className="hoja__cuerpo">
        {lineas.map((linea, i) => {
          if (linea.tipo === 'regla') return <div key={i} className="doc__regla" />
          const piezas = linea.trozos.map((t, j) => <Pieza key={j} trozo={t} mirado={campoMirado} />)
          if (linea.tipo === 'titulo') return <h3 key={i} className="doc__titulo">{piezas}</h3>
          if (linea.tipo === 'clausula') return <h4 key={i} className="doc__clausula">{piezas}</h4>
          if (linea.tipo === 'nota') return <p key={i} className="doc__nota">{piezas}</p>
          return <p key={i} className="doc__parrafo">{piezas}</p>
        })}

        {firmas && (
          <div className="doc__firmas">
            {firmas.map(
              (f, i) =>
                f && (
                  <div key={i} className="doc__firma">
                    {f}
                  </div>
                )
            )}
          </div>
        )}
      </div>

      <Onda invertida />
    </article>
  )
}
