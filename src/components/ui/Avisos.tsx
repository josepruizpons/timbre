import { useApp } from '../../contexts/app_context'

const ROTULO = {
  bien: 'Hecho',
  mal: 'Error',
  neutro: 'Aviso',
} as const

/**
 * Confirmaciones de lo que acaba de pasar. Se apilan abajo a la derecha, junto
 * al pulgar, y desaparecen solas: nada de aquí exige respuesta.
 */
export default function Avisos() {
  const { avisos, descartarAviso } = useApp()

  if (avisos.length === 0) return null

  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map((a) => (
        <div key={a.id} className={`nota es-${a.tono}`}>
          <span className="nota__rotulo">{ROTULO[a.tono]}</span>
          <span className="nota__texto">{a.texto}</span>
          <button
            className="nota__cerrar"
            onClick={() => descartarAviso(a.id)}
            aria-label="Descartar aviso"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
