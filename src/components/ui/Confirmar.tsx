import { useState } from 'react'

import Modal from './Modal'

export interface PeticionConfirmar {
  titulo: string
  cuerpo: string
  /** Texto del botón que ejecuta. Nombra la acción: «Borrar», no «Aceptar». */
  accion: string
  destructiva?: boolean
  alConfirmar: () => Promise<void> | void
}

interface ConfirmarProps {
  peticion: PeticionConfirmar | null
  onCerrar: () => void
}

/** Confirmación de lo que no tiene vuelta atrás. Nunca para guardar. */
export default function Confirmar({ peticion, onCerrar }: ConfirmarProps) {
  const [trabajando, setTrabajando] = useState(false)

  const ejecutar = async () => {
    if (!peticion || trabajando) return
    setTrabajando(true)
    try {
      await peticion.alConfirmar()
      onCerrar()
    } catch {
      // El aviso de error ya lo ha puesto el contexto; el diálogo se queda
      // abierto para poder reintentar.
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <Modal
      abierto={peticion !== null}
      rotulo="Confirmar"
      titulo={peticion?.titulo ?? ''}
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn" onClick={onCerrar} disabled={trabajando}>
            Cancelar
          </button>
          <button
            className={`btn ${peticion?.destructiva ? 'es-sello' : 'es-principal'}`}
            onClick={() => void ejecutar()}
            disabled={trabajando}
          >
            {trabajando ? 'Un momento…' : peticion?.accion ?? 'Aceptar'}
          </button>
        </>
      }
    >
      <p className="modal__parrafo">{peticion?.cuerpo}</p>
    </Modal>
  )
}
