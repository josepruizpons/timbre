import { useMemo } from 'react'
import { waveBand, serial } from '../lib/guilloche.js'
import { applyFilter } from '../lib/format.js'

const TOKEN = /\{\{([a-zA-Z0-9_]+)(?:\|([a-z]+))?\}\}/g

// Pie de firmas propio de cada tipo de documento. Los que no aparecen aquí no
// se firman: son solicitudes o comunicaciones.
const FIRMAS = {
  'PT-05': ['La parte vendedora', 'La parte compradora'],
  'PT-06': ['El cliente', 'Por la agencia'],
  'IN-05': ['El administrador de fincas', 'Sello de la comunidad'],
  'FS-01': ['El comprador declarante', ''],
  'PT-03': ['El poderdante', '']
}

function Onda({ invertida = false }) {
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
          stroke="var(--registro)"
          strokeWidth="0.5"
          opacity={t.o}
        />
      ))}
    </svg>
  )
}

/** Sustituye los tokens de una línea por sus valores, o por una ranura vacía. */
function segmentar(linea, valores, campos, mirado) {
  const salida = []
  let ultimo = 0
  let m
  TOKEN.lastIndex = 0
  while ((m = TOKEN.exec(linea)) !== null) {
    if (m.index > ultimo) salida.push({ tipo: 'texto', texto: linea.slice(ultimo, m.index) })
    const clave = m[1]
    const filtro = m[2]
    const bruto = valores?.[clave]
    const def = campos?.find((c) => c.clave === clave)
    salida.push({
      tipo: 'token',
      clave,
      valor: bruto !== undefined && bruto !== null && String(bruto).trim() !== ''
        ? applyFilter(bruto, filtro)
        : '',
      etiqueta: def?.etiqueta || clave,
      mirado: mirado === clave
    })
    ultimo = m.index + m[0].length
  }
  if (ultimo < linea.length) salida.push({ tipo: 'texto', texto: linea.slice(ultimo) })
  return salida
}

function Linea({ texto, valores, campos, mirado }) {
  const partes = segmentar(texto, valores, campos, mirado)
  return partes.map((p, i) =>
    p.tipo === 'texto' ? (
      <span key={i}>{p.texto}</span>
    ) : (
      <span
        key={i}
        data-token={p.clave}
        className={`ranura ${p.valor ? 'es-lleno' : 'es-vacia'}${p.mirado ? ' es-mirada' : ''}`}
      >
        {p.valor || p.etiqueta.toLowerCase()}
      </span>
    )
  )
}

/**
 * Vista previa del documento sobre papel timbrado. Los campos sin rellenar
 * quedan como ranuras punteadas: el agente ve exactamente qué falta y dónde.
 */
export default function Hoja({ plantilla, valores, expedienteId = '', campoMirado = null }) {
  const numero = useMemo(
    () => serial(plantilla?.id || 'plt', expedienteId),
    [plantilla?.id, expedienteId]
  )

  if (!plantilla) return null

  const lineas = plantilla.cuerpo.split('\n')
  const firmas = FIRMAS[plantilla.requisito]

  return (
    <article className="hoja">
      <div className="hoja__timbre">
        <span className="hoja__leyenda">Timbre del Estado</span>
        <span className="hoja__serie">{numero}</span>
      </div>
      <Onda />

      <div className="hoja__cuerpo">
        {lineas.map((cruda, i) => {
          const linea = cruda.trimEnd()
          if (linea === '') return null
          if (linea.startsWith('# ')) {
            return (
              <h3 key={i} className="doc__titulo">
                {linea.slice(2)}
              </h3>
            )
          }
          if (linea.startsWith('§ ')) {
            return (
              <h4 key={i} className="doc__clausula">
                {linea.slice(2)}
              </h4>
            )
          }
          if (linea === '-') return <div key={i} className="doc__regla" />
          if (linea.startsWith('> ')) {
            return (
              <p key={i} className="doc__nota">
                <Linea texto={linea.slice(2)} valores={valores} campos={plantilla.campos} mirado={campoMirado} />
              </p>
            )
          }
          return (
            <p key={i} className="doc__parrafo">
              <Linea texto={linea} valores={valores} campos={plantilla.campos} mirado={campoMirado} />
            </p>
          )
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
