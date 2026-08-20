import { useEffect, useMemo, useState } from 'react'

import Margen, { type Seccion } from './components/Margen'
import Panel from './components/Panel'
import Expediente from './components/Expediente'
import ExpedienteForm from './components/ExpedienteForm'
import Biblioteca from './components/Biblioteca'
import Creador from './components/Creador'
import Usuarios from './components/Usuarios'
import Ajustes from './components/Ajustes'
import Login from './components/Login'
import Avisos from './components/ui/Avisos'
import { useApp } from './contexts/app_context'
import type { ActualizarRequisitoDTO, ExpedienteDTO, PlantillaDTO } from './types'

type Ruta =
  | { v: 'panel' }
  | { v: 'exp'; id: string; reqId?: string }
  | { v: 'biblioteca' }
  | { v: 'creador'; plantillaId?: string; requisito?: string; volverA?: Ruta }
  | { v: 'usuarios' }
  | { v: 'ajustes' }

const RUTA_INICIAL: Ruta = { v: 'panel' }

const SECCION_DE: Record<Ruta['v'], Seccion> = {
  panel: 'expedientes',
  exp: 'expedientes',
  biblioteca: 'plantillas',
  creador: 'plantillas',
  usuarios: 'usuarios',
  ajustes: 'ajustes',
}

const RUTA_DE: Record<Seccion, Ruta> = {
  expedientes: { v: 'panel' },
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

  const [ruta, setRuta] = useState<Ruta>(RUTA_INICIAL)
  /** `'nuevo'`, el id del expediente que se edita, o `null`. */
  const [editando, setEditando] = useState<string | null>(null)

  const expedienteAbierto = ruta.v === 'exp' ? ruta.id : null

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [ruta.v, expedienteAbierto])

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
      <div className="acceso">
        <span className="rotulo">Comprobando la sesión…</span>
      </div>
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
        onIr={(s) => setRuta(RUTA_DE[s])}
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
            onAbrir={(id) => setRuta({ v: 'exp', id })}
            onNuevo={() => setEditando('nuevo')}
          />
        )}

        {ruta.v === 'exp' && expediente && (
          <Expediente
            key={expediente.id}
            exp={expediente}
            plantillas={plantillas}
            abierto={ruta.reqId ?? null}
            onAbrirRequisito={(reqId) => setRuta({ v: 'exp', id: expediente.id, reqId })}
            onVolver={() => setRuta({ v: 'panel' })}
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
