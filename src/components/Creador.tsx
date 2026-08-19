import { useMemo, useRef, useState } from 'react'

import Hoja from './Hoja'
import { CATALOGO, BLOQUES } from '../data/catalog'
import { contextoDe, precargar } from '../lib/expediente'
import { hoy } from '../lib/format'
import { useApp } from '../contexts/app_context'
import type { Campo, Expediente, Plantilla, PlantillaDTO, TipoCampo } from '../types'

/**
 * Un campo mientras se edita: aquí todo está presente aunque esté vacío, para
 * que los `input` sean siempre controlados. Al guardar se poda lo que no vale.
 */
interface CampoEditor {
  clave: string
  etiqueta: string
  tipo: TipoCampo
  grupo: string
  requerido: boolean
  pista: string
  auto: string
  opciones: string[]
}

const TIPOS: { v: TipoCampo; n: string }[] = [
  { v: 'text', n: 'Texto' },
  { v: 'textarea', n: 'Texto largo' },
  { v: 'number', n: 'Número' },
  { v: 'money', n: 'Importe' },
  { v: 'date', n: 'Fecha' },
  { v: 'select', n: 'Lista de opciones' },
  { v: 'nif', n: 'DNI / NIE' }
]

const CUERPO_INICIAL = `# Título del documento
En {{municipio}}, a {{fecha|fecha}}.

§ Primera cláusula
Escribe aquí el texto. Inserta los campos con los botones de arriba.

> Advertencia o nota al pie del documento.`

function slug(texto: string): string {
  const base = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
  if (!base[0]) return ''
  return base
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('')
}

function campoNuevo(n: number): CampoEditor {
  return {
    clave: `campo${n}`,
    etiqueta: '',
    tipo: 'text' as TipoCampo,
    grupo: 'Datos',
    requerido: false,
    pista: '',
    auto: '',
    opciones: []
  }
}

interface CreadorProps {
  plantillaBase: Plantilla | null
  requisitoSugerido?: string
  expedienteMuestra: Expediente | null
  onGuardar: (plantilla: PlantillaDTO) => void
  onCancelar: () => void
}

export default function Creador({ plantillaBase, requisitoSugerido, expedienteMuestra, onGuardar, onCancelar }: CreadorProps) {
  const { agente } = useApp()
  const editando = Boolean(plantillaBase)

  const [meta, setMeta] = useState(() => ({
    nombre: plantillaBase?.nombre || '',
    requisito: plantillaBase?.requisito || requisitoSugerido || 'PT-05',
    descripcion: plantillaBase?.descripcion || '',
    version: plantillaBase?.version || '1.0'
  }))
  const [campos, setCampos] = useState<CampoEditor[]>(() =>
    plantillaBase
      ? plantillaBase.campos.map((c) => ({
          ...c,
          grupo: c.grupo || 'Datos',
          requerido: Boolean(c.requerido),
          pista: c.pista || '',
          opciones: c.opciones || [],
          auto: c.auto || '',
        }))
      : [
          { ...campoNuevo(1), clave: 'municipio', etiqueta: 'Municipio', grupo: 'Datos', auto: 'municipio', requerido: true },
          { ...campoNuevo(2), clave: 'fecha', etiqueta: 'Fecha del documento', tipo: 'date', grupo: 'Datos', auto: 'hoy', requerido: true }
        ]
  )
  const [cuerpo, setCuerpo] = useState(plantillaBase?.cuerpo || CUERPO_INICIAL)
  const [error, setError] = useState('')
  const cuerpoRef = useRef<HTMLTextAreaElement>(null)

  const clavesAuto = useMemo(
    () => (expedienteMuestra ? Object.keys(contextoDe(expedienteMuestra, agente)) : []),
    [expedienteMuestra, agente]
  )

  const borrador: Plantilla = useMemo(
    () => ({
      id: plantillaBase?.id || 'borrador',
      nombre: meta.nombre || 'Plantilla sin título',
      requisito: meta.requisito,
      autor: plantillaBase?.autor ?? agente?.nombre ?? null,
      version: meta.version,
      actualizada: hoy(),
      usos: plantillaBase?.usos ?? 0,
      descripcion: meta.descripcion,
      campos: campos.filter((c) => c.clave),
      cuerpo
    }),
    [plantillaBase, meta, campos, cuerpo, agente]
  )

  const valoresMuestra = useMemo(
    () => (expedienteMuestra ? precargar(borrador, expedienteMuestra, agente) : {}),
    [borrador, expedienteMuestra, agente]
  )

  const actualizarCampo = (i: number, parche: Partial<CampoEditor>) => {
    setCampos((prev) => prev.map((c, j) => (j === i ? { ...c, ...parche } : c)))
  }

  const mover = (i: number, delta: number) => {
    setCampos((prev) => {
      const j = i + delta
      if (j < 0 || j >= prev.length) return prev
      const copia = [...prev]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })
  }

  const insertarToken = (clave: string) => {
    const ta = cuerpoRef.current
    const token = `{{${clave}}}`
    if (!ta) {
      setCuerpo((c) => c + token)
      return
    }
    const ini = ta.selectionStart ?? cuerpo.length
    const fin = ta.selectionEnd ?? cuerpo.length
    const siguiente = cuerpo.slice(0, ini) + token + cuerpo.slice(fin)
    setCuerpo(siguiente)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(ini + token.length, ini + token.length)
    })
  }

  const guardar = () => {
    if (!meta.nombre.trim()) {
      setError('Ponle un nombre a la plantilla.')
      return
    }
    const utiles = campos.filter((c) => c.clave.trim() && c.etiqueta.trim())
    if (utiles.length === 0) {
      setError('Añade al menos un campo con nombre y etiqueta.')
      return
    }
    const claves = utiles.map((c) => c.clave)
    if (new Set(claves).size !== claves.length) {
      setError('Hay dos campos con la misma clave. Las claves deben ser únicas.')
      return
    }
    setError('')
    onGuardar({
      ...(plantillaBase ? { id: plantillaBase.id } : {}),
      nombre: meta.nombre.trim(),
      requisito: meta.requisito,
      descripcion: meta.descripcion.trim() || 'Plantilla creada desde el editor.',
      version: meta.version || '1.0',
      autor: plantillaBase?.autor ?? agente?.nombre ?? null,
      actualizada: hoy(),
      campos: utiles.map((c): Campo => ({
        clave: c.clave.trim(),
        etiqueta: c.etiqueta.trim(),
        tipo: c.tipo,
        grupo: c.grupo.trim() || 'Datos',
        requerido: Boolean(c.requerido),
        ...(c.pista ? { pista: c.pista } : {}),
        ...(c.auto ? { auto: c.auto } : {}),
        ...(c.tipo === 'select' ? { opciones: c.opciones.filter(Boolean) } : {})
      })),
      cuerpo
    })
  }

  return (
    <>
      <button className="volver" onClick={onCancelar}>
        ← {editando ? 'Biblioteca' : 'Volver'}
      </button>

      <header className="cabecera">
        <div>
          <span className="rotulo">{editando ? 'Editar plantilla' : 'Nueva plantilla'}</span>
          <h1 className="cabecera__titulo">{meta.nombre || 'Plantilla sin título'}</h1>
          <p className="cabecera__pie">
            Define los campos y escribe el cuerpo. La vista previa de la derecha usa el expediente{' '}
            {expedienteMuestra?.referencia ?? '—'} para enseñarte cómo queda con datos reales.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="btn es-principal" onClick={guardar}>
            Guardar plantilla
          </button>
        </div>
      </header>

      {error && (
        <div className="aviso es-sello" style={{ margin: '0 0 16px' }}>
          <span className="aviso__rotulo">Revisa</span>
          <span>{error}</span>
        </div>
      )}

      <div className="creador">
        <div className="tablero">
          <section className="tablero__seccion">
            <h3 className="grupo__titulo">Identificación</h3>
            <div className="campo-fila">
              <label className="campo-fila__etiqueta" htmlFor="plt-nombre">
                Nombre de la plantilla <span className="campo-fila__req">*</span>
              </label>
              <input
                id="plt-nombre"
                className="campo"
                value={meta.nombre}
                onChange={(e) => setMeta({ ...meta, nombre: e.target.value })}
                placeholder="Contrato de arras penitenciales"
              />
            </div>

            <div className="rejilla-2">
              <div className="campo-fila">
                <label className="campo-fila__etiqueta" htmlFor="plt-req">
                  Requisito que cubre
                </label>
                <select
                  id="plt-req"
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
              <div className="campo-fila">
                <label className="campo-fila__etiqueta" htmlFor="plt-version">
                  Versión
                </label>
                <input
                  id="plt-version"
                  className="campo"
                  value={meta.version}
                  onChange={(e) => setMeta({ ...meta, version: e.target.value })}
                />
              </div>
            </div>

            <div className="campo-fila">
              <label className="campo-fila__etiqueta" htmlFor="plt-desc">
                Para qué sirve
              </label>
              <input
                id="plt-desc"
                className="campo"
                value={meta.descripcion}
                onChange={(e) => setMeta({ ...meta, descripcion: e.target.value })}
                placeholder="Una línea que explique cuándo se usa"
              />
            </div>
          </section>

          <section className="tablero__seccion">
            <div className="seccion__cab" style={{ marginBottom: 12 }}>
              <h3 className="grupo__titulo" style={{ margin: 0, border: 0, padding: 0 }}>
                Campos ({campos.length})
              </h3>
              <button
                className="btn"
                onClick={() => setCampos((p) => [...p, campoNuevo(p.length + 1)])}
              >
                + Añadir campo
              </button>
            </div>

            {campos.map((c, i) => (
              <div key={i} className="campo-editor">
                <div className="campo-editor__cab">
                  <span className="campo-editor__idx">{String(i + 1).padStart(2, '0')}</span>
                  <code className="sigla" style={{ color: 'var(--registro)' }}>
                    {`{{${c.clave || '…'}}}`}
                  </code>
                  <div className="campo-editor__mando">
                    <button
                      className="icono-btn"
                      onClick={() => mover(i, -1)}
                      disabled={i === 0}
                      aria-label="Subir campo"
                    >
                      ↑
                    </button>
                    <button
                      className="icono-btn"
                      onClick={() => mover(i, 1)}
                      disabled={i === campos.length - 1}
                      aria-label="Bajar campo"
                    >
                      ↓
                    </button>
                    <button
                      className="icono-btn es-sello"
                      onClick={() => setCampos((p) => p.filter((_, j) => j !== i))}
                      aria-label="Eliminar campo"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="rejilla-2">
                  <div className="campo-fila">
                    <label className="campo-fila__etiqueta">Etiqueta</label>
                    <input
                      className="campo"
                      value={c.etiqueta}
                      placeholder="Precio de compraventa"
                      onChange={(e) => {
                        const etiqueta = e.target.value
                        const auto = slug(etiqueta)
                        const claveAuto = !c.etiqueta || c.clave === slug(c.etiqueta)
                        actualizarCampo(i, claveAuto && auto ? { etiqueta, clave: auto } : { etiqueta })
                      }}
                    />
                  </div>
                  <div className="campo-fila">
                    <label className="campo-fila__etiqueta">Clave del token</label>
                    <input
                      className="campo"
                      value={c.clave}
                      onChange={(e) => actualizarCampo(i, { clave: slug(e.target.value) })}
                    />
                  </div>
                  <div className="campo-fila">
                    <label className="campo-fila__etiqueta">Tipo</label>
                    <select
                      className="campo"
                      value={c.tipo}
                      onChange={(e) => actualizarCampo(i, { tipo: e.target.value as TipoCampo })}
                    >
                      {TIPOS.map((t) => (
                        <option key={t.v} value={t.v}>
                          {t.n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="campo-fila">
                    <label className="campo-fila__etiqueta">Grupo</label>
                    <input
                      className="campo"
                      value={c.grupo}
                      placeholder="Partes"
                      onChange={(e) => actualizarCampo(i, { grupo: e.target.value })}
                    />
                  </div>
                  <div className="campo-fila">
                    <label className="campo-fila__etiqueta">Se rellena solo con</label>
                    <select
                      className="campo"
                      value={c.auto}
                      onChange={(e) => actualizarCampo(i, { auto: e.target.value })}
                    >
                      <option value="">Nada, lo escribe el agente</option>
                      {clavesAuto.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="campo-fila">
                    <label className="campo-fila__etiqueta">Pista</label>
                    <input
                      className="campo"
                      value={c.pista}
                      placeholder="Texto de ayuda bajo el campo"
                      onChange={(e) => actualizarCampo(i, { pista: e.target.value })}
                    />
                  </div>
                </div>

                {c.tipo === 'select' && (
                  <div className="campo-fila" style={{ marginBottom: 0 }}>
                    <label className="campo-fila__etiqueta">Opciones, una por línea</label>
                    <textarea
                      className="campo"
                      rows={3}
                      value={c.opciones.join('\n')}
                      onChange={(e) => actualizarCampo(i, { opciones: e.target.value.split('\n') })}
                    />
                  </div>
                )}

                <label
                  className="campo-fila__etiqueta"
                  style={{ marginTop: 4, marginBottom: 0, cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={c.requerido}
                    onChange={(e) => actualizarCampo(i, { requerido: e.target.checked })}
                  />
                  Obligatorio para dar el requisito por aportado
                </label>
              </div>
            ))}
          </section>

          <section className="tablero__seccion">
            <h3 className="grupo__titulo">Cuerpo del documento</h3>
            <div className="fichas-token">
              {campos
                .filter((c) => c.clave)
                .map((c) => (
                  <button key={c.clave} className="token-btn" onClick={() => insertarToken(c.clave)}>
                    {`{{${c.clave}}}`}
                  </button>
                ))}
            </div>
            <textarea
              ref={cuerpoRef}
              className="editor-cuerpo"
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              spellCheck="false"
            />
            <p className="ayuda" style={{ marginTop: 9 }}>
              <code># </code> título · <code>§ </code> cláusula · <code>-</code> en su propia línea,
              una regla · <code>&gt; </code> nota al pie.
              <br />
              Filtros: <code>{'{{precio|eur}}'}</code> da 425.000,00 € ·{' '}
              <code>{'{{precio|letra}}'}</code> lo escribe en palabras ·{' '}
              <code>{'{{fecha|fecha}}'}</code> escribe la fecha en largo ·{' '}
              <code>{'{{nombre|may}}'}</code> pasa a mayúsculas.
            </p>
          </section>
        </div>

        <div className="creador__previa">
          <div className="seccion__cab" style={{ marginBottom: 10 }}>
            <span className="rotulo">Vista previa con {expedienteMuestra?.referencia ?? '—'}</span>
          </div>
          <Hoja plantilla={borrador} valores={valoresMuestra} expedienteId={expedienteMuestra?.id ?? ''} />
        </div>
      </div>
    </>
  )
}
