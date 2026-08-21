import { useMemo, useState } from 'react'

import { loQueEsperamos, personaDe, porPersona, type Pendiente } from '../lib/pendientes'
import { fechaCorta, hoy } from '../lib/format'
import { useApp } from '../contexts/app_context'
import type { Expediente, Plantilla } from '../types'

/**
 * La persecución, que es la mitad del trabajo y no estaba en ninguna pantalla.
 *
 * 20 de los 31 requisitos dependen de que otra persona te mande algo. Hasta
 * ahora Timbre sabía decir qué falta, pero no **a quién se lo has pedido ni
 * desde cuándo**, que es lo que Sergio lleva en la libreta y en el historial de
 * WhatsApp.
 *
 * Solo se enseña lo ya pedido: lo que aún no se ha pedido es trabajo suyo, no
 * espera de nadie, y mezclarlo devolvería esto a ser una lista de tareas.
 */

function Espera({ dias, insistir }: { dias: number; insistir: boolean }) {
  const texto = dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`
  return (
    <span className={`marca ${insistir ? 'es-ocre' : ''}`} title="Desde que se pidió">
      {texto}
    </span>
  )
}

interface FilaProps {
  p: Pendiente
  onAbrir: (expedienteId: string, reqId: string) => void
  onRecordar: (p: Pendiente) => void
  conCaso?: boolean
}

function Fila({ p, onAbrir, onRecordar, conCaso }: FilaProps) {
  return (
    <li className={`espera${p.tocaInsistir ? ' es-insistir' : ''}`}>
      <button className="espera__que" onClick={() => onAbrir(p.expedienteId, p.req.id)}>
        <span className="espera__nombre">{p.req.def.nombre}</span>
        <span className="espera__pie">
          <span className="sigla">{p.req.id}</span>
          {conCaso && <span className="dato silente">{p.referencia}</span>}
          {conCaso && <span className="espera__donde">{p.direccion}</span>}
          {p.req.def.critico && <span className="marca es-sello">bloquea firma</span>}
          {p.req.estado === 'caducado' && <span className="marca es-sello">caducado</span>}
        </span>
      </button>

      <span className="espera__cuando">
        {p.esperando !== null ? (
          <>
            <span className="rotulo">Pedido</span>
            <Espera dias={p.esperando} insistir={p.tocaInsistir} />
            {p.desdeRecordatorio !== null && (
              <span className="dato silente">
                recordado {p.desdeRecordatorio === 0 ? 'hoy' : `hace ${p.desdeRecordatorio} d`}
              </span>
            )}
          </>
        ) : (
          <span className="dato silente">sin pedir</span>
        )}
      </span>

      <span className="espera__mandos">
        {p.esperando !== null && (
          <button
            className={`btn es-plano${p.tocaInsistir ? ' es-ocre' : ''}`}
            onClick={() => onRecordar(p)}
            title="Apunta que has vuelto a insistir hoy"
          >
            Recordar
          </button>
        )}
      </span>
    </li>
  )
}

interface Props {
  expedientes: Expediente[]
  plantillas: Plantilla[]
  onAbrir: (expedienteId: string, reqId: string) => void
}

/** La pantalla de cartera: todo lo que la agencia está esperando. */
export default function Pendientes({ expedientes, plantillas, onAbrir }: Props) {
  const { actualizarRequisito, anadirTraza, avisar } = useApp()
  const [filtro, setFiltro] = useState<string>('')

  const esperando = useMemo(
    () => loQueEsperamos(expedientes, plantillas),
    [expedientes, plantillas]
  )

  const porCaso = useMemo(() => {
    const mapa = new Map<string, Pendiente[]>()
    for (const p of esperando) {
      if (filtro && p.responsable !== filtro) continue
      const lista = mapa.get(p.expedienteId) ?? []
      lista.push(p)
      mapa.set(p.expedienteId, lista)
    }
    return [...mapa.entries()]
  }, [esperando, filtro])

  const recordar = async (p: Pendiente) => {
    await actualizarRequisito(p.expedienteId, p.req.id, { recordado: hoy() })
    const exp = expedientes.find((e) => e.id === p.expedienteId)
    if (exp) {
      await anadirTraza(
        p.expedienteId,
        `Recordado a ${personaDe(exp, p.responsable)}: ${p.req.def.nombre}.`,
        hoy()
      )
    }
    avisar('Apuntado. Vuelve a salir dentro de una semana si no ha llegado.')
  }

  const insistir = esperando.filter((p) => p.tocaInsistir)
  const responsables = [...new Set(esperando.map((p) => p.responsable))]

  return (
    <div className="obra">
      <header className="obra__cab">
        <span className="rotulo">La persecución</span>
        <h2 className="obra__titulo">
          {esperando.length === 0
            ? 'No estás esperando nada'
            : `Esperas ${esperando.length} ${esperando.length === 1 ? 'documento' : 'documentos'}`}
        </h2>
        <p className="obra__resumen">
          Lo que ya has pedido y todavía no ha llegado, de toda la cartera y por
          orden de lo que lleva más tiempo esperando. Un requisito entra aquí en cuanto
          lo pones en curso.
        </p>

        {responsables.length > 1 && (
          <div className="filtros">
            <button
              className={`filtro${filtro === '' ? ' es-activo' : ''}`}
              onClick={() => setFiltro('')}
            >
              Todos
            </button>
            {responsables.map((r) => (
              <button
                key={r}
                className={`filtro${filtro === r ? ' es-activo' : ''}`}
                onClick={() => setFiltro(r)}
              >
                {r} · {esperando.filter((p) => p.responsable === r).length}
              </button>
            ))}
          </div>
        )}
      </header>

      {insistir.length > 0 && (
        <div className="aviso es-ocre">
          <span className="aviso__rotulo">Toca insistir</span>
          <span>
            {insistir.length === 1
              ? '1 documento lleva más de una semana pedido sin que hayas vuelto a preguntar.'
              : `${insistir.length} documentos llevan más de una semana pedidos sin que hayas vuelto a preguntar.`}
          </span>
        </div>
      )}

      {esperando.length === 0 ? (
        <div className="vacio">
          <p className="vacio__titulo">Nada en el aire</p>
          <p className="vacio__texto">
            Cuando pongas un requisito en curso —porque se lo has pedido a alguien— aparecerá
            aquí con la fecha, y te avisará cuando lleve una semana sin llegar.
          </p>
        </div>
      ) : (
        porCaso.map(([expedienteId, items]) => {
          const exp = expedientes.find((e) => e.id === expedienteId)
          return (
            <section key={expedienteId} className="seccion">
              <div className="seccion__cab">
                <span className="rotulo">{exp?.referencia}</span>
                <span className="dato silente">{exp?.direccion}</span>
                {exp?.fechaFirma && (
                  <span className="marca">firma {fechaCorta(exp.fechaFirma)}</span>
                )}
              </div>
              <ul className="esperas">
                {[...new Set(items.map((p) => p.responsable))].map((responsable) => (
                  <li key={responsable} className="esperas__grupo">
                    <span className="esperas__persona rotulo">
                      {exp ? personaDe(exp, responsable) : responsable}
                    </span>
                    <ul className="esperas__lista">
                      {items
                        .filter((p) => p.responsable === responsable)
                        .map((p) => (
                          <Fila
                            key={p.req.id}
                            p={p}
                            onAbrir={onAbrir}
                            onRecordar={(x) => void recordar(x)}
                          />
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}

/** El mismo material, dentro de un expediente y repartido por persona. */
export function PendientesDelCaso({
  exp,
  plantillas,
  onAbrir,
}: {
  exp: Expediente
  plantillas: Plantilla[]
  onAbrir: (reqId: string) => void
}) {
  const { actualizarRequisito, anadirTraza, avisar } = useApp()
  const grupos = useMemo(() => porPersona(exp, plantillas), [exp, plantillas])

  const pedir = async (p: Pendiente) => {
    await actualizarRequisito(exp.id, p.req.id, { estado: 'curso' })
    await anadirTraza(
      exp.id,
      `Pedido a ${personaDe(exp, p.responsable)}: ${p.req.def.nombre}.`,
      hoy()
    )
    avisar(`Apuntado que se lo has pedido a ${personaDe(exp, p.responsable).toLowerCase()}.`)
  }

  const recordar = async (p: Pendiente) => {
    await actualizarRequisito(exp.id, p.req.id, { recordado: hoy() })
    await anadirTraza(
      exp.id,
      `Recordado a ${personaDe(exp, p.responsable)}: ${p.req.def.nombre}.`,
      hoy()
    )
    avisar('Apuntado.')
  }

  if (grupos.length === 0) return null

  return (
    <section className="seccion">
      <div className="seccion__cab">
        <span className="rotulo">Quién debe qué</span>
        <span className="dato silente">
          {grupos.reduce((n, g) => n + g.items.length, 0)} sin cerrar
        </span>
      </div>

      <div className="deudas">
        {grupos.map((g) => (
          <article key={g.responsable} className="deuda">
            <header className="deuda__cab">
              <span className="deuda__persona">{g.persona}</span>
              <span className="deuda__papel rotulo">{g.responsable}</span>
              <span className="deuda__cuenta dato">{g.items.length}</span>
            </header>

            <ul className="deuda__lista">
              {g.items.map((p) => (
                <li key={p.req.id} className={`deuda__item${p.tocaInsistir ? ' es-insistir' : ''}`}>
                  <button className="deuda__que" onClick={() => onAbrir(p.req.id)}>
                    <span className="sigla">{p.req.id}</span>
                    <span>{p.req.def.nombre}</span>
                  </button>
                  <span className="deuda__estado">
                    {p.esperando === null ? (
                      <button className="btn es-plano" onClick={() => void pedir(p)}>
                        Pedir
                      </button>
                    ) : (
                      <>
                        <Espera dias={p.esperando} insistir={p.tocaInsistir} />
                        <button className="btn es-plano" onClick={() => void recordar(p)}>
                          Recordar
                        </button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
