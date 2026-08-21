import { useEffect, useMemo, useRef } from 'react'

import type { Hallazgo, Rango } from '../lib/importar/deteccion'
import type { Campo } from '../types'

/** Se construye en cada uso: un regex global lleva `lastIndex` dentro, y
 *  compartirlo entre componentes es una fuente de fallos intermitentes. */
const tokenRe = () => /\{\{([a-zA-Z0-9_]+)(?:\|([a-z]+))?\}\}/g

type Trozo =
  | { tipo: 'texto'; desde: number; hasta: number }
  | { tipo: 'token'; desde: number; hasta: number; clave: string; filtro: string | null }
  | { tipo: 'hallazgo'; desde: number; hasta: number; hallazgo: Hallazgo }

interface Props {
  cuerpo: string
  hallazgos: Hallazgo[]
  /** Hallazgo resaltado desde la lista de la izquierda. */
  destacado: string | null
  onSeleccionar: (rango: Rango) => void
  onHallazgo: (hallazgo: Hallazgo) => void
  onQuitarToken: (clave: string) => void
  campos: Campo[]
}

/** Sube por el árbol hasta el nodo que sabe en qué punto del cuerpo empieza. */
function offsetDe(nodo: Node | null, dentro: number): number | null {
  let el: Element | null =
    nodo?.nodeType === Node.TEXT_NODE ? nodo.parentElement : (nodo as Element | null)
  while (el && !el.hasAttribute('data-off')) el = el.parentElement
  if (!el) return null
  return Number(el.getAttribute('data-off')) + dentro
}

/**
 * El documento tal como quedará, pero marcable: se selecciona un trozo de texto
 * y se convierte en variable. Los tokens ya puestos se ven como ranuras y los
 * hallazgos sin aceptar, subrayados.
 *
 * Marcar sobre la hoja definitiva —y no sobre un área de texto— es lo que hace
 * que se entienda: ves el documento montarse mientras lo marcas.
 */
export default function HojaMarcable({
  cuerpo,
  hallazgos,
  destacado,
  onSeleccionar,
  onHallazgo,
  onQuitarToken,
  campos,
}: Props) {
  const caja = useRef<HTMLDivElement>(null)

  const etiquetas = useMemo(
    () => new Map(campos.map((c) => [c.clave, c.etiqueta])),
    [campos]
  )

  // Cada línea con el punto exacto del cuerpo en el que empieza.
  const lineas = useMemo(() => {
    const salida: { texto: string; inicio: number }[] = []
    let off = 0
    for (const texto of cuerpo.split('\n')) {
      salida.push({ texto, inicio: off })
      off += texto.length + 1
    }
    return salida
  }, [cuerpo])

  useEffect(() => {
    if (!destacado || !caja.current) return
    const el = caja.current.querySelector(`[data-hallazgo="${destacado}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [destacado])

  const alSoltar = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !caja.current) return
    if (!caja.current.contains(sel.anchorNode) || !caja.current.contains(sel.focusNode)) return

    const a = offsetDe(sel.anchorNode, sel.anchorOffset)
    const b = offsetDe(sel.focusNode, sel.focusOffset)
    if (a === null || b === null) return

    let inicio = Math.min(a, b)
    let fin = Math.max(a, b)
    while (inicio < fin && /\s/.test(cuerpo[inicio])) inicio += 1
    while (fin > inicio && /\s/.test(cuerpo[fin - 1])) fin -= 1
    if (fin - inicio < 2) return

    const literal = cuerpo.slice(inicio, fin)
    // Marcar a caballo entre dos líneas o encima de un token ya puesto no
    // significa nada: se ignora en vez de producir un token roto.
    if (literal.includes('\n') || literal.includes('{{') || literal.includes('}}')) return

    sel.removeAllRanges()
    onSeleccionar({ inicio, fin, literal })
  }

  /** Parte una línea en texto, tokens y hallazgos, sin solapes. */
  const trocear = (linea: string, base: number): Trozo[] => {
    const marcas: Trozo[] = []

    const re = tokenRe()
    let m: RegExpExecArray | null
    while ((m = re.exec(linea)) !== null) {
      marcas.push({
        tipo: 'token',
        desde: base + m.index,
        hasta: base + m.index + m[0].length,
        clave: m[1],
        filtro: m[2] ?? null,
      })
    }

    const fin = base + linea.length
    for (const h of hallazgos) {
      for (const o of h.ocurrencias) {
        if (o.inicio >= base && o.fin <= fin) {
          marcas.push({ tipo: 'hallazgo', desde: o.inicio, hasta: o.fin, hallazgo: h })
        }
      }
    }

    marcas.sort((x, y) => x.desde - y.desde)

    const salida: Trozo[] = []
    let cursor = base
    for (const marca of marcas) {
      if (marca.desde < cursor) continue
      if (marca.desde > cursor) salida.push({ tipo: 'texto', desde: cursor, hasta: marca.desde })
      salida.push(marca)
      cursor = marca.hasta
    }
    if (cursor < fin) salida.push({ tipo: 'texto', desde: cursor, hasta: fin })
    return salida
  }

  const pintar = (trozos: Trozo[]) =>
    trozos.map((t, i) => {
      const texto = cuerpo.slice(t.desde, t.hasta)

      if (t.tipo === 'texto') {
        return (
          <span key={i} data-off={t.desde}>
            {texto}
          </span>
        )
      }

      if (t.tipo === 'token') {
        return (
          <button
            key={i}
            className="ranura es-marcada"
            title={`{{${t.clave}}} · pulsa para deshacer la marca`}
            onClick={() => onQuitarToken(t.clave)}
          >
            {etiquetas.get(t.clave) ?? t.clave}
            {t.filtro && <span className="ranura__filtro">{t.filtro}</span>}
          </button>
        )
      }

      const h = t.hallazgo
      return (
        <button
          key={i}
          data-hallazgo={h.id}
          data-off={t.desde}
          className={`hallado es-${h.confianza}${destacado === h.id ? ' es-mirado' : ''}`}
          title={`${h.motivo} · pulsa para marcarlo`}
          onClick={() => onHallazgo(h)}
        >
          {texto}
        </button>
      )
    })

  return (
    <div className="marcable" ref={caja} onMouseUp={alSoltar}>
      {lineas.map(({ texto, inicio }, i) => {
        const linea = texto.trimEnd()
        if (linea === '') return null

        if (linea === '-') return <div key={i} className="doc__regla" />

        const prefijo = /^(# |§ |> )/.exec(linea)?.[1] ?? ''
        const base = inicio + prefijo.length
        const trozos = trocear(linea.slice(prefijo.length), base)

        if (prefijo === '# ') return <h3 key={i} className="doc__titulo">{pintar(trozos)}</h3>
        if (prefijo === '§ ') return <h4 key={i} className="doc__clausula">{pintar(trozos)}</h4>
        if (prefijo === '> ') return <p key={i} className="doc__nota">{pintar(trozos)}</p>
        return <p key={i} className="doc__parrafo">{pintar(trozos)}</p>
      })}
    </div>
  )
}
