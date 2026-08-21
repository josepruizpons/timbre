import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import Sello from './Sello'
import Casilla from './Casilla'
import Hoja from './Hoja'
import Formulario from './Formulario'
import Confirmar, { type PeticionConfirmar } from './ui/Confirmar'
import Carpeta from './Carpeta'
import { useDocumentos } from '../lib/useDocumentos'
import { imprimir } from '../lib/exportar/imprimir'
import { comoDocx, nombreDocx } from '../lib/exportar/docx'
import { comoFichero, descargar } from '../lib/exportar/zip'
import { comoCarpeta } from '../lib/exportar/expediente'
import * as api from '../api'
import type { Documentos } from '../lib/useDocumentos'
import {
  resumen,
  porBloque,
  precargar,
  completitud,
  etiquetaFirma
} from '../lib/expediente'
import type { BloqueEvaluado, ResumenExpediente } from '../lib/expediente'
import { euros, fechaCorta, fechaLarga, hoy } from '../lib/format'
import { useApp } from '../contexts/app_context'
import { ApiError } from '../api'
import type {
  ActualizarRequisitoDTO,
  EstadoExpediente,
  Expediente as ExpedienteType,
  Plantilla,
  RequisitoEvaluado,
} from '../types'

type ActualizarRequisito = (reqId: string, parche: ActualizarRequisitoDTO) => void

const ROTULO_ESTADO: Record<string, string> = {
  vigente: 'Conforme',
  caduca: 'Caduca pronto',
  caducado: 'Caducado',
  curso: 'En curso',
  pendiente: 'Pendiente'
}

interface ListaRequisitosProps {
  bloques: BloqueEvaluado[]
  abierto: string | null
  onAbrir: (id: string) => void
  conformes: number
  total: number
}

function ListaRequisitos({ bloques, abierto, onAbrir, conformes, total }: ListaRequisitosProps) {
  return (
    <nav className="lista" aria-label="Requisitos del expediente">
      <div className="lista__cab">
        <span className="rotulo">Requisitos</span>
        <span className="dato">
          {conformes} / {total}
        </span>
      </div>

      {bloques.map((b) => (
        <div key={b.sigla}>
          <div className="bloque__cab">
            <span className="sigla">{b.sigla}</span>
            <span className="bloque__nombre">{b.nombre}</span>
            <span className="bloque__cuenta">
              {b.conformes}/{b.total}
            </span>
          </div>
          {b.items.map((r) => (
            <button
              key={r.id}
              className={`req${abierto === r.id ? ' es-abierto' : ''}${
                r.estado === 'vigente' ? ' es-conforme' : ''
              }`}
              onClick={() => onAbrir(r.id)}
              aria-current={abierto === r.id ? 'true' : undefined}
            >
              <span className="req__marca">
                <Casilla estado={r.estado} />
              </span>
              <span>
                <span className="req__nombre">{r.def.nombre}</span>
                <span className="req__pie">
                  <span className="req__sigla">{r.id}</span>
                  {r.estado === 'caducado' && (
                    <span className="req__aviso es-sello">caducado hace {Math.abs(r.dias ?? 0)} d</span>
                  )}
                  {r.estado === 'caduca' && (
                    <span className="req__aviso es-ocre">caduca en {r.dias} d</span>
                  )}
                  {r.estado === 'curso' && <span className="req__aviso silente">en curso</span>}
                  {r.def.critico && r.estado === 'pendiente' && (
                    <span className="req__aviso es-sello">bloquea firma</span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
}


/**
 * La traza es el histórico del expediente y a la vez su registro de auditoría:
 * lo que escribe la aplicación al cambiar de estado queda marcado y no se borra;
 * lo que teclea el agente sí.
 */
function Traza({ exp, rango }: { exp: ExpedienteType; rango: string }) {
  const { anadirTraza, borrarTraza } = useApp()
  const [texto, setTexto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [enviando, setEnviando] = useState(false)
  const [confirmar, setConfirmar] = useState<PeticionConfirmar | null>(null)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (enviando || !texto.trim()) return
    setEnviando(true)
    try {
      await anadirTraza(exp.id, texto.trim(), fecha)
      setTexto('')
      setFecha(hoy())
    } catch {
      // El aviso lo pone el contexto; lo escrito se queda para reintentar.
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="seccion">
      <div className="seccion__cab">
        <span className="rotulo">Traza del expediente</span>
        <span className="dato silente">{rango}</span>
      </div>

      <form className="anota" onSubmit={enviar}>
        <input
          className="campo anota__fecha dato"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          aria-label="Fecha de la anotación"
        />
        <input
          className="campo anota__texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Anota lo que ha pasado: llamada, documento pedido, visita…"
          aria-label="Texto de la anotación"
          maxLength={2000}
        />
        <button className="btn es-principal" type="submit" disabled={enviando || !texto.trim()}>
          {enviando ? 'Anotando…' : 'Anotar'}
        </button>
      </form>

      {exp.traza.length === 0 ? (
        <p className="traza__vacia silente">
          Sin anotaciones todavía. Lo que escribas aquí queda fechado y firmado con tu nombre.
        </p>
      ) : (
        <div className="traza">
          {exp.traza.map((t) => (
            <div key={t.id} className={`traza__fila${t.automatica ? ' es-automatica' : ''}`}>
              <span className="traza__fecha">{fechaCorta(t.fecha)}</span>
              <span className="traza__texto">
                {t.texto}
                {t.autor && !t.automatica && <span className="traza__autor">{t.autor}</span>}
              </span>
              {t.automatica ? (
                <span className="traza__auto" title="Anotación de la aplicación">
                  auto
                </span>
              ) : (
                <button
                  className="traza__borrar"
                  aria-label="Borrar anotación"
                  title="Borrar anotación"
                  onClick={() =>
                    setConfirmar({
                      titulo: 'Borrar la anotación',
                      cuerpo: `«${t.texto}» desaparecerá de la traza del expediente. No tiene vuelta atrás.`,
                      accion: 'Borrar',
                      destructiva: true,
                      alConfirmar: () => borrarTraza(exp.id, t.id),
                    })
                  }
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Confirmar peticion={confirmar} onCerrar={() => setConfirmar(null)} />
    </section>
  )
}

/**
 * El expediente entero en un ZIP: lo que se manda a la notaría la semana antes
 * de firmar. Dentro va un índice con lo que falta, que es la parte que hoy se
 * resuelve por teléfono.
 */
function DescargarTodo({
  exp,
  res,
  plantillas,
  documentos,
}: {
  exp: ExpedienteType
  res: ResumenExpediente
  plantillas: Plantilla[]
  documentos: Documentos
}) {
  const { agente, avisar } = useApp()
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null)

  const bajar = async () => {
    if (progreso) return
    setProgreso({ hechos: 0, total: documentos.lista.length })
    try {
      const carpeta = await comoCarpeta({
        exp,
        res,
        plantillas,
        documentos: documentos.lista,
        agente,
        urlDe: async (id) => (await api.url_de_descarga(exp.id, id)).url,
        alAvanzar: (hechos, total) => setProgreso({ hechos, total }),
      })
      descargar(carpeta.blob, carpeta.nombre)
      if (carpeta.fallidos.length) {
        avisar(
          `${carpeta.fallidos.length} ${
            carpeta.fallidos.length === 1 ? 'documento no se pudo traer' : 'documentos no se pudieron traer'
          } del almacén. El índice de la carpeta dice cuáles.`,
          'mal'
        )
      } else {
        avisar(`Expediente ${exp.referencia} descargado.`)
      }
    } catch (e) {
      avisar(e instanceof ApiError ? e.message : 'No se ha podido armar la carpeta.', 'mal')
    } finally {
      setProgreso(null)
    }
  }

  return (
    <button className="btn es-plano" onClick={() => void bajar()} disabled={!!progreso}>
      {progreso
        ? `Reuniendo ${progreso.hechos}/${progreso.total}…`
        : 'Descargar todo'}
    </button>
  )
}

interface VistaProps {
  exp: ExpedienteType
  res: ResumenExpediente
  bloques: BloqueEvaluado[]
  plantillas: Plantilla[]
  onAbrir: (id: string) => void
  documentos: Documentos
  onCambioDocumentos: () => void
}

function Vista({ exp, res, bloques, plantillas, onAbrir, documentos, onCambioDocumentos }: VistaProps) {
  const alertas = res.reqs.filter((r) => r.estado === 'caducado' || r.estado === 'caduca')
  const bloqueos = res.reqs.filter(
    (r) => r.def.critico && (r.estado === 'pendiente' || r.estado === 'caducado')
  )
  const enCurso = res.reqs.filter((r) => r.estado === 'curso')
  const uno = bloqueos.length === 1

  return (
    <div className="obra">
      <header className="obra__cab">
        <span className="rotulo">Situación del expediente</span>
        <h2 className="obra__titulo">
          {res.conformes} de {res.total} requisitos conformes
        </h2>
        <p className="obra__resumen">
          Elige un requisito en la lista de la izquierda para trabajarlo: seleccionar plantilla,
          rellenar los campos y darlo por aportado.
        </p>

        <div className="obra__fichas">
          {bloques.map((b) => (
            <div key={b.sigla} className="obra__ficha es-ancho">
              <span className="rotulo">{b.nombre}</span>
              <b>
                {b.conformes}/{b.total}
              </b>
              <div className="barra-progreso" style={{ marginTop: 5 }}>
                <div
                  className="barra-progreso__relleno"
                  style={{ width: `${b.total ? (b.conformes / b.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </header>

      {bloqueos.length > 0 && (
        <div className="aviso es-sello">
          <span className="aviso__rotulo">Bloquea</span>
          <span>
            {uno
              ? '1 requisito crítico sin aportar. Sin él el notario no puede autorizar la escritura: '
              : `${bloqueos.length} requisitos críticos sin aportar. Sin ellos el notario no puede autorizar la escritura: `}
            {bloqueos.slice(0, 3).map((r, i) => (
              <span key={r.id}>
                {i > 0 && ', '}
                <button className="btn es-plano" style={{ padding: 0 }} onClick={() => onAbrir(r.id)}>
                  {r.id}
                </button>
              </span>
            ))}
            {bloqueos.length > 3 && ` y ${bloqueos.length - 3} más`}.
          </span>
        </div>
      )}

      {alertas.length > 0 && (
        <div className="aviso">
          <span className="aviso__rotulo">Vigencia</span>
          <span>
            {alertas.map((r, i) => (
              <span key={r.id}>
                {i > 0 && ' · '}
                <button className="btn es-plano" style={{ padding: 0 }} onClick={() => onAbrir(r.id)}>
                  {r.id}
                </button>{' '}
                {r.def.nombre.toLowerCase()}{' '}
                {(r.dias ?? 0) < 0
                  ? `caducó hace ${Math.abs(r.dias ?? 0)} días`
                  : `caduca en ${r.dias} días`}
              </span>
            ))}
          </span>
        </div>
      )}

      {enCurso.length > 0 && (
        <div className="aviso es-neutro">
          <span className="aviso__rotulo">En curso</span>
          <span>
            {enCurso.map((r, i) => (
              <span key={r.id}>
                {i > 0 && ' · '}
                <button className="btn es-plano" style={{ padding: 0 }} onClick={() => onAbrir(r.id)}>
                  {r.id}
                </button>{' '}
                {r.def.nombre.toLowerCase()}, pedido a {r.def.emisor.toLowerCase()}
              </span>
            ))}
          </span>
        </div>
      )}

      <Carpeta
        expedienteId={exp.id}
        documentos={documentos}
        onCambio={onCambioDocumentos}
        extra={<DescargarTodo exp={exp} res={res} plantillas={plantillas} documentos={documentos} />}
      />

      <Traza exp={exp} rango={`abierto ${fechaCorta(exp.abierto)}`} />
    </div>
  )
}

interface RequisitoProps {
  exp: ExpedienteType
  req: RequisitoEvaluado
  plantillas: Plantilla[]
  onActualizar: ActualizarRequisito
  onCrearPlantilla: (reqId: string) => void
  documentos: Documentos
  onCambioDocumentos: () => void
}

function Requisito({ exp, req, plantillas, onActualizar, onCrearPlantilla, documentos, onCambioDocumentos }: RequisitoProps) {
  const { agente, avisar } = useApp()
  const [campoMirado, setCampoMirado] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const hoja = useRef<HTMLElement>(null)
  const compatibles = plantillas.filter((p) => p.requisito === req.id)
  const elegida = plantillas.find((p) => p.id === req.plantillaId) || null

  // Un requisito que ya trae plantilla pero no valores se abre con los datos
  // del expediente ya puestos: el agente solo escribe lo que falta.
  const valores = useMemo(() => {
    if (!elegida) return {}
    return Object.keys(req.valores || {}).length ? req.valores : precargar(elegida, exp, agente)
  }, [elegida, req.valores, exp, agente])

  const elegir = (plt: Plantilla) => {
    onActualizar(req.id, {
      plantillaId: plt.id,
      valores: precargar(plt, exp, agente, req.valores),
      estado: req.estado === 'pendiente' ? 'curso' : undefined
    })
  }

  const cambiar = (clave: string, valor: string) => {
    onActualizar(req.id, { valores: { ...valores, [clave]: valor } })
  }

  const est = elegida ? completitud(elegida, valores) : null

  /** El nombre con el que el documento sale al ordenador del agente. */
  const nombreSalida = () => `${req.id} ${elegida!.nombre} (${exp.referencia})`

  const enPdf = () => {
    if (hoja.current) imprimir(hoja.current, comoFichero(nombreSalida()))
  }

  const enWord = async () => {
    if (!elegida || generando) return
    setGenerando(true)
    try {
      const blob = await comoDocx({ plantilla: elegida, valores, expedienteId: exp.id })
      descargar(blob, nombreDocx(elegida, exp.referencia))
    } catch {
      avisar('No se ha podido componer el documento de Word.', 'mal')
    } finally {
      setGenerando(false)
    }
  }
  const conforme = req.estado === 'vigente'

  return (
    <div className="obra">
      <header className="obra__cab">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="sigla">{req.id}</span>
          <span className={`marca${conforme ? ' es-acento' : req.estado === 'caducado' ? ' es-sello' : req.estado === 'caduca' ? ' es-ocre' : ''}`}>
            {ROTULO_ESTADO[req.estado]}
          </span>
          {req.def.critico && <span className="marca es-tinta">Crítico</span>}
        </div>
        <h2 className="obra__titulo">{req.def.nombre}</h2>
        <p className="obra__resumen">{req.def.resumen}</p>

        <div className="obra__fichas">
          <div className="obra__ficha">
            <span className="rotulo">Lo emite</span>
            <b>{req.def.emisor}</b>
          </div>
          <div className="obra__ficha">
            <span className="rotulo">Lo aporta</span>
            <b>{req.def.responsable}</b>
          </div>
          <div className="obra__ficha">
            <span className="rotulo">Vigencia</span>
            <b>{req.def.vigencia ? `${req.def.vigencia} días` : 'No caduca'}</b>
          </div>
          <div className="obra__ficha">
            <span className="rotulo">Base legal</span>
            <b>{req.def.referencia}</b>
          </div>
          {req.emitido && (
            <div className="obra__ficha">
              <span className="rotulo">Emitido</span>
              <b>{fechaCorta(req.emitido)}</b>
            </div>
          )}
        </div>
      </header>

      {req.def.nota && (
        <div className="aviso es-neutro">
          <span className="aviso__rotulo">Nota</span>
          <span>{req.def.nota}</span>
        </div>
      )}

      {req.estado === 'caducado' && (
        <div className="aviso es-sello">
          <span className="aviso__rotulo">Caducado</span>
          <span>
            Emitido el {fechaLarga(req.emitido)}; su validez expiró el {fechaLarga(req.caduca)}. Hay
            que pedirlo de nuevo antes de la firma del {fechaCorta(exp.fechaFirma)}.
          </span>
        </div>
      )}

      {req.estado === 'caduca' && (
        <div className="aviso">
          <span className="aviso__rotulo">Caduca</span>
          <span>
            Válido hasta el {fechaLarga(req.caduca)}, dentro de {req.dias} días. La firma está
            prevista para el {fechaCorta(exp.fechaFirma)}.
          </span>
        </div>
      )}

      <section className="seccion">
        <div className="seccion__cab">
          <span className="rotulo">Plantilla</span>
          <button className="btn es-plano" onClick={() => onCrearPlantilla(req.id)}>
            + Crear plantilla
          </button>
        </div>

        {compatibles.length === 0 && !elegida ? (
          <div className="aviso es-neutro" style={{ margin: 0 }}>
            <span className="aviso__rotulo">Sin plantilla</span>
            <span>
              Este requisito no genera documento propio: se aporta el original que emite{' '}
              {req.def.emisor.toLowerCase()}. Puedes crear una plantilla si tu agencia usa un
              escrito de solicitud o acompañamiento.
            </span>
          </div>
        ) : (
          <div className="plantillas">
            {compatibles.map((p) => (
              <button
                key={p.id}
                className={`plt${elegida?.id === p.id ? ' es-elegida' : ''}`}
                onClick={() => elegir(p)}
              >
                <span className="miniatura" aria-hidden="true">
                  <svg viewBox="0 0 30 40" width="30" height="40">
                    <rect x="0" y="0" width="30" height="4.5" fill="var(--acento-vapor)" />
                    {[8, 12, 16, 20, 24, 28, 32].map((y, i) => (
                      <rect
                        key={y}
                        x="4"
                        y={y}
                        width={i % 3 === 0 ? 16 : 22}
                        height="1.4"
                        fill="var(--linea)"
                      />
                    ))}
                  </svg>
                </span>
                <span>
                  <span className="plt__nombre">{p.nombre}</span>
                  <span className="plt__meta">
                    v{p.version} · {p.campos.length} campos · {p.usos} usos
                  </span>
                </span>
              </button>
            ))}
            <button className="plt es-nueva" onClick={() => onCrearPlantilla(req.id)}>
              <span className="miniatura" aria-hidden="true" style={{ display: 'grid', placeItems: 'center', borderStyle: 'dashed' }}>
                <span style={{ color: 'var(--grafito)', fontSize: 15 }}>+</span>
              </span>
              <span>
                <span className="plt__nombre">Nueva plantilla</span>
                <span className="plt__meta">para {req.id}</span>
              </span>
            </button>
          </div>
        )}
      </section>

      {elegida && (
        <section className="seccion">
          <div className="seccion__cab">
            <span className="rotulo">Vista previa y campos</span>
            <span className="dato silente">
              {est!.requeridosListos}/{est!.requeridos} obligatorios
            </span>
            <span className="seccion__mandos">
              {/* El PDF es la hoja impresa; el .docx, la misma hoja abierta
                  para retocarla en Word antes de mandarla. */}
              <button className="btn es-plano" onClick={enPdf}>
                PDF
              </button>
              <button className="btn es-plano" onClick={() => void enWord()} disabled={generando}>
                {generando ? 'Componiendo…' : 'Word'}
              </button>
            </span>
          </div>
          <div className="banco">
            <Hoja
              plantilla={elegida}
              valores={valores}
              expedienteId={exp.id}
              campoMirado={campoMirado}
              refHoja={hoja}
            />
            <Formulario
              plantilla={elegida}
              valores={valores}
              onChange={cambiar}
              onFoco={setCampoMirado}
              onSalida={() => setCampoMirado(null)}
            />
          </div>
        </section>
      )}

      {/* Subir el papel aquí es lo que pone el requisito al día: no hay que
          acordarse de marcar nada. */}
      <Carpeta
        expedienteId={exp.id}
        documentos={documentos}
        reqId={req.id}
        onCambio={onCambioDocumentos}
        compacta
      />

      <div className="acciones">
        <span className="acciones__nota">
          {conforme
            ? `Aportado el ${fechaLarga(req.emitido)}.`
            : elegida && est && !est.completo
              ? est.requeridos - est.requeridosListos === 1
                ? 'Falta 1 campo obligatorio.'
                : `Faltan ${est.requeridos - est.requeridosListos} campos obligatorios.`
              : 'Marca el requisito cuando tengas el documento en el expediente.'}
        </span>

        {elegida && (
          <button
            className="btn"
            onClick={() => onActualizar(req.id, { valores: precargar(elegida, exp, agente) })}
          >
            Restablecer campos
          </button>
        )}

        {conforme ? (
          <button
            className="btn es-sello"
            onClick={() => onActualizar(req.id, { estado: 'pendiente', emitido: null })}
          >
            Retirar del expediente
          </button>
        ) : (
          <button
            className="btn es-principal"
            onClick={() => onActualizar(req.id, { estado: 'aportado', emitido: hoy() })}
          >
            Marcar como aportado
          </button>
        )}
      </div>
    </div>
  )
}

interface ExpedienteProps {
  exp: ExpedienteType
  plantillas: Plantilla[]
  abierto: string | null
  onAbrirRequisito: (reqId: string) => void
  onVolver: () => void
  onActualizar: ActualizarRequisito
  onCrearPlantilla: (reqId: string) => void
  onEditar: () => void
}

export default function Expediente({
  exp,
  plantillas,
  abierto,
  onAbrirRequisito,
  onVolver,
  onActualizar,
  onCrearPlantilla,
  onEditar
}: ExpedienteProps) {
  const { esAdmin, actualizarExpediente, borrarExpediente, recargarExpediente } = useApp()
  // Una sola vez por expediente: la carpeta se pinta dos veces en esta pantalla.
  const documentos = useDocumentos(exp.id)
  const [confirmar, setConfirmar] = useState<PeticionConfirmar | null>(null)
  const res = useMemo(() => resumen(exp), [exp])
  const bloques = useMemo(() => porBloque(res.reqs), [res.reqs])
  const req = res.reqs.find((r) => r.id === abierto) || null

  // El sello se estampa al alcanzar el pleno, una sola vez.
  const previo = useRef(res.progreso)
  const [estampando, setEstampando] = useState(false)
  useEffect(() => {
    if (res.progreso >= 1 && previo.current < 1) {
      setEstampando(true)
      const t = setTimeout(() => setEstampando(false), 600)
      return () => clearTimeout(t)
    }
    previo.current = res.progreso
  }, [res.progreso])

  const cerrado = exp.estado !== 'activo'

  const cambiarEstado = (estado: EstadoExpediente) => {
    const textos: Record<EstadoExpediente, PeticionConfirmar> = {
      firmado: {
        titulo: `Dar por firmado ${exp.referencia}`,
        cuerpo:
          `${exp.direccion} pasa al histórico y sus requisitos dejan de admitir cambios. ` +
          (res.bloqueos > 0
            ? `Ojo: quedan ${res.bloqueos} requisitos críticos sin aportar.`
            : 'Todos los requisitos críticos están conformes.'),
        accion: 'Dar por firmado',
        alConfirmar: () => actualizarExpediente(exp.id, { estado: 'firmado' }),
      },
      archivado: {
        titulo: `Archivar ${exp.referencia}`,
        cuerpo:
          'La operación se guarda como no cerrada. Se conserva la traza por si el inmueble ' +
          'vuelve a cartera, y puedes reabrirlo cuando quieras.',
        accion: 'Archivar',
        alConfirmar: () => actualizarExpediente(exp.id, { estado: 'archivado' }),
      },
      activo: {
        titulo: `Reabrir ${exp.referencia}`,
        cuerpo: 'El expediente vuelve a la cartera en activo y sus requisitos admiten cambios otra vez.',
        accion: 'Reabrir',
        alConfirmar: () => actualizarExpediente(exp.id, { estado: 'activo' }),
      },
    }
    setConfirmar(textos[estado])
  }

  const pedirBorrado = () =>
    setConfirmar({
      titulo: `Borrar ${exp.referencia}`,
      cuerpo:
        `Se borra ${exp.direccion} con sus ${res.total} requisitos y sus ${exp.traza.length} ` +
        'anotaciones de traza. No tiene vuelta atrás. Si lo que quieres es sacarlo de la ' +
        'cartera conservando el histórico, archívalo.',
      accion: 'Borrar el expediente',
      destructiva: true,
      alConfirmar: async () => {
        await borrarExpediente(exp.id)
        onVolver()
      },
    })

  return (
    <>
      <div className="cinta">
        <button className="volver" onClick={onVolver}>
          ← Expedientes
        </button>

        <div className="cinta__acciones">
          <button className="btn es-plano" onClick={onEditar}>
            Editar datos
          </button>
          {cerrado ? (
            <button className="btn" onClick={() => cambiarEstado('activo')}>
              Reabrir
            </button>
          ) : (
            <>
              <button className="btn" onClick={() => cambiarEstado('archivado')}>
                Archivar
              </button>
              <button className="btn es-principal" onClick={() => cambiarEstado('firmado')}>
                Dar por firmado
              </button>
            </>
          )}
          {esAdmin && (
            <button className="btn es-plano es-peligro" onClick={pedirBorrado}>
              Borrar
            </button>
          )}
        </div>
      </div>

      <header className="expcab">
        <div>
          <div className="expcab__ref">
            <span className="fila__ref">{exp.referencia}</span>
            <span className="marca">{exp.fase}</span>
            {!cerrado && <span className="marca es-tinta">{etiquetaFirma(exp)}</span>}
            {exp.protocolo && <span className="marca es-acento">protocolo {exp.protocolo}</span>}
          </div>
          <h1 className="expcab__dir">{exp.direccion}</h1>
          <p className="expcab__lugar">
            {exp.cp} {exp.municipio} · {exp.ccaa} · {exp.superficie} m² · construido en{' '}
            {exp.anioConstruccion}
          </p>

          <div className="expcab__datos">
            <div className="expcab__dato">
              <span className="rotulo">Vende</span>
              <b>{exp.vendedor}</b>
            </div>
            <div className="expcab__dato">
              <span className="rotulo">Compra</span>
              <b>{exp.comprador}</b>
            </div>
            <div className="expcab__dato">
              <span className="rotulo">Precio</span>
              <b>{euros(exp.precio)}</b>
            </div>
            <div className="expcab__dato">
              <span className="rotulo">Firma</span>
              <b>{fechaCorta(exp.fechaFirma)}</b>
            </div>
            <div className="expcab__dato es-ancho">
              <span className="rotulo">Notaría</span>
              <b>{exp.notaria?.split(',')[0] ?? '—'}</b>
            </div>
            <div className="expcab__dato es-ancho">
              <span className="rotulo">Referencia catastral</span>
              <b>{exp.refCatastral}</b>
            </div>
          </div>
        </div>

        <div className="expcab__sello">
          <Sello
            progreso={cerrado ? 1 : res.progreso}
            tamano={132}
            referencia={exp.referencia}
            lugar={exp.municipio}
            estado={exp.estado}
            estampando={estampando}
          />
          <span className="rotulo">
            {cerrado ? exp.fase : `${res.conformes} de ${res.total} conformes`}
          </span>
        </div>
      </header>

      {cerrado ? (
        <div className="obra">
          <header className="obra__cab">
            <span className="rotulo">Expediente cerrado</span>
            <h2 className="obra__titulo">
              {exp.estado === 'firmado'
                ? `Escritura otorgada el ${fechaLarga(exp.fechaFirma)}`
                : `Archivado el ${fechaLarga(exp.cerrado)}`}
            </h2>
            <p className="obra__resumen">
              {exp.estado === 'firmado'
                ? `Ante ${exp.notaria}, protocolo ${exp.protocolo}. El expediente queda en el histórico como consulta; sus documentos ya no admiten cambios.`
                : 'La operación no llegó a escriturarse. Se conserva la traza por si el inmueble vuelve a cartera.'}
            </p>
          </header>
          {/* Un expediente firmado es justo cuando hace falta llevárselo
              entero: al archivo de la agencia, o al cliente que lo pide. */}
          <Carpeta
            expedienteId={exp.id}
            documentos={documentos}
            onCambio={() => void recargarExpediente(exp.id)}
            extra={<DescargarTodo exp={exp} res={res} plantillas={plantillas} documentos={documentos} />}
          />

          <Traza
            exp={exp}
            rango={`${fechaCorta(exp.abierto)} — ${fechaCorta(exp.cerrado)}`}
          />
        </div>
      ) : (
        <div className="trabajo">
          <ListaRequisitos
            bloques={bloques}
            abierto={abierto}
            onAbrir={onAbrirRequisito}
            conformes={res.conformes}
            total={res.total}
          />

          {req ? (
            <Requisito
              exp={exp}
              req={req}
              plantillas={plantillas}
              onActualizar={onActualizar}
              onCrearPlantilla={onCrearPlantilla}
              documentos={documentos}
              onCambioDocumentos={() => void recargarExpediente(exp.id)}
            />
          ) : (
            <Vista
              exp={exp}
              res={res}
              bloques={bloques}
              plantillas={plantillas}
              onAbrir={onAbrirRequisito}
              documentos={documentos}
              onCambioDocumentos={() => void recargarExpediente(exp.id)}
            />
          )}
        </div>
      )}

      <Confirmar peticion={confirmar} onCerrar={() => setConfirmar(null)} />
    </>
  )
}
