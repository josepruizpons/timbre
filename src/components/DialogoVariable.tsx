import { useMemo, useState } from 'react'

import Modal from './ui/Modal'
import { CampoSelect, CampoTexto } from './ui/Campos'
import { DATOS_EXPEDIENTE, DATO_POR_CLAVE } from '../data/contexto'
import { claveDesde, recorte, repeticiones } from '../lib/importar/marcado'
import type { Marca } from '../lib/importar/marcado'
import type { Hallazgo, Rango } from '../lib/importar/deteccion'
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

const FILTROS: { v: string; n: string }[] = [
  { v: '', n: 'Tal cual' },
  { v: 'eur', n: 'Importe: 425.000,00 €' },
  { v: 'letra', n: 'En palabras: CUATROCIENTOS VEINTICINCO MIL EUROS' },
  { v: 'fecha', n: 'Fecha larga: 8 de septiembre de 2026' },
  { v: 'may', n: 'En mayúsculas' },
]

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
  onMarcar: (marca: Marca, campo: Campo) => void
  onCerrar: () => void
}

export default function DialogoVariable({
  peticion,
  cuerpo,
  campos,
  usadas,
  vocabulario,
  onMarcar,
  onCerrar,
}: Props) {
  const { hallazgo, rango } = peticion
  const literal = rango.literal

  // `exp:clave` para un dato del expediente, `voc:clave` para uno del
  // vocabulario de la agencia, `nuevo` para uno que se inventa aquí.
  const [origen, setOrigen] = useState(() => {
    if (hallazgo?.auto) return `exp:${hallazgo.auto}`
    return 'nuevo'
  })
  const [etiqueta, setEtiqueta] = useState(
    () => (hallazgo && !hallazgo.auto ? hallazgo.etiqueta : '')
  )
  const [tipo, setTipo] = useState<TipoCampo>(hallazgo?.tipo ?? 'text')
  const [filtro, setFiltro] = useState(hallazgo?.filtro ?? '')
  const [error, setError] = useState('')

  const todas = useMemo(() => repeticiones(cuerpo, literal), [cuerpo, literal])
  const etiquetas = useMemo(() => new Map(campos.map((c) => [c.clave, c.etiqueta])), [campos])
  const [elegidas, setElegidas] = useState<number[]>(() => todas.map((o) => o.inicio))

  const datoExp = origen.startsWith('exp:') ? DATO_POR_CLAVE[origen.slice(4)] : null
  const campoVoc = origen.startsWith('voc:')
    ? vocabulario.find((c) => c.clave === origen.slice(4))
    : null

  const etiquetaFinal = datoExp?.etiqueta ?? campoVoc?.etiqueta ?? etiqueta.trim()
  const claveFinal = datoExp?.clave ?? campoVoc?.clave ?? claveDesde(etiqueta)
  const tipoFinal = datoExp?.tipo ?? campoVoc?.tipo ?? tipo

  const cambiarOrigen = (valor: string) => {
    setOrigen(valor)
    setError('')
    if (valor.startsWith('exp:')) {
      const dato = DATO_POR_CLAVE[valor.slice(4)]
      if (dato?.filtro) setFiltro(dato.filtro)
    }
  }

  const confirmar = () => {
    if (!claveFinal) {
      setError('Ponle un nombre al dato.')
      return
    }
    // Reutilizar una clave del expediente o del vocabulario está bien —es el
    // mismo dato—; inventarse una que ya existe con otro significado, no.
    if (origen === 'nuevo' && usadas.includes(claveFinal)) {
      setError(`Ya hay un campo que se llama «${claveFinal}» en esta plantilla.`)
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
        etiqueta: etiquetaFinal || claveFinal,
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

  const disponibles = DATOS_EXPEDIENTE.filter(
    (d) => !usadas.includes(d.clave) || d.clave === hallazgo?.auto
  )

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

      <div className="apartado__rejilla">
        <CampoSelect
          id="var-origen"
          etiqueta="¿Qué es este dato?"
          valor={origen}
          onChange={cambiarOrigen}
          pista={
            datoExp
              ? 'Se rellenará solo con los datos del expediente.'
              : 'Lo escribirá el agente al usar la plantilla.'
          }
          opciones={[
            { valor: 'nuevo', texto: 'Un dato nuevo, lo escribe el agente' },
            ...disponibles.map((d) => ({
              valor: `exp:${d.clave}`,
              texto: `Del expediente · ${d.etiqueta}`,
            })),
            ...vocabulario
              .filter((c) => !usadas.includes(c.clave) && !DATO_POR_CLAVE[c.clave])
              .map((c) => ({ valor: `voc:${c.clave}`, texto: `De tus plantillas · ${c.etiqueta}` })),
          ]}
        />

        {origen === 'nuevo' ? (
          <>
            <CampoTexto
              id="var-etiqueta"
              etiqueta="Cómo se llama"
              requerido
              valor={etiqueta}
              onChange={setEtiqueta}
              placeholder="Domicilio de notificaciones"
              pista={claveFinal ? `Token: {{${claveFinal}}}` : 'El nombre que verá el agente.'}
            />
            <CampoSelect
              id="var-tipo"
              etiqueta="Tipo de dato"
              valor={tipo}
              onChange={(v) => setTipo(v as TipoCampo)}
              opciones={TIPOS.map((t) => ({ valor: t.v, texto: t.n }))}
            />
          </>
        ) : (
          <CampoSelect
            id="var-filtro"
            etiqueta="Cómo se escribe aquí"
            valor={filtro}
            onChange={setFiltro}
            pista="El mismo dato puede ir en cifra en un sitio y en letra en otro."
            opciones={FILTROS.map((f) => ({ valor: f.v, texto: f.n }))}
          />
        )}
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

      {error && (
        <div className="aviso es-sello" style={{ marginBottom: 0 }}>
          <span className="aviso__rotulo">Revisa</span>
          <span>{error}</span>
        </div>
      )}
    </Modal>
  )
}
