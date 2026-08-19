import type { ChangeEvent } from 'react'

import { completitud } from '../lib/expediente'
import type { Campo, Plantilla } from '../types'

interface ControlProps {
  campo: Campo
  valor: string | undefined
  onChange: (clave: string, valor: string) => void
  onFoco: (clave: string) => void
  onSalida: () => void
}

function Control({ campo, valor, onChange, onFoco, onSalida }: ControlProps) {
  const comun = {
    className: 'campo',
    id: `campo-${campo.clave}`,
    value: valor ?? '',
    placeholder: campo.pista || '',
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(campo.clave, e.target.value),
    onFocus: () => onFoco(campo.clave),
    onBlur: onSalida
  }

  if (campo.tipo === 'textarea') return <textarea {...comun} rows={3} />

  if (campo.tipo === 'select') {
    return (
      <select {...comun}>
        <option value="">Sin especificar</option>
        {(campo.opciones || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }

  if (campo.tipo === 'date') return <input {...comun} type="date" />
  if (campo.tipo === 'money' || campo.tipo === 'number') {
    return <input {...comun} type="number" inputMode="decimal" step={campo.tipo === 'money' ? '0.01' : '1'} />
  }
  return <input {...comun} type="text" />
}

/**
 * Campos a completar de la plantilla elegida. Al enfocar un campo se resalta
 * su hueco en la vista previa, de modo que el agente ve el efecto de lo que
 * escribe sin salir del formulario.
 */
interface FormularioProps {
  plantilla: Plantilla
  valores: Record<string, string> | undefined
  onChange: (clave: string, valor: string) => void
  onFoco: (clave: string) => void
  onSalida: () => void
}

export default function Formulario({ plantilla, valores, onChange, onFoco, onSalida }: FormularioProps) {
  const grupos: { nombre: string; campos: Campo[] }[] = []
  for (const campo of plantilla.campos) {
    const nombre = campo.grupo || 'Datos'
    let g = grupos.find((x) => x.nombre === nombre)
    if (!g) {
      g = { nombre, campos: [] }
      grupos.push(g)
    }
    g.campos.push(campo)
  }

  const est = completitud(plantilla, valores)

  return (
    <section className="formulario">
      <header className="formulario__cab">
        <span className="rotulo">Campos a completar</span>
        <span className="dato silente">
          {est.rellenos}/{est.campos}
        </span>
      </header>

      <div className="formulario__cuerpo">
        {grupos.map((g) => (
          <div key={g.nombre} className="grupo">
            <h4 className="grupo__titulo">{g.nombre}</h4>
            {g.campos.map((campo) => (
              <div key={campo.clave} className="campo-fila">
                <label className="campo-fila__etiqueta" htmlFor={`campo-${campo.clave}`}>
                  {campo.etiqueta}
                  {campo.requerido && (
                    <span className="campo-fila__req" title="Obligatorio">
                      *
                    </span>
                  )}
                  {campo.auto && valores?.[campo.clave] ? (
                    <span className="campo-fila__auto">del expediente</span>
                  ) : null}
                </label>
                <Control
                  campo={campo}
                  valor={valores?.[campo.clave]}
                  onChange={onChange}
                  onFoco={onFoco}
                  onSalida={onSalida}
                />
                {campo.pista && campo.tipo === 'textarea' && (
                  <p className="campo-fila__pista">{campo.pista}</p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
