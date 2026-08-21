import { useMemo, useState, type FormEvent } from 'react'

import Modal from './ui/Modal'
import { Apartado, CampoArea, CampoCasilla, CampoSelect, CampoTexto } from './ui/Campos'
import { CCAA, CIRCUNSTANCIAS, ESTADOS_CIVILES, FASES, requisitosDe } from '../data/catalog'
import type { Expediente, ExpedienteDTO } from '../types'

interface ExpedienteFormProps {
  abierto: boolean
  /** `null` para abrir uno nuevo. */
  base: Expediente | null
  onGuardar: (datos: ExpedienteDTO) => Promise<void>
  onCerrar: () => void
}

type Borrador = Record<string, string | boolean>

const TEXTOS = [
  'direccion', 'municipio', 'provincia', 'cp', 'refCatastral', 'fincaRegistral',
  'registro', 'vendedor', 'vendedorNif', 'comprador', 'compradorNif', 'notaria', 'protocolo',
] as const

const NUMEROS = ['superficie', 'anioConstruccion', 'precio', 'arras'] as const
const SELECTS = ['ccaa', 'fase', 'vendedorEstadoCivil', 'compradorEstadoCivil'] as const
const FECHAS = ['fechaFirma'] as const

function borradorDe(base: Expediente | null): Borrador {
  const b: Borrador = {}
  for (const k of [...TEXTOS, ...SELECTS, ...FECHAS]) {
    b[k] = (base?.[k as keyof Expediente] as string | null) ?? ''
  }
  for (const k of NUMEROS) {
    const v = base?.[k as keyof Expediente] as number | null | undefined
    b[k] = v === null || v === undefined ? '' : String(v)
  }
  for (const c of CIRCUNSTANCIAS) {
    b[c.clave] = Boolean(base?.[c.clave as keyof Expediente])
  }
  if (!base) b.fase = FASES[0]
  return b
}

/**
 * Alta y edición del expediente. Las circunstancias van al final y con su efecto
 * escrito al lado, porque son lo único del formulario que cambia la lista de
 * requisitos: el resto son datos, estas son decisiones.
 */
export default function ExpedienteForm({ abierto, base, onGuardar, onCerrar }: ExpedienteFormProps) {
  const [b, setB] = useState<Borrador>(() => borradorDe(base))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  const set = (clave: string) => (valor: string | boolean) => {
    setB((prev) => ({ ...prev, [clave]: valor }))
    setErrores((prev) => (prev[clave] ? { ...prev, [clave]: '' } : prev))
  }

  const txt = (clave: string) => String(b[clave] ?? '')

  // La cuenta de requisitos se recalcula con las casillas puestas: es la forma
  // de ver el efecto antes de guardar.
  const cuantosRequisitos = useMemo(() => {
    const simulado = {
      ...(base ?? {}),
      ccaa: txt('ccaa'),
      anioConstruccion: b.anioConstruccion ? Number(b.anioConstruccion) : null,
      ...Object.fromEntries(CIRCUNSTANCIAS.map((c) => [c.clave, Boolean(b[c.clave])])),
    } as Expediente
    return requisitosDe(simulado).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b, base])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (guardando) return

    const fallos: Record<string, string> = {}
    if (!txt('direccion').trim()) fallos.direccion = 'La dirección identifica la finca.'
    if (!txt('municipio').trim()) fallos.municipio = 'Hace falta el municipio.'
    if (!txt('ccaa')) fallos.ccaa = 'La comunidad decide qué requisitos aplican.'
    const anio = Number(b.anioConstruccion)
    if (b.anioConstruccion && (anio < 1700 || anio > new Date().getFullYear() + 5)) {
      fallos.anioConstruccion = 'Comprueba el año de construcción.'
    }
    if (Object.keys(fallos).length > 0) {
      setErrores(fallos)
      return
    }

    const datos: Record<string, unknown> = {}
    for (const k of [...TEXTOS, ...SELECTS]) datos[k] = txt(k).trim() || null
    for (const k of FECHAS) datos[k] = txt(k) || null
    for (const k of NUMEROS) datos[k] = b[k] === '' ? null : Number(b[k])
    for (const c of CIRCUNSTANCIAS) datos[c.clave] = Boolean(b[c.clave])

    setGuardando(true)
    try {
      await onGuardar(datos as ExpedienteDTO)
      onCerrar()
    } catch {
      // El contexto ya ha puesto el aviso; el formulario se queda abierto con lo
      // escrito para poder corregir.
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      ancho="ancho"
      rotulo={base ? base.referencia : 'Nuevo'}
      titulo={base ? 'Datos del expediente' : 'Abrir un expediente'}
      onCerrar={onCerrar}
      pie={
        <>
          <span className="modal__nota">
            {cuantosRequisitos} requisitos con estas circunstancias
          </span>
          <button className="btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button
            className="btn es-principal"
            form="form-expediente"
            type="submit"
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : base ? 'Guardar cambios' : 'Abrir expediente'}
          </button>
        </>
      }
    >
      <form id="form-expediente" onSubmit={enviar} noValidate>
        <Apartado titulo="La finca" nota="Lo que identifica el inmueble en el Registro y el Catastro">
          <CampoTexto
            id="exp-direccion" etiqueta="Dirección" requerido
            valor={txt('direccion')} onChange={set('direccion')} error={errores.direccion}
            placeholder="Carrer de la Mercè 14, 3r 1a"
          />
          <CampoTexto
            id="exp-municipio" etiqueta="Municipio" requerido
            valor={txt('municipio')} onChange={set('municipio')} error={errores.municipio}
          />
          <CampoTexto id="exp-provincia" etiqueta="Provincia" valor={txt('provincia')} onChange={set('provincia')} />
          <CampoTexto id="exp-cp" etiqueta="Código postal" valor={txt('cp')} onChange={set('cp')} />
          <CampoSelect
            id="exp-ccaa" etiqueta="Comunidad autónoma" requerido vacio="Elige una"
            valor={txt('ccaa')} onChange={set('ccaa')} error={errores.ccaa}
            pista="Ocho comunidades exigen cédula de habitabilidad para transmitir."
            opciones={CCAA.map((c) => ({ valor: c, texto: c }))}
          />
          <CampoTexto id="exp-catastral" etiqueta="Referencia catastral" valor={txt('refCatastral')} onChange={set('refCatastral')} />
          <CampoTexto id="exp-finca" etiqueta="Finca registral" valor={txt('fincaRegistral')} onChange={set('fincaRegistral')} />
          <CampoTexto id="exp-registro" etiqueta="Registro de la Propiedad" valor={txt('registro')} onChange={set('registro')} />
          <CampoTexto
            id="exp-superficie" etiqueta="Superficie (m²)" tipo="number" minimo={0}
            valor={txt('superficie')} onChange={set('superficie')}
          />
          <CampoTexto
            id="exp-anio" etiqueta="Año de construcción" tipo="number"
            valor={txt('anioConstruccion')} onChange={set('anioConstruccion')} error={errores.anioConstruccion}
            pista="A partir de 45 años el edificio necesita ITE."
          />
        </Apartado>

        {/* Dos bloques, no seis campos sueltos: en una compraventa hay dos
            partes y la operación va de una a la otra. La flecha es la misma que
            ordena cada fila de la cartera. */}
        <section className="apartado">
          <header className="apartado__cab">
            <span className="rotulo">Las partes</span>
            <span className="apartado__nota">Quién vende y quién compra</span>
          </header>

          <div className="partes">
            <div className="partes__lado">
              <h4 className="partes__quien rotulo">Vende</h4>
              <CampoTexto
                id="exp-vendedor" etiqueta="Nombre y apellidos"
                valor={txt('vendedor')} onChange={set('vendedor')}
                placeholder="Montserrat Solé Ribas"
              />
              <CampoTexto
                id="exp-vendedor-nif" etiqueta="NIF"
                valor={txt('vendedorNif')} onChange={set('vendedorNif')}
              />
              <CampoSelect
                id="exp-vendedor-ec" etiqueta="Estado civil" vacio="Sin especificar"
                valor={txt('vendedorEstadoCivil')} onChange={set('vendedorEstadoCivil')}
                opciones={ESTADOS_CIVILES.map((e) => ({ valor: e, texto: e }))}
              />
            </div>

            <span className="partes__flecha" aria-hidden="true">→</span>

            <div className="partes__lado">
              <h4 className="partes__quien rotulo">Compra</h4>
              <CampoTexto
                id="exp-comprador" etiqueta="Nombre y apellidos"
                valor={txt('comprador')} onChange={set('comprador')}
                placeholder="Harpreet Kaur Singh"
              />
              <CampoTexto
                id="exp-comprador-nif" etiqueta="NIF"
                valor={txt('compradorNif')} onChange={set('compradorNif')}
              />
              <CampoSelect
                id="exp-comprador-ec" etiqueta="Estado civil" vacio="Sin especificar"
                valor={txt('compradorEstadoCivil')} onChange={set('compradorEstadoCivil')}
                opciones={ESTADOS_CIVILES.map((e) => ({ valor: e, texto: e }))}
              />
            </div>
          </div>
        </section>

        <Apartado titulo="La operación">
          <CampoTexto
            id="exp-precio" etiqueta="Precio (€)" tipo="number" paso="0.01" minimo={0}
            valor={txt('precio')} onChange={set('precio')}
          />
          <CampoTexto
            id="exp-arras" etiqueta="Arras (€)" tipo="number" paso="0.01" minimo={0}
            valor={txt('arras')} onChange={set('arras')}
          />
          <CampoTexto
            id="exp-firma" etiqueta="Fecha de firma" tipo="date"
            valor={txt('fechaFirma')} onChange={set('fechaFirma')}
            pista="La cartera se ordena por esta fecha."
          />
          <CampoSelect
            id="exp-fase" etiqueta="Fase" vacio="Sin especificar"
            valor={txt('fase')} onChange={set('fase')}
            opciones={FASES.map((f) => ({ valor: f, texto: f }))}
          />
          <CampoArea id="exp-notaria" etiqueta="Notaría" filas={2} valor={txt('notaria')} onChange={set('notaria')} />
          <CampoTexto id="exp-protocolo" etiqueta="Protocolo" valor={txt('protocolo')} onChange={set('protocolo')} />
        </Apartado>

        <section className="apartado">
          <header className="apartado__cab">
            <span className="rotulo">Circunstancias</span>
            <span className="apartado__nota">
              Deciden qué requisitos entran en el expediente
            </span>
          </header>
          <div className="interruptores">
            {CIRCUNSTANCIAS.map((c) => (
              <CampoCasilla
                key={c.clave}
                id={`exp-${c.clave}`}
                etiqueta={c.etiqueta}
                pista={c.efecto}
                valor={Boolean(b[c.clave])}
                onChange={set(c.clave)}
              />
            ))}
          </div>
        </section>
      </form>
    </Modal>
  )
}
