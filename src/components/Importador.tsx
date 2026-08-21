import { useMemo, useState, type ClipboardEvent, type DragEvent } from 'react'

import HojaMarcable from './HojaMarcable'
import DialogoVariable, { type Peticion } from './DialogoVariable'
import { CampoSelect, CampoTexto } from './ui/Campos'
import { CATALOGO, BLOQUES } from '../data/catalog'
import { detectar } from '../lib/importar/deteccion'
import type { Hallazgo, Rango } from '../lib/importar/deteccion'
import { desdeDocx, desdeHtml, desdeTexto } from '../lib/importar/documento'
import type { DocumentoImportado } from '../lib/importar/documento'
import { camposDelCuerpo, campoDe, marcar, token, vocabularioDe } from '../lib/importar/marcado'
import type { Marca } from '../lib/importar/marcado'
import { hoy } from '../lib/format'
import { useApp } from '../contexts/app_context'
import type { Campo, PlantillaDTO } from '../types'

interface Props {
  requisitoSugerido?: string
  onGuardada: () => void
  onCancelar: () => void
}

const clave = (c: string, f: string | null) => `${c}|${f ?? ''}`

export default function Importador({ requisitoSugerido, onGuardada, onCancelar }: Props) {
  const { agente, expedientes, plantillas, guardarPlantilla, avisar } = useApp()

  const [cuerpo, setCuerpo] = useState('')
  const [avisos, setAvisos] = useState<string[]>([])
  const [cargando, setCargando] = useState(false)
  const [sobrevolando, setSobrevolando] = useState(false)

  const [expedienteId, setExpedienteId] = useState<string>(
    () => expedientes.find((e) => e.estado === 'activo')?.id ?? expedientes[0]?.id ?? ''
  )
  const [meta, setMeta] = useState({
    nombre: '',
    requisito: requisitoSugerido || 'PT-05',
    descripcion: '',
    version: '1.0',
  })

  /** Definición de cada campo marcado. El cuerpo manda: esto solo la recuerda. */
  const [definiciones, setDefiniciones] = useState<Map<string, Campo>>(new Map())
  /** Texto original que ocupaba cada token, para poder deshacer la marca. */
  const [literales, setLiterales] = useState<Map<string, string>>(new Map())

  const [peticion, setPeticion] = useState<Peticion | null>(null)
  const [destacado, setDestacado] = useState<string | null>(null)
  const [modoTexto, setModoTexto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const expediente = expedientes.find((e) => e.id === expedienteId) ?? null

  const hallazgos = useMemo(
    () => (cuerpo ? detectar({ cuerpo, expediente, agente }) : []),
    [cuerpo, expediente, agente]
  )

  // Los campos se deducen siempre del cuerpo: si se borra un token a mano, su
  // campo desaparece solo y no queda basura al guardar.
  const campos = useMemo(() => camposDelCuerpo(cuerpo, definiciones), [cuerpo, definiciones])
  const vocabulario = useMemo(() => vocabularioDe(plantillas), [plantillas])

  const sinAceptar = hallazgos.length
  const seguros = hallazgos.filter((h) => h.confianza === 'alta')

  // ─── Entrada del documento ────────────────────────────────────────────────

  const recibir = (doc: DocumentoImportado) => {
    if (!doc.cuerpo.trim()) {
      avisar('Ese documento ha llegado vacío. ¿Estaba en blanco?', 'mal')
      return
    }
    setDefiniciones(new Map())
    setLiterales(new Map())
    setCuerpo(doc.cuerpo)
    setAvisos(doc.avisos)
    setMeta((m) => ({ ...m, nombre: m.nombre || doc.titulo }))
  }

  const alPegar = (e: ClipboardEvent) => {
    const html = e.clipboardData.getData('text/html')
    const texto = e.clipboardData.getData('text/plain')
    if (!html && !texto) return
    e.preventDefault()
    recibir(html ? desdeHtml(html) : desdeTexto(texto))
  }

  const leerFichero = async (fichero: File | undefined) => {
    if (!fichero) return
    if (!/\.docx$/i.test(fichero.name)) {
      avisar('De momento solo se leen ficheros .docx. Si es un .doc antiguo, ábrelo y pégalo.', 'mal')
      return
    }
    setCargando(true)
    try {
      recibir(await desdeDocx(fichero))
    } catch {
      avisar('No se ha podido leer ese .docx. Ábrelo en Word y pega el contenido.', 'mal')
    } finally {
      setCargando(false)
    }
  }

  const alSoltar = (e: DragEvent) => {
    e.preventDefault()
    setSobrevolando(false)
    void leerFichero(e.dataTransfer.files[0])
  }

  // ─── Marcado ──────────────────────────────────────────────────────────────

  const aplicar = (marca: Marca, campo: Campo) => {
    setDefiniciones((prev) => new Map(prev).set(campo.clave, campo))
    setLiterales((prev) =>
      new Map(prev).set(clave(campo.clave, marca.filtro), marca.ocurrencias[0].literal)
    )
    setCuerpo((c) => marcar(c, marca))
    setPeticion(null)
  }

  /** Acepta de golpe todo lo seguro. Es el atajo que hace útil la importación. */
  const aceptarSeguros = () => {
    if (seguros.length === 0) return

    // Todas las sustituciones se hacen sobre el mismo texto y de atrás hacia
    // delante: aplicarlas de una en una invalidaría las posiciones del resto.
    const cambios: { inicio: number; fin: number; pieza: string }[] = []
    const defs = new Map(definiciones)
    const lits = new Map(literales)

    for (const h of seguros) {
      defs.set(h.clave, campoDe(h))
      lits.set(clave(h.clave, h.filtro), h.ocurrencias[0].literal)
      for (const o of h.ocurrencias) {
        cambios.push({ inicio: o.inicio, fin: o.fin, pieza: token(h.clave, h.filtro) })
      }
    }
    cambios.sort((a, b) => b.inicio - a.inicio)

    setDefiniciones(defs)
    setLiterales(lits)

    setCuerpo((c) => {
      let salida = c
      for (const cambio of cambios) {
        salida = salida.slice(0, cambio.inicio) + cambio.pieza + salida.slice(cambio.fin)
      }
      return salida
    })
    avisar(`${seguros.length} ${seguros.length === 1 ? 'variable marcada' : 'variables marcadas'}.`)
  }

  const quitarToken = (c: string) => {
    const literal =
      literales.get(clave(c, null)) ??
      [...literales.entries()].find(([k]) => k.startsWith(`${c}|`))?.[1]
    if (!literal) return
    setCuerpo((prev) =>
      prev.replace(new RegExp(`\\{\\{${c}(?:\\|[a-z]+)?\\}\\}`, 'g'), literal)
    )
  }

  // ─── Guardar ──────────────────────────────────────────────────────────────

  const guardar = async () => {
    if (!meta.nombre.trim()) {
      avisar('Ponle un nombre a la plantilla antes de guardarla.', 'mal')
      return
    }
    if (campos.length === 0) {
      avisar('Marca al menos una variable: si no, esto es un documento fijo, no una plantilla.', 'mal')
      return
    }
    setGuardando(true)
    try {
      const dto: PlantillaDTO = {
        nombre: meta.nombre.trim(),
        requisito: meta.requisito,
        descripcion: meta.descripcion.trim() || 'Importada desde un documento de la agencia.',
        version: meta.version || '1.0',
        autor: agente?.nombre ?? null,
        actualizada: hoy(),
        campos,
        cuerpo,
      }
      await guardarPlantilla(dto)
      onGuardada()
    } catch {
      // El aviso lo pone el contexto.
    } finally {
      setGuardando(false)
    }
  }

  // ─── Paso 1: traer el documento ───────────────────────────────────────────

  if (!cuerpo) {
    return (
      <>
        <button className="volver" onClick={onCancelar}>
          ← Plantillas
        </button>

        <header className="portada es-simple">
          <div className="portada__texto">
            <span className="rotulo">Importar · paso 1 de 2</span>
            <h1 className="portada__titulo">Trae un documento que ya uses</h1>
            <p className="portada__pie">
              Suelta un <b>.docx</b> o pega el documento desde Word. Después le dices de qué
              expediente salió y Timbre reconoce solo los datos que lleva dentro: el nombre del
              vendedor, el precio, la fecha de firma. Tú confirmas.
            </p>
          </div>
        </header>

        <div
          className={`buzon${sobrevolando ? ' es-encima' : ''}${cargando ? ' es-leyendo' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setSobrevolando(true)
          }}
          onDragLeave={() => setSobrevolando(false)}
          onDrop={alSoltar}
        >
          <svg className="buzon__icono" width="46" height="46" viewBox="0 0 46 46" fill="none"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" aria-hidden="true">
            <path d="M11 4.5h15l9 9v28h-24z" />
            <path d="M26 4.5v9h9" />
            <path d="M17 24.5h12M17 31.5h12" />
          </svg>

          <p className="buzon__titulo">
            {cargando ? 'Leyendo el documento…' : 'Arrastra aquí un .docx'}
          </p>
          <p className="buzon__o">o</p>

          <label className="btn es-principal">
            Elegir un fichero
            <input
              type="file"
              accept=".docx"
              hidden
              onChange={(e) => void leerFichero(e.target.files?.[0])}
            />
          </label>

          <textarea
            className="buzon__pegar"
            onPaste={alPegar}
            placeholder="…o pega aquí el documento (Ctrl+V)"
            aria-label="Pegar el documento"
            value=""
            onChange={() => undefined}
          />

          <p className="buzon__pie">
            Se conserva la estructura —títulos, cláusulas, párrafos— y se descarta el formato: todas
            tus plantillas saldrán con la misma cara.
          </p>
        </div>
      </>
    )
  }

  // ─── Paso 2: reconocer y marcar ───────────────────────────────────────────

  return (
    <>
      <div className="cinta">
        <button className="volver" onClick={onCancelar}>
          ← Plantillas
        </button>
        <div className="cinta__acciones">
          <button className="btn es-plano" onClick={() => setModoTexto((v) => !v)}>
            {modoTexto ? 'Volver a la hoja' : 'Editar el texto'}
          </button>
          <button className="btn" onClick={() => setCuerpo('')}>
            Empezar de nuevo
          </button>
          <button className="btn es-principal" onClick={() => void guardar()} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar plantilla'}
          </button>
        </div>
      </div>

      <header className="portada es-simple" style={{ paddingBottom: 16, marginBottom: 16 }}>
        <div className="portada__texto">
          <span className="rotulo">Importar · paso 2 de 2</span>
          <h1 className="portada__titulo">{meta.nombre || 'Plantilla sin título'}</h1>
          <p className="portada__pie" style={{ marginBottom: 0 }}>
            Selecciona cualquier dato del documento para convertirlo en variable. Lo subrayado son
            propuestas: púlsalo para marcarlo.
          </p>
        </div>
      </header>

      {avisos.map((a) => (
        <div key={a} className="aviso es-neutro">
          <span className="aviso__rotulo">Al importar</span>
          <span>{a}</span>
        </div>
      ))}

      <div className="creador">
        <div className="tablero">
          <section className="tablero__seccion">
            <h3 className="grupo__titulo">De qué expediente salió</h3>
            <CampoSelect
              id="imp-exp"
              etiqueta="Expediente de origen"
              valor={expedienteId}
              onChange={setExpedienteId}
              vacio="Ninguno, lo marco a mano"
              pista="Timbre busca en el texto los datos de este expediente. Cuanto más real sea el documento, más reconoce."
              opciones={expedientes.map((e) => ({
                valor: e.id,
                texto: `${e.referencia} · ${e.direccion}`,
              }))}
            />

            {sinAceptar > 0 && (
              <div className="propuestas__cab">
                <span className="dato">
                  {sinAceptar} {sinAceptar === 1 ? 'propuesta' : 'propuestas'}
                  {seguros.length > 0 && ` · ${seguros.length} ${seguros.length === 1 ? 'segura' : 'seguras'}`}
                </span>
                {seguros.length > 0 && (
                  <button className="btn es-principal es-pequeno" onClick={aceptarSeguros}>
                    Marcar las {seguros.length} seguras
                  </button>
                )}
              </div>
            )}

            {sinAceptar === 0 ? (
              <p className="propuestas__vacio silente">
                {campos.length > 0
                  ? 'No queda nada por reconocer. Si falta algo, selecciónalo en la hoja.'
                  : 'No se ha reconocido ningún dato. Elige el expediente del que salió el documento, o marca a mano en la hoja.'}
              </p>
            ) : (
              <ul className="propuestas">
                {hallazgos.map((h) => (
                  <li key={h.id}>
                    <button
                      className={`propuesta es-${h.confianza}`}
                      onMouseEnter={() => setDestacado(h.id)}
                      onMouseLeave={() => setDestacado(null)}
                      onClick={() => setPeticion({ hallazgo: h, rango: h.ocurrencias[0] })}
                    >
                      <span className="propuesta__punto" aria-hidden="true" />
                      <span className="propuesta__cuerpo">
                        <span className="propuesta__literal">{h.ocurrencias[0].literal}</span>
                        <span className="propuesta__motivo">
                          {h.motivo}
                          {h.ocurrencias.length > 1 && ` · ${h.ocurrencias.length} veces`}
                        </span>
                      </span>
                      <span className="propuesta__etiqueta">{h.etiqueta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="tablero__seccion">
            <div className="seccion__cab" style={{ marginBottom: 10 }}>
              <h3 className="grupo__titulo" style={{ margin: 0, border: 0, padding: 0 }}>
                Variables marcadas ({campos.length})
              </h3>
            </div>
            {campos.length === 0 ? (
              <p className="propuestas__vacio silente">Todavía ninguna.</p>
            ) : (
              <ul className="marcadas">
                {campos.map((c) => (
                  <li key={c.clave} className="marcada">
                    <code className="marcada__token">{`{{${c.clave}}}`}</code>
                    <span className="marcada__etiqueta">{c.etiqueta}</span>
                    {c.auto ? (
                      <span className="marca es-acento">del expediente</span>
                    ) : (
                      <span className="marca">lo escribe el agente</span>
                    )}
                    <button
                      className="icono-btn es-sello"
                      onClick={() => quitarToken(c.clave)}
                      aria-label={`Quitar ${c.etiqueta}`}
                      title="Deshacer la marca"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="tablero__seccion">
            <h3 className="grupo__titulo">Identificación</h3>
            <CampoTexto
              id="imp-nombre"
              etiqueta="Nombre de la plantilla"
              requerido
              valor={meta.nombre}
              onChange={(v) => setMeta({ ...meta, nombre: v })}
              placeholder="Contrato de arras penitenciales"
            />
            <div className="campo-fila">
              <label className="campo-fila__etiqueta" htmlFor="imp-req">
                Requisito que cubre
              </label>
              <select
                id="imp-req"
                className="campo"
                value={meta.requisito}
                onChange={(e) => setMeta({ ...meta, requisito: e.target.value })}
              >
                {BLOQUES.map((b) => (
                  <optgroup key={b.sigla} label={b.nombre}>
                    {CATALOGO.filter((r) => r.id.startsWith(b.sigla)).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} · {r.nombre}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <CampoTexto
              id="imp-desc"
              etiqueta="Para qué sirve"
              valor={meta.descripcion}
              onChange={(v) => setMeta({ ...meta, descripcion: v })}
              placeholder="Una línea que explique cuándo se usa"
            />
          </section>
        </div>

        <div className="creador__previa">
          <div className="seccion__cab" style={{ marginBottom: 10 }}>
            <span className="rotulo">
              {modoTexto ? 'Texto del documento' : 'Selecciona para marcar'}
            </span>
            {!modoTexto && <span className="dato silente">{campos.length} variables</span>}
          </div>

          {modoTexto ? (
            <textarea
              className="editor-cuerpo"
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              spellCheck="false"
            />
          ) : (
            <article className="hoja">
              <div className="hoja__cuerpo">
                <HojaMarcable
                  cuerpo={cuerpo}
                  hallazgos={hallazgos}
                  destacado={destacado}
                  campos={campos}
                  onSeleccionar={(rango: Rango) => setPeticion({ hallazgo: null, rango })}
                  onHallazgo={(h: Hallazgo) => setPeticion({ hallazgo: h, rango: h.ocurrencias[0] })}
                  onQuitarToken={quitarToken}
                />
              </div>
            </article>
          )}
        </div>
      </div>

      {peticion && (
        <DialogoVariable
          peticion={peticion}
          cuerpo={cuerpo}
          campos={campos}
          usadas={campos.map((c) => c.clave)}
          vocabulario={vocabulario}
          onMarcar={aplicar}
          onCerrar={() => setPeticion(null)}
        />
      )}
    </>
  )
}
