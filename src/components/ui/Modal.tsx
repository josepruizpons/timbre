import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  abierto: boolean
  titulo: string
  rotulo?: string
  ancho?: 'normal' | 'ancho'
  onCerrar: () => void
  children: ReactNode
  pie?: ReactNode
}

/**
 * Diálogo sobre `<dialog>` nativo: el navegador se encarga del foco atrapado,
 * de la tecla Escape y de la capa de fondo, que a mano siempre salen a medias.
 */
export default function Modal({
  abierto,
  titulo,
  rotulo,
  ancho = 'normal',
  onCerrar,
  children,
  pie,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      className={`modal${ancho === 'ancho' ? ' es-ancho' : ''}`}
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      // Clic en el fondo: el objetivo del evento es el propio <dialog> solo
      // cuando se pulsa fuera de su contenido.
      onClick={(e) => {
        if (e.target === ref.current) onCerrar()
      }}
    >
      <div className="modal__hoja">
        <header className="modal__cab">
          <div>
            {rotulo && <span className="rotulo">{rotulo}</span>}
            <h2 className="modal__titulo">{titulo}</h2>
          </div>
          <button className="modal__cerrar" onClick={onCerrar} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M2 2 L12 12 M12 2 L2 12"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="modal__cuerpo">{children}</div>

        {pie && <footer className="modal__pie">{pie}</footer>}
      </div>
    </dialog>
  )
}
