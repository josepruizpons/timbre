import type { ReactNode } from 'react'

/**
 * Antesala de la aplicación. Lleva el mismo margen timbrado que la aplicación
 * ya abierta, en el mismo sitio y con el mismo ancho: al entrar, el margen no
 * se mueve. Es la única pieza de la interfaz que se ve antes de saber de qué
 * agencia es la sesión, así que va con la marca de Timbre, no con la de nadie.
 */
export default function Acceso({ children }: { children: ReactNode }) {
  return (
    <div className="acceso">
      <aside className="acceso__margen" aria-hidden="true">
        <p className="acceso__serie estampado">
          Timbre · expedientes de compraventa · Timbre · expedientes de compraventa
        </p>
      </aside>
      <div className="acceso__hoja">{children}</div>
    </div>
  )
}
