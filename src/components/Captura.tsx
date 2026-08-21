import { useEffect, useMemo, useState } from 'react'

import Modal from './ui/Modal'
import { CampoTexto, CampoArea, CampoSelect } from './ui/Campos'
import { esquemaDe } from '../data/esquemas'
import { POR_ID } from '../data/catalog'
import { contextoDe } from '../lib/expediente'
import { mismoValor } from '../lib/datos'
import * as api from '../api'
import { ApiError } from '../api'
import { useApp } from '../contexts/app_context'
import type { DatoExpediente, Documento, Expediente, GuardarDatoDTO } from '../types'

/**
 * El agente migra el papel al sistema.
 *
 * A la izquierda el escaneo o la foto; a la derecha, los campos que ese tipo de
 * documento trae dentro. **El tipo ya se sabe por construcción**: si el papel
 * está en IN-01, es una nota simple, y no hay que clasificar nada.
 *
 * La mitad de estos campos son datos del expediente, así que rellenarlos lo
 * nutre. No es teclear dos veces: para casi todos es la primera vez que se
 * teclean, y encima quedan con el papel pegado, de modo que dentro de seis
 * meses se puede comprobar de dónde salió cada cifra.
 *
 * Cuando lo que se escribe no coincide con lo que ya tenía el expediente, no se
 * pisa nada: se avisa ahí mismo. La superficie registral y la catastral casi
 * nunca coinciden, y quien decide cuál vale es el agente, no el formulario.
 */

interface Props {
  exp: Expediente
  documento: Documento
  datos: DatoExpediente[]
  onGuardar: (datos: GuardarDatoDTO[]) => Promise<void>
  onCerrar: () => void
}

/** Lo que ya se sabe de ese campo por otro lado, para poder contrastarlo. */
function Contraste({ valor, delExpediente }: { valor: string; delExpediente: string | null }) {
  if (!delExpediente || !valor.trim()) return null
  if (mismoValor(valor, delExpediente)) {
    return <p className="contraste es-igual">Coincide con lo que ya tenía el expediente.</p>
  }
  return (
    <p className="contraste es-discrepa">
      El expediente dice <b>{delExpediente}</b>. No se pisa: quedan las dos y Timbre lo
      señalará en la ficha.
    </p>
  )
}

export default function Captura({ exp, documento, datos, onGuardar, onCerrar }: Props) {
  const { agente, avisar } = useApp()
  const [url, setUrl] = useState('')
  const [fallo, setFallo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const campos = esquemaDe(documento.reqId)
  const def = documento.reqId ? POR_ID[documento.reqId] : undefined
  const ctx = useMemo(() => contextoDe(exp, agente), [exp, agente])

  // Lo ya guardado de este papel arranca el formulario.
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const previo: Record<string, string> = {}
    for (const campo of campos) {
      previo[campo.clave] =
        datos.find((d) => d.clave === campo.clave && d.documentoId === documento.id)?.valor ?? ''
    }
    return previo
  })

  useEffect(() => {
    let vivo = true
    api
      .url_de_descarga(exp.id, documento.id, true)
      .then((r) => vivo && setUrl(r.url))
      .catch((e: unknown) => {
        if (vivo) setFallo(e instanceof ApiError ? e.message : 'No se ha podido abrir el papel.')
      })
    return () => {
      vivo = false
    }
  }, [exp.id, documento.id])

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      await onGuardar(
        campos.map((c) => ({
          clave: c.clave,
          valor: valores[c.clave] ?? '',
          documentoId: documento.id,
        }))
      )
      const puestos = campos.filter((c) => (valores[c.clave] ?? '').trim()).length
      avisar(
        puestos === 0
          ? 'Guardado.'
          : `${puestos} ${puestos === 1 ? 'dato' : 'datos'} del expediente salen ya de este papel.`
      )
      onCerrar()
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se han podido guardar los datos.', 'mal')
    } finally {
      setGuardando(false)
    }
  }

  const esImagen = (documento.mime ?? '').startsWith('image/')
  const puestos = campos.filter((c) => (valores[c.clave] ?? '').trim()).length

  return (
    <Modal
      abierto
      ancho="ancho"
      rotulo={def ? `${documento.reqId} · ${def.nombre}` : 'Documento suelto'}
      titulo={documento.nombre}
      onCerrar={onCerrar}
      pie={
        <>
          <span className="dato silente" style={{ marginRight: 'auto' }}>
            {puestos} de {campos.length} campos
          </span>
          <button className="btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn es-principal" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar lo leído'}
          </button>
        </>
      }
    >
      <div className="captura">
        <div className="captura__papel">
          {fallo ? (
            <p className="carpeta__vacia silente">{fallo}</p>
          ) : !url ? (
            <p className="carpeta__vacia silente">Abriendo el documento…</p>
          ) : esImagen ? (
            <img className="captura__imagen" src={url} alt={documento.nombre} />
          ) : (
            // Un iframe y no un visor propio: el del navegador ya sabe hacer
            // zoom, buscar texto y pasar páginas, que es justo lo que hace
            // falta para copiar una cifra de una nota simple de ocho folios.
            <iframe className="captura__visor" src={url} title={documento.nombre} />
          )}
        </div>

        <div className="captura__campos">
          {campos.length === 0 ? (
            <p className="carpeta__vacia silente">
              Todavía no hay una lista de lo que trae dentro este tipo de documento. Se puede
              guardar en la carpeta igual; lo que no se puede es leerlo hacia el expediente.
            </p>
          ) : (
            <>
              <p className="captura__guia">
                Teclea mirando el papel. Cada dato queda con este documento pegado, así que
                dentro de seis meses se sabrá de dónde salió.
              </p>

              {campos.map((campo) => {
                const valor = valores[campo.clave] ?? ''
                const cambiar = (v: string) =>
                  setValores((previos) => ({ ...previos, [campo.clave]: v }))
                const delExpediente = campo.alExpediente
                  ? ((ctx[campo.alExpediente] ?? null) === null
                      ? null
                      : String(ctx[campo.alExpediente]))
                  : null

                return (
                  <div key={campo.clave}>
                    {campo.tipo === 'textarea' ? (
                      <CampoArea
                        id={`cap-${campo.clave}`}
                        etiqueta={campo.etiqueta}
                        valor={valor}
                        onChange={cambiar}
                        filas={2}
                        pista={campo.pista}
                      />
                    ) : campo.tipo === 'select' ? (
                      <CampoSelect
                        id={`cap-${campo.clave}`}
                        etiqueta={campo.etiqueta}
                        valor={valor}
                        onChange={cambiar}
                        vacio="No consta"
                        opciones={(campo.opciones ?? []).map((o) => ({ valor: o, texto: o }))}
                        pista={campo.pista}
                      />
                    ) : (
                      <CampoTexto
                        id={`cap-${campo.clave}`}
                        etiqueta={campo.etiqueta}
                        valor={valor}
                        onChange={cambiar}
                        tipo={campo.tipo === 'date' ? 'date' : campo.tipo === 'number' || campo.tipo === 'money' ? 'number' : 'text'}
                        pista={campo.pista}
                      />
                    )}
                    {campo.alExpediente && (
                      <Contraste valor={valor} delExpediente={delExpediente} />
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
