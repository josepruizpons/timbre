import { useEffect, useMemo, useState } from 'react'
import Panel from './components/Panel.jsx'
import Expediente from './components/Expediente.jsx'
import Biblioteca from './components/Biblioteca.jsx'
import Creador from './components/Creador.jsx'
import { cargar, guardar, reiniciar } from './lib/storage.js'
import { AGENTE } from './data/cases.js'

const RUTA_INICIAL = { v: 'panel' }

export default function App() {
  const [datos, setDatos] = useState(cargar)
  const [ruta, setRuta] = useState(RUTA_INICIAL)

  useEffect(() => {
    guardar(datos)
  }, [datos])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [ruta.v, ruta.id])

  const expediente = useMemo(
    () => datos.expedientes.find((e) => e.id === ruta.id) || null,
    [datos.expedientes, ruta.id]
  )

  /** Escribe el estado de un requisito dentro de un expediente. */
  const actualizarRequisito = (expId, reqId, parche) => {
    setDatos((prev) => ({
      ...prev,
      expedientes: prev.expedientes.map((e) => {
        if (e.id !== expId) return e
        const anterior = e.reqs[reqId] || {
          estado: 'pendiente',
          emitido: null,
          plantillaId: null,
          valores: {}
        }
        const limpio = Object.fromEntries(
          Object.entries(parche).filter(([, v]) => v !== undefined)
        )
        return { ...e, reqs: { ...e.reqs, [reqId]: { ...anterior, ...limpio } } }
      })
    }))
  }

  const guardarPlantilla = (plantilla) => {
    setDatos((prev) => {
      const existe = prev.plantillas.some((p) => p.id === plantilla.id)
      return {
        ...prev,
        plantillas: existe
          ? prev.plantillas.map((p) => (p.id === plantilla.id ? plantilla : p))
          : [plantilla, ...prev.plantillas]
      }
    })
    setRuta(ruta.volverA || { v: 'biblioteca' })
  }

  const muestra =
    datos.expedientes.find((e) => e.estado === 'activo') || datos.expedientes[0]

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
            <b>{AGENTE.nombre}</b>
            <span>
              {AGENTE.agencia} · {AGENTE.colegiado}
            </span>
          </div>
          <button
            className="barra__reset"
            onClick={() => {
              setDatos(reiniciar())
              setRuta(RUTA_INICIAL)
            }}
            title="Devolver los datos de muestra a su estado original"
            aria-label="Reiniciar los datos de muestra"
          >
            <span className="barra__reset-txt">Reiniciar muestra</span>
          </button>
        </div>
      </header>

      <main className="lienzo">
        {ruta.v === 'panel' && (
          <Panel
            expedientes={datos.expedientes}
            onAbrir={(id) => setRuta({ v: 'exp', id })}
          />
        )}

        {ruta.v === 'exp' && expediente && (
          <Expediente
            key={expediente.id}
            exp={expediente}
            plantillas={datos.plantillas}
            abierto={ruta.reqId || null}
            onAbrirRequisito={(reqId) => setRuta({ v: 'exp', id: expediente.id, reqId })}
            onVolver={() => setRuta({ v: 'panel' })}
            onActualizar={(reqId, parche) => actualizarRequisito(expediente.id, reqId, parche)}
            onCrearPlantilla={(requisito) =>
              setRuta({
                v: 'creador',
                requisito,
                // Al guardar se vuelve al mismo requisito, no al resumen.
                volverA: { v: 'exp', id: expediente.id, reqId: requisito }
              })
            }
          />
        )}

        {ruta.v === 'biblioteca' && (
          <Biblioteca
            plantillas={datos.plantillas}
            onCrear={() => setRuta({ v: 'creador', volverA: { v: 'biblioteca' } })}
            onEditar={(id) =>
              setRuta({ v: 'creador', plantillaId: id, volverA: { v: 'biblioteca' } })
            }
          />
        )}

        {ruta.v === 'creador' && (
          <Creador
            key={ruta.plantillaId || ruta.requisito || 'nueva'}
            plantillaBase={datos.plantillas.find((p) => p.id === ruta.plantillaId) || null}
            requisitoSugerido={ruta.requisito}
            expedienteMuestra={muestra}
            onGuardar={guardarPlantilla}
            onCancelar={() => setRuta(ruta.volverA || { v: 'biblioteca' })}
          />
        )}
      </main>
    </div>
  )
}
