import { useMemo, useState } from 'react'

import Sello from './Sello'
import { resumen, etiquetaFirma, urgenciaFirma } from '../lib/expediente'
import type { ResumenExpediente } from '../lib/expediente'
import { euros, fechaCorta, enLetras } from '../lib/format'
import type { Expediente } from '../types'

interface PanelProps {
  expedientes: Expediente[]
  onAbrir: (id: string) => void
  onNuevo: () => void
}

type Pestana = 'activos' | 'historial'

interface Tramo {
  clave: string
  rotulo: string
  n: number
}

/**
 * La regleta: una sola barra con todos los requisitos de la cartera repartidos
 * por estado. Sustituye a la fila de cifras grandes porque dice lo mismo y
 * además dice la proporción, que es lo que de verdad se mira: cuánto de la
 * cartera está conforme y cuánto está vencido.
 */
function Regleta({ tramos, total }: { tramos: Tramo[]; total: number }) {
  const vivos = tramos.filter((t) => t.n > 0)

  return (
    <figure className="regleta">
      <div className="regleta__barra" role="img" aria-label={
        vivos.map((t) => `${t.n} ${t.rotulo.toLowerCase()}`).join(', ')
      }>
        {vivos.map((t) => (
          <span
            key={t.clave}
            className={`regleta__tramo es-${t.clave}`}
            style={{ flexGrow: t.n }}
          />
        ))}
      </div>
      <figcaption className="regleta__leyenda">
        {tramos.map((t) => (
          <span key={t.clave} className={`regleta__clave${t.n === 0 ? ' es-cero' : ''}`}>
            <span className={`regleta__punto es-${t.clave}`} aria-hidden="true" />
            <b className="dato">{t.n}</b>
            {t.rotulo}
          </span>
        ))}
        <span className="regleta__total dato silente">{total} en total</span>
      </figcaption>
    </figure>
  )
}

interface FilaProps {
  folio: number
  exp: Expediente
  res: ResumenExpediente
  cerrado: boolean
  onAbrir: (id: string) => void
}

function Fila({ folio, exp, res, cerrado, onAbrir }: FilaProps) {
  const dias = urgenciaFirma(exp)
  // El filete lateral dice lo mismo que la regleta: carmín para lo que ya ha
  // caducado, ocre para lo que caducará antes de la firma.
  const clases = ['fila']
  if (cerrado) clases.push('es-cerrada')
  else if (res.caducados > 0) clases.push('es-bloqueada')
  else if (res.porCaducar > 0) clases.push('es-urgente')

  return (
    <button className={clases.join(' ')} onClick={() => onAbrir(exp.id)}>
      <span className="fila__folio dato" aria-hidden="true">
        {String(folio).padStart(2, '0')}
      </span>

      <Sello
        progreso={cerrado ? 1 : res.progreso}
        tamano={46}
        estado={exp.estado}
        referencia={exp.referencia}
      />

      <span className="fila__cuerpo">
        <span className="fila__id">
          <span className="fila__ref">{exp.referencia}</span>
          <span className="marca">{exp.fase}</span>
          {exp.protocolo && <span className="marca">protocolo {exp.protocolo}</span>}
        </span>
        <span className="fila__dir">{exp.direccion}</span>
        <span className="fila__partes">
          {exp.vendedor ?? 'Sin vendedor'}
          <span className="fila__flecha" aria-hidden="true">→</span>
          {exp.comprador ?? 'Sin comprador'}
        </span>
      </span>

      <span className="fila__derecha">
        <span className="fila__precio">{euros(exp.precio) || '—'}</span>
        <span className="fila__meta">
          {cerrado ? (
            <span className="marca">
              {exp.estado === 'firmado' ? 'firmada' : 'archivado'} {fechaCorta(exp.cerrado)}
            </span>
          ) : (
            <>
              <span className={`marca${dias !== null && dias <= 21 ? ' es-tinta' : ''}`}>
                {etiquetaFirma(exp)}
              </span>
              {res.caducados > 0 && (
                <span className="marca es-sello">
                  {res.caducados} {res.caducados === 1 ? 'caducado' : 'caducados'}
                </span>
              )}
              {res.porCaducar > 0 && (
                <span className="marca es-ocre">
                  {res.porCaducar} {res.porCaducar === 1 ? 'caduca' : 'caducan'}
                </span>
              )}
              <span className="marca es-acento">
                {res.conformes}/{res.total} conformes
              </span>
            </>
          )}
        </span>
      </span>

      <span className="fila__punta" aria-hidden="true">→</span>
    </button>
  )
}

export default function Panel({ expedientes, onAbrir, onNuevo }: PanelProps) {
  const [pestana, setPestana] = useState<Pestana>('activos')
  const [consulta, setConsulta] = useState('')

  const conResumen = useMemo(
    () => expedientes.map((exp) => ({ exp, res: resumen(exp) })),
    [expedientes]
  )

  const activos = conResumen.filter((x) => x.exp.estado === 'activo')
  const cerrados = conResumen.filter((x) => x.exp.estado !== 'activo')

  const totales = useMemo(() => {
    const suma = (f: (r: ResumenExpediente) => number) => activos.reduce((s, x) => s + f(x.res), 0)
    const total = suma((r) => r.total)
    const conformes = suma((r) => r.conformes)
    const curso = suma((r) => r.enCurso)
    const caducados = suma((r) => r.caducados)
    const porCaducar = suma((r) => r.porCaducar)
    const proxima = activos
      .map((x) => urgenciaFirma(x.exp))
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b)[0]

    return {
      total,
      proxima,
      tramos: [
        { clave: 'conforme', rotulo: 'conformes', n: conformes },
        { clave: 'curso', rotulo: 'en curso', n: curso },
        { clave: 'pendiente', rotulo: 'pendientes', n: total - conformes - curso - caducados - porCaducar },
        { clave: 'caduca', rotulo: 'caducan pronto', n: porCaducar },
        { clave: 'caducado', rotulo: 'caducados', n: caducados },
      ] as Tramo[],
    }
  }, [activos])

  const base = pestana === 'activos' ? activos : cerrados
  const q = consulta.trim().toLowerCase()
  const lista = (q
    ? base.filter(({ exp }) =>
        [exp.referencia, exp.direccion, exp.municipio, exp.vendedor, exp.comprador]
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
    : base
  ).sort((a, b) =>
    pestana === 'activos'
      ? (urgenciaFirma(a.exp) ?? 9999) - (urgenciaFirma(b.exp) ?? 9999)
      : String(b.exp.cerrado || '').localeCompare(String(a.exp.cerrado || ''))
  )

  const mes = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <>
      <header className="portada">
        <div className="portada__texto">
          <span className="rotulo">Cartera · {mes}</span>
          <h1 className="portada__titulo">
            {activos.length === 0 ? (
              'Ningún expediente en curso'
            ) : (
              <>
                {enLetras(activos.length).replace(/^./, (c) => c.toUpperCase())}{' '}
                {activos.length === 1 ? 'expediente' : 'expedientes'}
                <br />
                camino de la notaría
              </>
            )}
          </h1>
          <p className="portada__pie">
            {totales.proxima !== undefined
              ? `La firma más próxima es ${
                  totales.proxima < 0
                    ? `de hace ${Math.abs(totales.proxima)} días`
                    : totales.proxima === 0
                      ? 'hoy'
                      : `en ${totales.proxima} días`
                }. El sello de cada expediente se entinta a medida que sus requisitos quedan conformes.`
              : 'Ninguna firma tiene fecha todavía. Ponle una desde la ficha del expediente y la cartera se ordenará por urgencia.'}
          </p>
          <button className="btn es-principal" onClick={onNuevo}>
            Abrir expediente
          </button>
        </div>

        {totales.total > 0 && <Regleta tramos={totales.tramos} total={totales.total} />}
      </header>

      <div className="panel">
        <div className="filtros">
          <div className="pestanas">
            <button
              className={`pestana${pestana === 'activos' ? ' es-activa' : ''}`}
              onClick={() => setPestana('activos')}
            >
              En activo · {activos.length}
            </button>
            <button
              className={`pestana${pestana === 'historial' ? ' es-activa' : ''}`}
              onClick={() => setPestana('historial')}
            >
              Historial · {cerrados.length}
            </button>
          </div>

          <div className="busca">
            <svg className="busca__lupa" width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
              <circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path d="M9.3 9.3 L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              className="campo"
              type="search"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Buscar por referencia, dirección o cliente"
              aria-label="Buscar expedientes"
            />
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="vacio">
            {q ? (
              <>
                <p className="vacio__titulo">Sin resultados</p>
                <p className="vacio__texto">
                  Ningún expediente coincide con «{consulta}». Prueba con la referencia o el nombre
                  del cliente.
                </p>
                <button className="btn" onClick={() => setConsulta('')}>
                  Quitar la búsqueda
                </button>
              </>
            ) : pestana === 'activos' ? (
              <>
                <p className="vacio__titulo">La cartera está vacía</p>
                <p className="vacio__texto">
                  Un expediente reúne los documentos que hay que poner sobre la mesa del notario el
                  día de la firma. Abre el primero con la dirección de la vivienda.
                </p>
                <button className="btn es-principal" onClick={onNuevo}>
                  Abrir expediente
                </button>
              </>
            ) : (
              <>
                <p className="vacio__titulo">Todavía no hay histórico</p>
                <p className="vacio__texto">
                  Aquí quedan los expedientes firmados y los archivados. De momento todos siguen en
                  activo.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="registro">
            {lista.map(({ exp, res }, i) => (
              <Fila
                key={exp.id}
                folio={i + 1}
                exp={exp}
                res={res}
                cerrado={pestana !== 'activos'}
                onAbrir={onAbrir}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
