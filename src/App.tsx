import { useEffect, useMemo, useState } from 'react'

import Panel from './components/Panel'
import Expediente from './components/Expediente'
import Biblioteca from './components/Biblioteca'
import Creador from './components/Creador'
import Login from './components/Login'
import { useApp } from './contexts/app_context'
import type { ActualizarRequisitoDTO, PlantillaDTO } from './types'

type Ruta =
  | { v: 'panel' }
  | { v: 'exp'; id: string; reqId?: string }
  | { v: 'biblioteca' }
  | { v: 'creador'; plantillaId?: string; requisito?: string; volverA?: Ruta }

const RUTA_INICIAL: Ruta = { v: 'panel' }

export default function App() {
  const {
    sesion,
    agente,
    expedientes,
    plantillas,
    cargando,
    error,
    salir,
    actualizarRequisito,
    guardarPlantilla,
  } = useApp()

  const [ruta, setRuta] = useState<Ruta>(RUTA_INICIAL)

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

  if (sesion === null) {
    return (
      <div className="acceso">
        <span className="rotulo">Comprobando la sesión…</span>
      </div>
    )
  }

  if (!sesion) return <Login />

  return (
    <div className="app">
      <header className="barra">
        <div className="barra__marca">
          <span className="barra__nombre">Timbre</span>
          <span className="barra__sub">expedientes de compraventa</span>
        </div>

        <nav className="barra__nav">
          <button
            className={`barra__link${ruta.v === 'panel' || ruta.v === 'exp' ? ' es-activo' : ''}`}
            onClick={() => setRuta({ v: 'panel' })}
          >
            Expedientes
          </button>
          <button
            className={`barra__link${ruta.v === 'biblioteca' || ruta.v === 'creador' ? ' es-activo' : ''}`}
            onClick={() => setRuta({ v: 'biblioteca' })}
          >
            Plantillas
          </button>
        </nav>

        <div className="barra__cola">
          <div className="barra__agente">
            <b>{agente?.nombre}</b>
            <span>
              {agente?.agencia.nombre}
              {agente?.colegiado ? ` · ${agente.colegiado}` : ''}
            </span>
          </div>
          <button
            className="barra__reset"
            onClick={() => void salir()}
            title="Cerrar la sesión"
            aria-label="Cerrar sesión"
          >
            <span className="barra__reset-txt">Salir</span>
          </button>
        </div>
      </header>

      <main className="lienzo">
        {error && (
          <div className="aviso es-sello">
            <span className="aviso__rotulo">Error</span>
            <span>{error}</span>
          </div>
        )}

        {cargando && expedientes.length === 0 && (
          <div className="vacio">
            <p className="vacio__titulo">Cargando expedientes…</p>
          </div>
        )}

        {ruta.v === 'panel' && (
          <Panel expedientes={expedientes} onAbrir={(id) => setRuta({ v: 'exp', id })} />
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
      </main>
    </div>
  )
}
