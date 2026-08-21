import { useEffect, useMemo, useState } from 'react'

import Margen, { type Seccion } from './components/Margen'
import Panel from './components/Panel'
import Expediente from './components/Expediente'
import Pendientes from './components/Pendientes'
import ExpedienteForm from './components/ExpedienteForm'
import Biblioteca from './components/Biblioteca'
import Creador from './components/Creador'
import Importador from './components/Importador'
import Usuarios from './components/Usuarios'
import Ajustes from './components/Ajustes'
import Login from './components/Login'
import Acceso from './components/ui/Acceso'
import Avisos from './components/ui/Avisos'
import { useApp } from './contexts/app_context'
import { aPath, desdePath, mismaRuta, type Ruta } from './lib/ruta'
import type { ActualizarRequisitoDTO, ExpedienteDTO, PlantillaDTO } from './types'

const SECCION_DE: Record<Ruta['v'], Seccion> = {
  panel: 'expedientes',
  pendientes: 'pendientes',
  exp: 'expedientes',
  biblioteca: 'plantillas',
  creador: 'plantillas',
  importador: 'plantillas',
  usuarios: 'usuarios',
  ajustes: 'ajustes',
}

const RUTA_DE: Record<Seccion, Ruta> = {
  expedientes: { v: 'panel' },
  pendientes: { v: 'pendientes' },
  plantillas: { v: 'biblioteca' },
  usuarios: { v: 'usuarios' },
  ajustes: { v: 'ajustes' },
}

export default function App() {
  const {
    sesion,
    esAdmin,
    expedientes,
    plantillas,
    cargando,
    error,
    salir,
    crearExpediente,
    actualizarExpediente,
    actualizarRequisito,
    guardarPlantilla,
    recargar,
  } = useApp()

  // La ruta arranca de la barra de direcciones, para que un enlace a un
  // expediente abra ese expediente y recargar no eche a nadie a la cartera.
  const [ruta, setRuta] = useState<Ruta>(() => desdePath(window.location.pathname))
  /** `'nuevo'`, el id del expediente que se edita, o `null`. */
  const [editando, setEditando] = useState<string | null>(null)

  const expedienteAbierto = ruta.v === 'exp' ? ruta.id : null

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [ruta.v, expedienteAbierto])

  // La ruta manda sobre la URL…
  useEffect(() => {
    const camino = aPath(ruta)
    if (window.location.pathname !== camino) window.history.pushState(null, '', camino)
  }, [ruta])

  // …y los botones de atrás y adelante mandan sobre la ruta.
  useEffect(() => {
    const alVolver = () => setRuta(desdePath(window.location.pathname))
    window.addEventListener('popstate', alVolver)
    return () => window.removeEventListener('popstate', alVolver)
  }, [])

  const expediente = useMemo(
    () => (ruta.v === 'exp' ? expedientes.find((e) => e.id === ruta.id) ?? null : null),
    [expedientes, ruta]
  )

  const muestra = expedientes.find((e) => e.estado === 'activo') ?? expedientes[0] ?? null

  const onActualizar = (expId: string, reqId: string, parche: ActualizarRequisitoDTO) => {
    void actualizarRequisito(expId, reqId, parche)
  }

  const onGuardarPlantilla = async (plantilla: PlantillaDTO) => {
    await guardarPlantilla(plantilla)
    setRuta((ruta.v === 'creador' && ruta.volverA) || { v: 'biblioteca' })
  }

  /** Ir a otro sitio sin apilar la misma pantalla dos veces en el historial. */
  const ir = (destino: Ruta) => setRuta((previa) => (mismaRuta(previa, destino) ? previa : destino))

  const onGuardarExpediente = async (datos: ExpedienteDTO) => {
    if (editando && editando !== 'nuevo') {
      await actualizarExpediente(editando, datos)
      return
    }
    const creado = await crearExpediente(datos)
    setRuta({ v: 'exp', id: creado.id })
  }

  if (sesion === null) {
    return (
      <Acceso>
        <span className="rotulo">Comprobando la sesión…</span>
      </Acceso>
    )
  }

  if (!sesion) return <Login />

  // Un agente que llega a /usuarios (por ejemplo tras perder el rol) ve
  // Ajustes, no una pantalla en blanco.
  const seccion = ruta.v === 'usuarios' && !esAdmin ? 'ajustes' : SECCION_DE[ruta.v]

  return (
    <div className="app">
      <Margen
        seccion={seccion}
        onIr={(s) => ir(RUTA_DE[s])}
        onSalir={() => void salir()}
      />

      <main className="pliego">
        {error && (
          <div className="aviso es-sello">
            <span className="aviso__rotulo">Error</span>
            <span>{error}</span>
            <button className="btn es-plano" onClick={() => void recargar()}>
              Reintentar
            </button>
          </div>
        )}

        {cargando && expedientes.length === 0 && !error && (
          <div className="vacio">
            <p className="vacio__titulo">Cargando expedientes…</p>
          </div>
        )}

        {ruta.v === 'panel' && (
          <Panel
            expedientes={expedientes}
            onAbrir={(id) => ir({ v: 'exp', id })}
            onNuevo={() => setEditando('nuevo')}
          />
        )}

        {ruta.v === 'pendientes' && (
          <Pendientes
            expedientes={expedientes}
            plantillas={plantillas}
            onAbrir={(id, reqId) => ir({ v: 'exp', id, reqId })}
          />
        )}

        {ruta.v === 'exp' && expediente && (
          <Expediente
            key={expediente.id}
            exp={expediente}
            plantillas={plantillas}
            abierto={ruta.reqId ?? null}
            onAbrirRequisito={(reqId) => ir({ v: 'exp', id: expediente.id, reqId })}
            onVolver={() => ir({ v: 'panel' })}
            onActualizar={(reqId, parche) => onActualizar(expediente.id, reqId, parche)}
            onEditar={() => setEditando(expediente.id)}
            onCrearPlantilla={(requisito) =>
              setRuta({
                v: 'creador',
                requisito,
                // Al guardar se vuelve al mismo requisito, no al resumen.
                volverA: { v: 'exp', id: expediente.id, reqId: requisito },
              })
            }
          />
        )}

        {ruta.v === 'exp' && !expediente && !cargando && (
          <div className="vacio">
            <p className="vacio__titulo">Ese expediente ya no está</p>
            <p className="vacio__texto">
              Puede que lo haya borrado otra persona de la agencia.
            </p>
            <button className="btn es-principal" onClick={() => setRuta({ v: 'panel' })}>
              Volver a la cartera
            </button>
          </div>
        )}

        {ruta.v === 'biblioteca' && (
          <Biblioteca
            plantillas={plantillas}
            onCrear={() => setRuta({ v: 'creador', volverA: { v: 'biblioteca' } })}
            onImportar={() => setRuta({ v: 'importador' })}
            onEditar={(id) =>
              setRuta({ v: 'creador', plantillaId: id, volverA: { v: 'biblioteca' } })
            }
          />
        )}

        {ruta.v === 'creador' && (
          <Creador
            key={ruta.plantillaId || ruta.requisito || 'nueva'}
            plantillaBase={plantillas.find((p) => p.id === ruta.plantillaId) ?? null}
            requisitoSugerido={ruta.requisito}
            expedienteMuestra={muestra}
            onGuardar={(plantilla) => void onGuardarPlantilla(plantilla)}
            onCancelar={() => setRuta(ruta.volverA ?? { v: 'biblioteca' })}
          />
        )}

        {ruta.v === 'importador' && (
          <Importador
            requisitoSugerido={ruta.requisito}
            onGuardada={() => setRuta({ v: 'biblioteca' })}
            onCancelar={() => setRuta({ v: 'biblioteca' })}
          />
        )}

        {ruta.v === 'usuarios' && (esAdmin ? <Usuarios /> : <Ajustes />)}

        {ruta.v === 'ajustes' && <Ajustes />}
      </main>

      {editando && (
        <ExpedienteForm
          key={editando}
          abierto
          base={editando === 'nuevo' ? null : expedientes.find((e) => e.id === editando) ?? null}
          onGuardar={onGuardarExpediente}
          onCerrar={() => setEditando(null)}
        />
      )}

      <Avisos />
    </div>
  )
}
