import type { ChangeEvent, ReactNode } from 'react'

interface BaseProps {
  etiqueta: string
  id: string
  pista?: string
  requerido?: boolean
  error?: string
}

function Envoltura({
  etiqueta,
  id,
  pista,
  requerido,
  error,
  children,
}: BaseProps & { children: ReactNode }) {
  return (
    <div className={`campo-fila${error ? ' es-error' : ''}`}>
      <label className="campo-fila__etiqueta" htmlFor={id}>
        {etiqueta}
        {requerido && (
          <span className="campo-fila__req" title="Obligatorio">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="campo-fila__error">{error}</p>
      ) : (
        pista && <p className="campo-fila__pista">{pista}</p>
      )}
    </div>
  )
}

interface TextoProps extends BaseProps {
  valor: string
  onChange: (valor: string) => void
  tipo?: 'text' | 'email' | 'password' | 'date' | 'number' | 'tel' | 'url'
  placeholder?: string
  autoComplete?: string
  paso?: string
  maximo?: number
  minimo?: number
}

export function CampoTexto({
  valor,
  onChange,
  tipo = 'text',
  placeholder,
  autoComplete,
  paso,
  maximo,
  minimo,
  ...base
}: TextoProps) {
  return (
    <Envoltura {...base}>
      <input
        id={base.id}
        className="campo"
        type={tipo}
        value={valor}
        placeholder={placeholder}
        autoComplete={autoComplete}
        step={paso}
        max={maximo}
        min={minimo}
        required={base.requerido}
        aria-invalid={base.error ? true : undefined}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </Envoltura>
  )
}

interface AreaProps extends BaseProps {
  valor: string
  onChange: (valor: string) => void
  filas?: number
  placeholder?: string
}

export function CampoArea({ valor, onChange, filas = 3, placeholder, ...base }: AreaProps) {
  return (
    <Envoltura {...base}>
      <textarea
        id={base.id}
        className="campo"
        rows={filas}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Envoltura>
  )
}

interface SelectProps extends BaseProps {
  valor: string
  onChange: (valor: string) => void
  opciones: { valor: string; texto: string }[]
  vacio?: string
}

export function CampoSelect({ valor, onChange, opciones, vacio, ...base }: SelectProps) {
  return (
    <Envoltura {...base}>
      <select
        id={base.id}
        className="campo"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      >
        {vacio !== undefined && <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </Envoltura>
  )
}

interface CasillaProps {
  etiqueta: string
  id: string
  valor: boolean
  onChange: (valor: boolean) => void
  pista?: string
}

/** Interruptor de circunstancia: cada uno abre o cierra requisitos del catálogo. */
export function CampoCasilla({ etiqueta, id, valor, onChange, pista }: CasillaProps) {
  return (
    <label className={`interruptor${valor ? ' es-marcado' : ''}`} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={valor}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="interruptor__caja" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M2.4 6.2 L5 8.8 L9.6 3.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="square"
          />
        </svg>
      </span>
      <span>
        <span className="interruptor__texto">{etiqueta}</span>
        {pista && <span className="interruptor__pista">{pista}</span>}
      </span>
    </label>
  )
}

/** Agrupa campos bajo un rótulo, como los apartados de un impreso. */
export function Apartado({
  titulo,
  nota,
  children,
}: {
  titulo: string
  nota?: string
  children: ReactNode
}) {
  return (
    <section className="apartado">
      <header className="apartado__cab">
        <span className="rotulo">{titulo}</span>
        {nota && <span className="apartado__nota">{nota}</span>}
      </header>
      <div className="apartado__rejilla">{children}</div>
    </section>
  )
}
