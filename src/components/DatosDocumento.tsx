import { useState } from 'react'

import Modal from './ui/Modal'
import { CampoTexto, CampoArea, CampoSelect } from './ui/Campos'
import { CATALOGO, POR_ID } from '../data/catalog'
import { addDays, diasHasta, fechaLarga } from '../lib/format'
import * as api from '../api'
import { ApiError } from '../api'
import { useApp } from '../contexts/app_context'
import type { Documento } from '../types'

/**
 * Los datos de un papel que ya está dentro.
 *
 * Existe sobre todo por la fecha. Al subir un documento, Timbre pone la de hoy
 * porque preguntar en ese momento sería justo el trabajo extra que se quiere
 * quitar; pero una nota simple pedida hace tres semanas caduca tres semanas
 * antes de lo que Timbre cree. Aquí se corrige en dos clics, y la caducidad se
 * recalcula sola.
 */

interface Props {
  expedienteId: string
  /** El diálogo se monta con su documento y se desmonta al cerrarse: quien lo
      usa le pone `key={documento.id}`, y así los campos arrancan de sus valores
      sin tener que sincronizarlos a mano. */
  documento: Documento
  onCerrar: () => void
  onGuardado: (documento: Documento) => void
}

/** Qué pasa con la vigencia si la fecha fuera esta. Se calcula mientras se teclea. */
function Consecuencia({ reqId, emitido }: { reqId: string; emitido: string }) {
  const def = reqId ? POR_ID[reqId] : undefined

  if (!def) {
    return (
      <p className="consecuencia es-texto">
        Sin requisito, el documento vive suelto en la carpeta del expediente.
      </p>
    )
  }
  if (!def.vigencia) {
    return (
      <p className="consecuencia es-texto">
        <b>{def.nombre}</b> no caduca: la fecha queda como dato, no como aviso.
      </p>
    )
  }
  if (!emitido) {
    return (
      <p className="consecuencia es-texto">
        <b>{def.nombre}</b> vale {def.vigencia} días desde que se emite. Sin la fecha del papel no
        se puede avisar de su caducidad.
      </p>
    )
  }

  const caduca = addDays(emitido, def.vigencia)
  const dias = diasHasta(caduca)
  return (
    <p className={`consecuencia es-texto${dias !== null && dias < 0 ? ' es-alerta' : ''}`}>
      Vale {def.vigencia} días: caduca el <b>{fechaLarga(caduca)}</b>
      {dias !== null &&
        (dias < 0 ? ` — caducó hace ${Math.abs(dias)} días.` : ` — quedan ${dias} días.`)}
    </p>
  )
}

export default function DatosDocumento({ expedienteId, documento, onCerrar, onGuardado }: Props) {
  const { avisar } = useApp()
  const [nombre, setNombre] = useState(documento.nombre)
  const [emisor, setEmisor] = useState(documento.emisor ?? '')
  const [emitido, setEmitido] = useState(documento.emitido ?? '')
  const [reqId, setReqId] = useState(documento.reqId ?? '')
  const [nota, setNota] = useState(documento.nota ?? '')
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (guardando) return
    if (!nombre.trim()) {
      avisar('El documento necesita un nombre.', 'mal')
      return
    }
    setGuardando(true)
    try {
      const guardado = await api.actualizar_documento(expedienteId, documento.id, {
        nombre: nombre.trim(),
        emisor: emisor.trim() || null,
        emitido: emitido || null,
        reqId: reqId || null,
        nota: nota.trim(),
      })
      onGuardado(guardado)
      onCerrar()
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se han podido guardar los datos.', 'mal')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      rotulo="Datos del documento"
      titulo={documento.nombre}
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn es-principal" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <CampoTexto
        id="doc-nombre"
        etiqueta="Cómo se llama"
        valor={nombre}
        onChange={setNombre}
        requerido
        pista="El nombre con el que lo buscarás dentro de un año."
      />

      <CampoTexto
        id="doc-emitido"
        etiqueta="Fecha del papel"
        tipo="date"
        valor={emitido}
        onChange={setEmitido}
        pista="La que lleva el documento, no la de hoy: de ella sale la caducidad."
      />

      <CampoSelect
        id="doc-req"
        etiqueta="Qué requisito cubre"
        valor={reqId}
        onChange={setReqId}
        vacio="Ninguno: solo está en la carpeta"
        opciones={CATALOGO.map((d) => ({ valor: d.id, texto: `${d.id} · ${d.nombre}` }))}
      />

      <Consecuencia reqId={reqId} emitido={emitido} />

      <CampoTexto
        id="doc-emisor"
        etiqueta="Quién lo emite"
        valor={emisor}
        onChange={setEmisor}
        pista={reqId && POR_ID[reqId] ? `Normalmente: ${POR_ID[reqId].emisor}.` : undefined}
      />

      <CampoArea
        id="doc-nota"
        etiqueta="Nota"
        valor={nota}
        onChange={setNota}
        filas={2}
        placeholder="Lo que haya que recordar de este papel."
      />
    </Modal>
  )
}
