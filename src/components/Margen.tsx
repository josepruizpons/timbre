import { iniciales } from '../lib/marca'
import { useApp } from '../contexts/app_context'

export type Seccion = 'expedientes' | 'plantillas' | 'usuarios' | 'ajustes'

interface MargenProps {
  seccion: Seccion
  onIr: (seccion: Seccion) => void
  onSalir: () => void
}

/** Trazo de 1,4 px y esquinas vivas, el mismo lenguaje que la casilla y el sello. */
const ICONO = {
  expedientes: (
    <>
      <path d="M2.5 5.5 h6 l1.5 2 h7.5 v9.5 h-15 z" />
      <path d="M2.5 9.5 h16.5" />
    </>
  ),
  plantillas: (
    <>
      <path d="M4.5 2.5 h9 l4 4 v13 h-13 z" />
      <path d="M13.5 2.5 v4 h4" />
      <path d="M7.5 11.5 h7 M7.5 14.5 h7" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="8.5" cy="7.5" r="3.2" />
      <path d="M2.5 18.5 c0-3.4 2.7-5.4 6-5.4 s6 2 6 5.4" />
      <path d="M14.5 5.2 a3.2 3.2 0 0 1 0 5.6 M16 13.6 c2 .8 3.5 2.6 3.5 4.9" />
    </>
  ),
  ajustes: (
    <>
      <circle cx="11" cy="11" r="3" />
      <path d="M11 2.5 v3 M11 16.5 v3 M2.5 11 h3 M16.5 11 h3" />
      <path d="M5 5 l2.1 2.1 M14.9 14.9 L17 17 M17 5 l-2.1 2.1 M7.1 14.9 L5 17" />
    </>
  ),
} as const

function Icono({ nombre }: { nombre: keyof typeof ICONO }) {
  return (
    <svg
      className="margen__icono"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      aria-hidden="true"
    >
      {ICONO[nombre]}
    </svg>
  )
}

/**
 * El margen timbrado. En el papel del que sale la aplicación, la referencia va
 * impresa en una franja estrecha a la izquierda de la hoja; aquí esa franja es
 * la navegación, y sigue llevando la referencia —el nombre de la agencia—
 * estampado en vertical.
 */
export default function Margen({ seccion, onIr, onSalir }: MargenProps) {
  const { agente, esAdmin } = useApp()
  const agencia = agente?.agencia
  const nombre = agencia?.nombreCorto || agencia?.nombre || 'Timbre'

  const items: { id: Seccion; etiqueta: string }[] = [
    { id: 'expedientes', etiqueta: 'Casos' },
    { id: 'plantillas', etiqueta: 'Plantillas' },
    ...(esAdmin ? ([{ id: 'usuarios', etiqueta: 'Equipo' }] as const) : []),
    { id: 'ajustes', etiqueta: 'Ajustes' },
  ]

  return (
    <nav className="margen" aria-label="Secciones de Timbre">
      <div className="margen__marca" title={agencia?.nombre}>
        {agencia?.logoUrl ? (
          <img className="margen__logo" src={agencia.logoUrl} alt={agencia.nombre} />
        ) : (
          <span className="margen__iniciales">{iniciales(nombre)}</span>
        )}
      </div>

      <ul className="margen__lista">
        {items.map((item) => (
          <li key={item.id}>
            <button
              className={`margen__enlace${seccion === item.id ? ' es-activo' : ''}`}
              onClick={() => onIr(item.id)}
              aria-current={seccion === item.id ? 'page' : undefined}
            >
              <Icono nombre={item.id} />
              <span className="margen__etiqueta">{item.etiqueta}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* La referencia impresa en el filo: es lo que hace que la franja sea un
          margen timbrado y no una barra de iconos. */}
      <p className="margen__serie estampado" aria-hidden="true">
        Timbre · {nombre}
      </p>

      <button className="margen__salir" onClick={onSalir} title="Cerrar la sesión">
        <svg
          width="20"
          height="20"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="square"
          aria-hidden="true"
        >
          <path d="M8.5 3.5 h-5 v15 h5" />
          <path d="M12 11 h7.5 M16 7.5 L19.5 11 L16 14.5" />
        </svg>
        <span className="margen__etiqueta">Salir</span>
      </button>
    </nav>
  )
}
