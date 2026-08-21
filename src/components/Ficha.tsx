import { useMemo, useState } from 'react'

import { ficha, porGrupo, respaldo, type Hecho, type Observacion } from '../lib/datos'
import { fechaCorta } from '../lib/format'
import { useApp } from '../contexts/app_context'
import type { Datos } from '../lib/useDatos'
import type { Expediente } from '../types'

/**
 * La ficha de datos: cada hecho conocido del caso, su valor y su fuente.
 *
 * Es la pantalla que el agente enseña cuando alguien le pregunta algo por
 * teléfono. Hasta ahora la respuesta estaba repartida entre el formulario del
 * expediente y veinte PDF, y para saber la superficie había que abrir la nota
 * simple.
 *
 * Lo que discrepa va primero, porque es lo único de aquí que pide una decisión.
 */

function Fuente({ o, onAbrir }: { o: Observacion; onAbrir?: (documentoId: string) => void }) {
  const doc = o.dato.documentoId
  return (
    <li className={`fuente${o.dato.fuente === 'documento' ? ' es-papel' : ''}`}>
      <span className="fuente__valor">{o.dato.valor}</span>
      {doc && onAbrir ? (
        <button className="fuente__segun" onClick={() => onAbrir(doc)} title="Abrir el documento">
          {o.segun}
        </button>
      ) : (
        <span className="fuente__segun">{o.segun}</span>
      )}
      {o.dato.reqId && <span className="sigla">{o.dato.reqId}</span>}
      {/* Cuándo se leyó, no la fecha del papel: son cosas distintas y
          confundirlas haría dudar del dato. */}
      <span className="dato silente">leído {fechaCorta(o.dato.actualizado.slice(0, 10))}</span>
    </li>
  )
}

function Renglon({ h, onAbrir }: { h: Hecho; onAbrir?: (documentoId: string) => void }) {
  const [abierto, setAbierto] = useState(false)
  const fuentes = h.observaciones.length + (h.delExpediente ? 1 : 0)

  return (
    <li className={`hecho${h.discrepa ? ' es-discrepa' : ''}`}>
      <button
        className="hecho__cab"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        disabled={fuentes === 0}
      >
        <span className="hecho__etiqueta">{h.etiqueta}</span>
        <span className="hecho__valor">{h.valor || '—'}</span>
        <span className="hecho__marcas">
          {h.discrepa && <span className="marca es-sello">discrepan</span>}
          {h.observaciones.some((o) => o.dato.fuente === 'documento') ? (
            <span className="marca es-acento" title="Sale de un papel que está en la carpeta">
              con papel
            </span>
          ) : (
            <span className="marca" title="Lo escribió alguien; no hay documento que lo respalde">
              a mano
            </span>
          )}
        </span>
      </button>

      {abierto && (
        <ul className="fuentes">
          {h.delExpediente && (
            <li className="fuente">
              <span className="fuente__valor">{h.delExpediente}</span>
              <span className="fuente__segun">ficha del expediente</span>
            </li>
          )}
          {h.observaciones.map((o) => (
            <Fuente key={o.dato.id} o={o} onAbrir={onAbrir} />
          ))}
        </ul>
      )}
    </li>
  )
}

interface Props {
  exp: Expediente
  datos: Datos
  onAbrirDocumento?: (documentoId: string) => void
}

export default function Ficha({ exp, datos, onAbrirDocumento }: Props) {
  const { agente } = useApp()
  const [soloDudas, setSoloDudas] = useState(false)

  const hechos = useMemo(() => ficha(exp, datos.lista, agente), [exp, datos.lista, agente])
  const cuenta = useMemo(() => respaldo(hechos), [hechos])
  const discrepan = hechos.filter((h) => h.discrepa)
  const grupos = useMemo(
    () => porGrupo(soloDudas ? discrepan : hechos),
    [hechos, discrepan, soloDudas]
  )

  if (datos.cargando) {
    return (
      <section className="seccion">
        <div className="seccion__cab">
          <span className="rotulo">Lo que sabemos del caso</span>
        </div>
        <p className="carpeta__vacia silente">Cargando…</p>
      </section>
    )
  }

  return (
    <section className="seccion">
      <div className="seccion__cab">
        <span className="rotulo">Lo que sabemos del caso</span>
        <span className="dato silente" title="Datos que salen de un papel de la carpeta">
          {cuenta.conPapel}/{cuenta.total} con papel detrás
        </span>
        {discrepan.length > 0 && (
          <button
            className={`btn es-plano${soloDudas ? ' es-sello' : ''}`}
            onClick={() => setSoloDudas((v) => !v)}
          >
            {soloDudas
              ? 'Ver todos'
              : discrepan.length === 1
                ? 'Ver la que discrepa'
                : `Ver las ${discrepan.length} que discrepan`}
          </button>
        )}
      </div>

      {discrepan.length > 0 && !soloDudas && (
        <div className="aviso es-sello">
          <span className="aviso__rotulo">Discrepan</span>
          <span>
            {discrepan.length === 1
              ? `Dos fuentes dicen cosas distintas sobre ${discrepan[0].etiqueta.toLowerCase()}. `
              : `Dos fuentes dicen cosas distintas sobre ${discrepan.length} datos. `}
            No siempre es un error —la superficie registral y la catastral casi nunca
            coinciden—, pero conviene saberlo antes de firmar.
          </span>
        </div>
      )}

      {hechos.length === 0 ? (
        <p className="carpeta__vacia silente">
          Todavía no se sabe nada del caso. Los datos se van llenando solos según entran
          documentos en la carpeta: al subir un papel en su requisito, Timbre pregunta qué
          trae dentro.
        </p>
      ) : (
        grupos.map(({ grupo, hechos }) => (
          <div key={grupo} className="ficha__grupo">
            <span className="ficha__rotulo rotulo">{grupo}</span>
            <ul className="hechos">
              {hechos.map((h) => (
                <Renglon key={h.clave} h={h} onAbrir={onAbrirDocumento} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}
