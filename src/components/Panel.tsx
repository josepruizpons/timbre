import { useMemo, useState } from 'react'

import Sello from './Sello'
import { resumen, etiquetaFirma, urgenciaFirma } from '../lib/expediente'
import type { ResumenExpediente } from '../lib/expediente'
import { euros, fechaCorta, enLetras } from '../lib/format'
import type { Expediente } from '../types'

interface FichaProps {
  exp: Expediente
  res: ResumenExpediente
  onAbrir: (id: string) => void
}

function Ficha({ exp, res, onAbrir }: FichaProps) {
  const cerrado = exp.estado !== 'activo'
  const dias = urgenciaFirma(exp)
  // El filete lateral dice lo mismo que los contadores de arriba: carmín para
  // lo que ya ha caducado, ocre para lo que caducará antes de la firma.
  const clases = ['ficha']
  if (cerrado) clases.push('es-cerrada')
  else if (res.caducados > 0) clases.push('es-bloqueada')
  else if (res.porCaducar > 0) clases.push('es-urgente')

  return (
    <button className={clases.join(' ')} onClick={() => onAbrir(exp.id)}>
      <Sello
        progreso={cerrado ? 1 : res.progreso}
        tamano={54}
        estado={exp.estado}
        referencia={exp.referencia}
      />

      <div>
        <div className="ficha__id">
          <span className="ficha__ref">{exp.referencia}</span>
          <span className="marca">{exp.fase}</span>
          {exp.protocolo && <span className="marca">protocolo {exp.protocolo}</span>}
        </div>
        <div className="ficha__dir">{exp.direccion}</div>
        <div className="ficha__partes">
          <span>{exp.vendedor}</span>
          <span className="ficha__flecha">→</span>
          <span>{exp.comprador}</span>
        </div>
      </div>

      <div className="ficha__derecha">
        <div className="ficha__precio">{euros(exp.precio)}</div>
        <div className="ficha__meta">
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
              <span className="marca es-verde">
                {res.conformes}/{res.total} conformes
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}

interface PanelProps {
  expedientes: Expediente[]
  onAbrir: (id: string) => void
}

type Pestana = 'activos' | 'historial'

export default function Panel({ expedientes, onAbrir }: PanelProps) {
  const [pestana, setPestana] = useState<Pestana>('activos')
  const [consulta, setConsulta] = useState('')

  const conResumen = useMemo(
    () => expedientes.map((exp) => ({ exp, res: resumen(exp) })),
    [expedientes]
  )

  const activos = conResumen.filter((x) => x.exp.estado === 'activo')
  const cerrados = conResumen.filter((x) => x.exp.estado !== 'activo')

  const totales = useMemo(() => {
    const pendientes = activos.reduce((s, x) => s + (x.res.total - x.res.conformes), 0)
    const porCaducar = activos.reduce((s, x) => s + x.res.porCaducar, 0)
    const caducados = activos.reduce((s, x) => s + x.res.caducados, 0)
    const proxima = activos
      .map((x) => urgenciaFirma(x.exp))
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b)[0]
    return { pendientes, porCaducar, caducados, proxima }
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

  return (
    <>
      <header className="cabecera">
        <div>
          <span className="rotulo">
            Cartera ·{' '}
            {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
          <h1 className="cabecera__titulo">
            {enLetras(activos.length).replace(/^./, (c) => c.toUpperCase())} expedientes
            <br />
            camino de la notaría
          </h1>
          <p className="cabecera__pie">
            Cada expediente reúne los documentos que hay que poner sobre la mesa del notario el día
            de la firma. El sello se entinta a medida que quedan conformes.
          </p>
        </div>

        <div className="marcadores">
          <div className="marcador">
            <span className="marcador__cifra">{totales.pendientes}</span>
            <span className="rotulo marcador__nota">requisitos por cerrar</span>
          </div>
          <div className="marcador">
            <span className={`marcador__cifra${totales.porCaducar ? ' es-alerta' : ''}`}>
              {totales.porCaducar}
            </span>
            <span className="rotulo marcador__nota">documentos que caducan</span>
          </div>
          <div className="marcador">
            <span className={`marcador__cifra${totales.caducados ? ' es-bloqueo' : ''}`}>
              {totales.caducados}
            </span>
            <span className="rotulo marcador__nota">documentos caducados</span>
          </div>
          <div className="marcador">
            <span className="marcador__cifra">{totales.proxima ?? '—'}</span>
            <span className="rotulo marcador__nota">días a la firma más próxima</span>
          </div>
        </div>
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
            <p className="vacio__titulo">Sin resultados</p>
            <p className="vacio__texto">
              Ningún expediente coincide con «{consulta}». Prueba con la referencia o el nombre del
              cliente.
            </p>
          </div>
        ) : (
          <div className="fichas">
            {lista.map(({ exp, res }) => (
              <Ficha key={exp.id} exp={exp} res={res} onAbrir={onAbrir} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
