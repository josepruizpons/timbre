import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'

export interface OpcionBuscador {
  valor: string
  etiqueta: string
  grupo: string
  /** Aclaración a la derecha: «se rellena sola», «de tus plantillas». */
  nota?: string
}

interface Props {
  etiqueta: string
  /** Lo escrito. Al elegir una opción pasa a ser su etiqueta. */
  texto: string
  onTexto: (texto: string) => void
  /** Opción elegida, o `null` si lo escrito no corresponde a ninguna. */
  valor: string | null
  onValor: (valor: string | null) => void
  opciones: OpcionBuscador[]
  placeholder?: string
  /** Texto de la última fila, la que crea algo que no existía. */
  crear?: (texto: string) => string
  requerido?: boolean
  error?: string
  autoFoco?: boolean
}

/** «Cañón» y «canon» son la misma palabra a la hora de buscar. */
const plano = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Campo de texto que busca entre opciones mientras se escribe, y que acepta
 * también lo que no está en la lista.
 *
 * Es lo que sustituye a un desplegable largo: con veintidós datos de expediente
 * más los campos de las demás plantillas, recorrer la lista cuesta más que
 * teclear tres letras. Y como lo escrito vale por sí mismo, nombrar un dato
 * nuevo y elegir uno conocido son el mismo gesto.
 */
export default function Buscador({
  etiqueta,
  texto,
  onTexto,
  valor,
  onValor,
  opciones,
  placeholder,
  crear,
  requerido,
  error,
  autoFoco,
}: Props) {
  const id = useId()
  const [abierto, setAbierto] = useState(false)
  const [resaltado, setResaltado] = useState(0)
  const caja = useRef<HTMLDivElement>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  /** Al elegir se devuelve el foco al campo, y ese foco no debe reabrir la lista. */
  const saltarApertura = useRef(false)

  const elegida = opciones.find((o) => o.valor === valor) ?? null

  // Con una opción ya elegida la lista se enseña entera: lo escrito es su
  // nombre, y filtrar por él dejaría fuera todo lo demás.
  const filtradas = useMemo(() => {
    const consulta = plano(texto)
    if (!consulta || elegida) return opciones
    return opciones.filter(
      (o) => plano(o.etiqueta).includes(consulta) || plano(o.grupo).includes(consulta)
    )
  }, [opciones, texto, elegida])

  const ofreceCrear = Boolean(crear && texto.trim() && !elegida)
  const total = filtradas.length + (ofreceCrear ? 1 : 0)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  useEffect(() => {
    if (autoFoco) entrada.current?.focus()
  }, [autoFoco])

  /**
   * La lista va en posición fija y se coloca a mano bajo el campo. Colgada del
   * flujo normal la recortaba el `overflow` del diálogo, que solo dejaba ver
   * los dos primeros resultados. Y si no cabe debajo, se abre hacia arriba.
   */
  useLayoutEffect(() => {
    if (!abierto) return
    const colocar = () => {
      const campo = entrada.current
      const menu = lista.current
      if (!campo || !menu) return
      const r = campo.getBoundingClientRect()
      menu.style.left = `${r.left}px`
      menu.style.width = `${r.width}px`
      menu.style.maxHeight = `${Math.min(268, window.innerHeight - 24)}px`
      const alto = menu.offsetHeight
      const cabeDebajo = r.bottom + alto + 12 <= window.innerHeight
      menu.style.top = cabeDebajo ? `${r.bottom + 3}px` : `${Math.max(12, r.top - alto - 3)}px`
    }
    colocar()
    window.addEventListener('resize', colocar)
    window.addEventListener('scroll', colocar, true)
    return () => {
      window.removeEventListener('resize', colocar)
      window.removeEventListener('scroll', colocar, true)
    }
  }, [abierto, filtradas.length, ofreceCrear])

  const cerrarYVolver = () => {
    saltarApertura.current = true
    entrada.current?.focus()
    setAbierto(false)
  }

  const elegir = (opcion: OpcionBuscador) => {
    onValor(opcion.valor)
    onTexto(opcion.etiqueta)
    cerrarYVolver()
  }

  const crearNuevo = () => {
    onValor(null)
    cerrarYVolver()
  }

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!abierto) return setAbierto(true)
      const paso = e.key === 'ArrowDown' ? 1 : -1
      setResaltado((r) => (total === 0 ? 0 : (r + paso + total) % total))
      return
    }
    if (e.key === 'Enter' && abierto) {
      e.preventDefault()
      if (resaltado < filtradas.length) elegir(filtradas[resaltado])
      else if (ofreceCrear) crearNuevo()
      return
    }
    if (e.key === 'Escape' && abierto) {
      // Sin esto, la primera pulsación cerraría el diálogo entero.
      e.preventDefault()
      e.stopPropagation()
      setAbierto(false)
    }
  }

  // Los grupos se pintan como rótulos entre las filas, no como <optgroup>.
  const conCabecera = filtradas.map((o, i) => ({
    opcion: o,
    indice: i,
    abreGrupo: i === 0 || filtradas[i - 1].grupo !== o.grupo,
  }))

  return (
    <div className={`campo-fila buscador${error ? ' es-error' : ''}`} ref={caja}>
      <label className="campo-fila__etiqueta" htmlFor={id}>
        {etiqueta}
        {requerido && (
          <span className="campo-fila__req" title="Obligatorio">
            *
          </span>
        )}
      </label>

      <div className="buscador__caja">
        <input
          ref={entrada}
          id={id}
          className="campo buscador__entrada"
          value={texto}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={abierto ? `${id}-op-${resaltado}` : undefined}
          onChange={(e) => {
            onTexto(e.target.value)
            // Escribir encima de una opción elegida la desata: pasa a ser un
            // nombre libre otra vez.
            if (valor !== null) onValor(null)
            setResaltado(0)
            setAbierto(true)
          }}
          onFocus={() => {
            if (saltarApertura.current) {
              saltarApertura.current = false
              return
            }
            setAbierto(true)
          }}
          onKeyDown={alTeclear}
        />
        <button
          type="button"
          className="buscador__punta"
          tabIndex={-1}
          aria-label={abierto ? 'Cerrar la lista' : 'Ver todos'}
          onClick={() => {
            setAbierto((v) => !v)
            entrada.current?.focus()
          }}
        >
          <svg width="10" height="7" viewBox="0 0 10 7" aria-hidden="true">
            <path d="M1 1.5 L5 5.5 L9 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        {abierto && total > 0 && (
          <ul className="buscador__lista" id={`${id}-lista`} role="listbox" ref={lista}>
            {conCabecera.map(({ opcion, indice, abreGrupo }) => (
              <li key={opcion.valor}>
                {abreGrupo && <span className="buscador__grupo rotulo">{opcion.grupo}</span>}
                <button
                  type="button"
                  id={`${id}-op-${indice}`}
                  role="option"
                  aria-selected={valor === opcion.valor}
                  className={`buscador__opcion${resaltado === indice ? ' es-resaltada' : ''}${
                    valor === opcion.valor ? ' es-elegida' : ''
                  }`}
                  onMouseEnter={() => setResaltado(indice)}
                  onClick={() => elegir(opcion)}
                >
                  <span className="buscador__nombre">{opcion.etiqueta}</span>
                  {opcion.nota && <span className="buscador__nota">{opcion.nota}</span>}
                </button>
              </li>
            ))}

            {ofreceCrear && (
              <li>
                <button
                  type="button"
                  id={`${id}-op-${filtradas.length}`}
                  role="option"
                  aria-selected={false}
                  className={`buscador__opcion es-crear${
                    resaltado === filtradas.length ? ' es-resaltada' : ''
                  }`}
                  onMouseEnter={() => setResaltado(filtradas.length)}
                  onClick={crearNuevo}
                >
                  <span className="buscador__mas" aria-hidden="true">
                    +
                  </span>
                  <span className="buscador__nombre">{crear!(texto.trim())}</span>
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {error && <p className="campo-fila__error">{error}</p>}
    </div>
  )
}
