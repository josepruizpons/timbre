import { useRef, useState, type DragEvent, type ReactNode } from 'react'

import Confirmar, { type PeticionConfirmar } from './ui/Confirmar'
import DatosDocumento from './DatosDocumento'
import { POR_ID } from '../data/catalog'
import { diasHasta, fechaCorta } from '../lib/format'
import { descargar } from '../lib/exportar/zip'
import * as api from '../api'
import { ApiError } from '../api'
import { useApp } from '../contexts/app_context'
import type { Documentos } from '../lib/useDocumentos'
import type { Documento } from '../types'

interface Props {
  expedienteId: string
  /** La lista viene de fuera: se pide una sola vez por expediente. */
  documentos: Documentos
  /** Si viene, la carpeta se limita a un requisito y sube dentro de él. */
  reqId?: string | null
  /** Se llama tras subir o borrar, para que el expediente recargue su estado. */
  onCambio?: () => void
  compacta?: boolean
  /** Mandos que viven junto a los documentos, como descargarlos todos. */
  extra?: ReactNode
}

const ICONO: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
  'image/tiff': 'TIF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
}

/**
 * Hasta cuándo vale este papel. Sale de la fecha de emisión y de lo que dura
 * ese tipo de documento, así que aparece sin que el agente teclee nada.
 */
function Vigencia({ caduca }: { caduca: string }) {
  const dias = diasHasta(caduca)
  if (dias === null) return null
  if (dias < 0) return <span className="marca es-sello">caducado hace {Math.abs(dias)} d</span>
  if (dias <= 20) return <span className="marca es-ocre">caduca en {dias} d</span>
  return <span className="dato silente">vale hasta {fechaCorta(caduca)}</span>
}

function peso(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Los documentos de un expediente. Es lo que convierte el expediente en la
 * carpeta: aquí cabe lo que cubre un requisito y lo que no, porque en la
 * carpeta de un caso real también hay papeles sueltos.
 */
export default function Carpeta({ expedienteId, documentos, reqId = null, onCambio, compacta, extra }: Props) {
  const { avisar, esAdmin } = useApp()
  const { lista, cargando, error } = documentos
  const [encima, setEncima] = useState(false)
  const [subiendo, setSubiendo] = useState<{ nombre: string; pct: number } | null>(null)
  const [confirmar, setConfirmar] = useState<PeticionConfirmar | null>(null)
  const [editando, setEditando] = useState<Documento | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  const visibles = reqId ? lista.filter((d) => d.reqId === reqId) : lista

  const subir = async (ficheros: FileList | null) => {
    if (!ficheros?.length) return
    for (const fichero of Array.from(ficheros)) {
      setSubiendo({ nombre: fichero.name, pct: 0 })
      try {
        const documento = await api.subir_documento(
          expedienteId,
          fichero,
          { reqId, emitido: new Date().toISOString().slice(0, 10) },
          (pct) => setSubiendo({ nombre: fichero.name, pct })
        )
        documentos.anadir(documento)
        avisar(`«${documento.nombre}» guardado en el expediente.`)
        onCambio?.()
      } catch (e) {
        avisar(e instanceof ApiError ? e.message : `No se ha podido subir ${fichero.name}.`, 'mal')
      } finally {
        setSubiendo(null)
      }
    }
    if (entrada.current) entrada.current.value = ''
  }

  const bajar = async (d: Documento) => {
    try {
      const { url } = await api.url_de_descarga(expedienteId, d.id)
      descargar(url, d.nombreFichero ?? d.nombre)
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se ha podido descargar.', 'mal')
    }
  }

  const pedirBorrado = (d: Documento) =>
    setConfirmar({
      titulo: `Quitar «${d.nombre}»`,
      cuerpo:
        d.reqId
          ? `Se quita del expediente y ${d.reqId} vuelve a quedar pendiente. El fichero deja de estar accesible desde Timbre.`
          : 'Se quita de la carpeta del expediente y deja de estar accesible desde Timbre.',
      accion: 'Quitar del expediente',
      destructiva: true,
      alConfirmar: async () => {
        await api.borrar_documento(expedienteId, d.id)
        documentos.quitar(d.id)
        avisar(`«${d.nombre}» quitado.`, 'neutro')
        onCambio?.()
      },
    })

  const alSoltar = (e: DragEvent) => {
    e.preventDefault()
    setEncima(false)
    void subir(e.dataTransfer.files)
  }

  return (
    <section
      className={`carpeta${encima ? ' es-encima' : ''}${compacta ? ' es-compacta' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setEncima(true)
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={alSoltar}
    >
      <div className="seccion__cab">
        <span className="rotulo">
          {reqId ? 'Documentos de este requisito' : 'Documentos del expediente'}
        </span>
        {extra}
        <label className="btn es-plano">
          Subir
          <input
            ref={entrada}
            type="file"
            hidden
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.tif,.tiff,.doc,.docx"
            onChange={(e) => void subir(e.target.files)}
          />
        </label>
      </div>

      {error && (
        <div className="aviso es-sello" style={{ margin: '0 0 12px' }}>
          <span className="aviso__rotulo">Error</span>
          <span>{error}</span>
        </div>
      )}

      {subiendo && (
        <div className="subiendo">
          <span className="subiendo__nombre">{subiendo.nombre}</span>
          <div className="barra-progreso">
            <div className="barra-progreso__relleno" style={{ width: `${subiendo.pct}%` }} />
          </div>
          <span className="dato silente">{subiendo.pct}%</span>
        </div>
      )}

      {cargando ? (
        <p className="carpeta__vacia silente">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="carpeta__vacia silente">
          {reqId
            ? 'Todavía no hay ningún documento aquí. Arrastra el PDF o la foto del papel y el requisito se pondrá al día solo.'
            : 'La carpeta está vacía. Arrastra aquí los documentos del caso, cubran requisito o no.'}
        </p>
      ) : (
        <ul className="documentos">
          {visibles.map((d) => {
            const req = d.reqId ? POR_ID[d.reqId] : undefined
            return (
              <li key={d.id} className={`documento es-${d.origen}`}>
                <span className="documento__tipo dato" aria-hidden="true">
                  {d.origen === 'generado' ? 'DOC' : (ICONO[d.mime ?? ''] ?? 'FILE')}
                </span>

                <span className="documento__cuerpo">
                  <span className="documento__nombre">{d.nombre}</span>
                  <span className="documento__meta">
                    {d.reqId ? (
                      <span className="marca es-acento">
                        {d.reqId}
                        {req ? ` · ${req.nombre}` : ''}
                      </span>
                    ) : (
                      <span className="marca">suelto</span>
                    )}
                    {d.origen === 'generado' && <span className="marca">de plantilla</span>}
                    {d.emisor && <span className="documento__emisor">{d.emisor}</span>}
                    {d.emitido && <span className="dato silente">{fechaCorta(d.emitido)}</span>}
                    {d.caduca && <Vigencia caduca={d.caduca} />}
                    {d.tamano !== null && <span className="dato silente">{peso(d.tamano)}</span>}
                  </span>
                </span>

                <span className="documento__mandos">
                  <button className="btn es-plano" onClick={() => setEditando(d)}>
                    Datos
                  </button>
                  {d.origen === 'recibido' && (
                    <button className="btn es-plano" onClick={() => void bajar(d)}>
                      Descargar
                    </button>
                  )}
                  <button
                    className="btn es-plano es-peligro"
                    onClick={() => pedirBorrado(d)}
                    disabled={d.estado === 'firmado' && !esAdmin}
                    title={
                      d.estado === 'firmado' && !esAdmin
                        ? 'Un documento firmado solo lo quita un administrador'
                        : undefined
                    }
                  >
                    Quitar
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {encima && <div className="carpeta__diana">Suelta para guardarlo en el expediente</div>}

      {editando && (
        <DatosDocumento
          key={editando.id}
          expedienteId={expedienteId}
          documento={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(guardado) => {
            documentos.reemplazar(guardado)
            avisar(`«${guardado.nombre}» al día.`)
            // Cambiar la fecha o el requisito cambia el estado del expediente.
            onCambio?.()
          }}
        />
      )}

      <Confirmar peticion={confirmar} onCerrar={() => setConfirmar(null)} />
    </section>
  )
}
