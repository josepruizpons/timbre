import { useMemo, useState } from 'react'

import Modal from './ui/Modal'
import Buscador, { type OpcionBuscador } from './ui/Buscador'
import { CampoSelect } from './ui/Campos'
import { DATOS_EXPEDIENTE, DATO_POR_CLAVE } from '../data/contexto'
import { claveDesde, recorte, repeticiones } from '../lib/importar/marcado'
import type { Marca } from '../lib/importar/marcado'
import type { Hallazgo, Rango } from '../lib/importar/deteccion'
import type { ContextoAuto } from '../lib/expediente'
import { applyFilter } from '../lib/format'
import type { Campo, TipoCampo } from '../types'

const TIPOS: { v: TipoCampo; n: string }[] = [
  { v: 'text', n: 'Texto' },
  { v: 'textarea', n: 'Texto largo' },
  { v: 'number', n: 'Número' },
  { v: 'money', n: 'Importe' },
  { v: 'date', n: 'Fecha' },
  { v: 'select', n: 'Lista de opciones' },
  { v: 'nif', n: 'DNI / NIE' },
]

/**
 * Los filtros que tienen sentido para cada tipo. Ofrecer «en palabras» para un
 * NIF es ruido, y el ruido en un formulario se paga leyéndolo cada vez.
 */
const FILTROS: Record<string, { v: string; n: string }[]> = {
  money: [
    { v: 'eur', n: 'En cifra' },
    { v: 'letra', n: 'En palabras' },
    { v: '', n: 'El número pelado' },
  ],
  date: [
    { v: 'fecha', n: 'En largo' },
    { v: '', n: 'Tal cual' },
  ],
  text: [
    { v: '', n: 'Tal cual' },
    { v: 'may', n: 'En mayúsculas' },
  ],
  textarea: [
    { v: '', n: 'Tal cual' },
    { v: 'may', n: 'En mayúsculas' },
  ],
}

export interface Peticion {
  /** Hallazgo propuesto, o `null` si el agente ha seleccionado a mano. */
  hallazgo: Hallazgo | null
  rango: Rango
}

interface Props {
  peticion: Peticion
  cuerpo: string
  /** Campos ya marcados, para que los recortes se lean por su nombre. */
  campos: Campo[]
  /** Claves ya usadas en esta plantilla, para no repetirlas. */
  usadas: string[]
  /** Campos de las demás plantillas de la agencia. */
  vocabulario: Campo[]
  /** Datos del expediente elegido, para enseñar cómo quedará escrito. */
  contexto: ContextoAuto | null
  onMarcar: (marca: Marca, campo: Campo) => void
  onCerrar: () => void
}

export default function DialogoVariable({
  peticion,
  cuerpo,
  campos,
  usadas,
  vocabulario,
  contexto,
  onMarcar,
  onCerrar,
}: Props) {
  const { hallazgo, rango } = peticion
  const literal = rango.literal

  // Un solo estado para el nombre. `origen` dice si ese nombre corresponde a un
  // dato conocido —del expediente o de otra plantilla— o es uno nuevo.
  const [origen, setOrigen] = useState<string | null>(
    hallazgo?.auto ? `exp:${hallazgo.auto}` : null
  )
  const [nombre, setNombre] = useState(
    hallazgo?.auto ? (DATO_POR_CLAVE[hallazgo.auto]?.etiqueta ?? '') : (hallazgo?.etiqueta ?? '')
  )
  const [tipo, setTipo] = useState<TipoCampo>(hallazgo?.tipo ?? 'text')
  const [filtro, setFiltro] = useState(hallazgo?.filtro ?? '')
  const [error, setError] = useState('')

  const todas = useMemo(() => repeticiones(cuerpo, literal), [cuerpo, literal])
  const etiquetas = useMemo(() => new Map(campos.map((c) => [c.clave, c.etiqueta])), [campos])
  const [elegidas, setElegidas] = useState<number[]>(() => todas.map((o) => o.inicio))

  const datoExp = origen?.startsWith('exp:') ? DATO_POR_CLAVE[origen.slice(4)] : null
  const campoVoc = origen?.startsWith('voc:')
    ? vocabulario.find((c) => c.clave === origen.slice(4))
    : null
  const conocido = datoExp ?? campoVoc ?? null
  /** La clave del expediente que lo rellena, venga de donde venga. */
  const autoClave = datoExp?.clave ?? campoVoc?.auto ?? null

  const claveFinal = datoExp?.clave ?? campoVoc?.clave ?? claveDesde(nombre)
  const tipoFinal = datoExp?.tipo ?? campoVoc?.tipo ?? tipo

  const opciones: OpcionBuscador[] = useMemo(() => {
    const libres = (clave: string) => !usadas.includes(clave) || clave === hallazgo?.auto
    return [
      ...DATOS_EXPEDIENTE.filter((d) => libres(d.clave)).map((d) => ({
        valor: `exp:${d.clave}`,
        etiqueta: d.etiqueta,
        grupo: d.grupo,
        nota: 'se rellena solo',
      })),
      ...vocabulario
        .filter((c) => libres(c.clave) && !DATO_POR_CLAVE[c.clave])
        .map((c) => ({
          valor: `voc:${c.clave}`,
          etiqueta: c.etiqueta,
          grupo: 'De tus plantillas',
        })),
    ]
  }, [usadas, vocabulario, hallazgo])

  const cambiarOrigen = (valor: string | null) => {
    setOrigen(valor)
    setError('')
    if (valor?.startsWith('exp:')) {
      const dato = DATO_POR_CLAVE[valor.slice(4)]
      setFiltro(dato?.filtro ?? '')
    } else if (valor === null) {
      setFiltro('')
    }
  }

  const filtrosUtiles = FILTROS[tipoFinal] ?? null

  /** Cómo quedará escrito de verdad, con el dato del expediente delante. */
  const vistaPrevia = useMemo(() => {
    if (!autoClave || !contexto) return null
    const bruto = contexto[autoClave]
    if (bruto === null || bruto === undefined || bruto === '') return null
    return applyFilter(bruto, filtro || undefined)
  }, [autoClave, contexto, filtro])

  const confirmar = () => {
    if (!nombre.trim() || !claveFinal) {
      setError('Ponle un nombre al dato.')
      return
    }
    // Reutilizar una clave conocida está bien —es el mismo dato—; inventarse
    // una que ya existe con otro significado, no.
    if (!conocido && usadas.includes(claveFinal)) {
      setError(`Ya hay un campo que se llama «${nombre.trim()}» en esta plantilla.`)
      return
    }
    if (elegidas.length === 0) {
      setError('Marca al menos una de las apariciones.')
      return
    }

    onMarcar(
      {
        clave: claveFinal,
        filtro: filtro || null,
        ocurrencias: todas.filter((o) => elegidas.includes(o.inicio)),
      },
      {
        clave: claveFinal,
        etiqueta: conocido ? (datoExp?.etiqueta ?? campoVoc!.etiqueta) : nombre.trim(),
        tipo: tipoFinal,
        grupo: datoExp?.grupo ?? campoVoc?.grupo ?? hallazgo?.grupo ?? 'Datos',
        // Lo que hay que teclear es obligatorio; lo que se rellena solo, no.
        requerido: !datoExp && !campoVoc?.auto,
        ...(datoExp ? { auto: datoExp.clave } : campoVoc?.auto ? { auto: campoVoc.auto } : {}),
        ...(datoExp?.opciones
          ? { opciones: datoExp.opciones }
          : campoVoc?.opciones
            ? { opciones: campoVoc.opciones }
            : {}),
      }
    )
  }

  return (
    <Modal
      abierto
      rotulo="Marcar variable"
      titulo={literal.length > 52 ? `${literal.slice(0, 52)}…` : literal}
      onCerrar={onCerrar}
      pie={
        <>
          <span className="modal__nota">
            {elegidas.length === todas.length
              ? todas.length === 1
                ? 'Aparece 1 vez'
                : `Las ${todas.length} apariciones`
              : `${elegidas.length} de ${todas.length} apariciones`}
          </span>
          <button className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn es-principal" onClick={confirmar}>
            Marcar como variable
          </button>
        </>
      }
    >
      {hallazgo && (
        <p className="dialogo__motivo">
          <span className={`marca ${hallazgo.confianza === 'alta' ? 'es-acento' : 'es-ocre'}`}>
            {hallazgo.confianza === 'alta' ? 'Seguro' : 'Puede ser'}
          </span>
          {hallazgo.motivo}
        </p>
      )}

      <Buscador
        etiqueta="Cómo se llama"
        requerido
        autoFoco={!hallazgo?.auto}
        texto={nombre}
        onTexto={setNombre}
        valor={origen}
        onValor={cambiarOrigen}
        opciones={opciones}
        placeholder="Escribe el nombre, o busca entre los datos del expediente"
        crear={(t) => `Usar «${t}» como dato nuevo`}
        error={error || undefined}
      />

      {/* Debajo va solo la consecuencia de lo elegido, nunca las dos a la vez.
          Y lo que la decide es si algo lo rellena, no de qué lista salió. */}
      <div className={`consecuencia ${autoClave ? 'es-auto' : 'es-manual'}`}>
        <span className="consecuencia__marca" aria-hidden="true">
          {autoClave ? '↺' : '✎'}
        </span>

        <div className="consecuencia__cuerpo">
          {autoClave ? (
            <>
              <p className="consecuencia__texto">
                Se rellena solo con <b>{(DATO_POR_CLAVE[autoClave]?.etiqueta ?? autoClave).toLowerCase()}</b>{' '}
                del expediente. El agente no lo teclea.
              </p>
              {vistaPrevia && (
                <p className="consecuencia__previa">
                  Quedará escrito: <b>{vistaPrevia}</b>
                </p>
              )}
            </>
          ) : (
            <p className="consecuencia__texto">
              Lo escribirá el agente al usar la plantilla, y es obligatorio.
              {campoVoc && ' Ya lo usas en otras plantillas.'}
              {claveFinal && <code className="consecuencia__token">{`{{${claveFinal}}}`}</code>}
            </p>
          )}
        </div>

        {autoClave && filtrosUtiles ? (
          <CampoSelect
            id="var-filtro"
            etiqueta="Cómo se escribe"
            valor={filtro}
            onChange={setFiltro}
            opciones={filtrosUtiles.map((f) => ({ valor: f.v, texto: f.n }))}
          />
        ) : !autoClave ? (
          <CampoSelect
            id="var-tipo"
            etiqueta="Tipo de dato"
            valor={tipoFinal}
            onChange={(v) => setTipo(v as TipoCampo)}
            opciones={TIPOS.map((t) => ({ valor: t.v, texto: t.n }))}
          />
        ) : null}
      </div>

      {todas.length > 1 && (
        <section className="apartado" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <header className="apartado__cab">
            <span className="rotulo">Aparece {todas.length} veces</span>
            <button
              className="btn es-plano"
              onClick={() =>
                setElegidas(elegidas.length === todas.length ? [] : todas.map((o) => o.inicio))
              }
            >
              {elegidas.length === todas.length ? 'Ninguna' : 'Todas'}
            </button>
          </header>
          <p className="dialogo__aviso">
            Se marcarán todas salvo las que desmarques. Cuidado con las que digan otra cosa: el
            municipio del inmueble y la ciudad de la notaría se escriben igual.
          </p>
          <ul className="repeticiones">
            {todas.map((o) => {
              const r = recorte(cuerpo, o, etiquetas)
              const puesta = elegidas.includes(o.inicio)
              return (
                <li key={o.inicio}>
                  <label className={`repeticion${puesta ? ' es-puesta' : ''}`}>
                    <input
                      type="checkbox"
                      checked={puesta}
                      onChange={(e) =>
                        setElegidas((prev) =>
                          e.target.checked
                            ? [...prev, o.inicio]
                            : prev.filter((x) => x !== o.inicio)
                        )
                      }
                    />
                    <span className="repeticion__texto">
                      {r.antes}
                      <b>{r.medio}</b>
                      {r.despues}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </Modal>
  )
}
