import { useEffect, useMemo, useRef, useState } from 'react'
import Sello from './Sello.jsx'
import Casilla from './Casilla.jsx'
import Hoja from './Hoja.jsx'
import Formulario from './Formulario.jsx'
import {
  resumen,
  porBloque,
  precargar,
  completitud,
  etiquetaFirma
} from '../lib/expediente.js'
import { euros, fechaCorta, fechaLarga, HOY } from '../lib/format.js'

const ROTULO_ESTADO = {
  vigente: 'Conforme',
  caduca: 'Caduca pronto',
  caducado: 'Caducado',
  curso: 'En curso',
  pendiente: 'Pendiente'
}

function ListaRequisitos({ bloques, abierto, onAbrir, conformes, total }) {
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
                    <span className="req__aviso es-sello">caducado hace {Math.abs(r.dias)} d</span>
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

function Vista({ exp, res, bloques, onAbrir }) {
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
                {r.dias < 0 ? `caducó hace ${Math.abs(r.dias)} días` : `caduca en ${r.dias} días`}
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

      <section className="seccion">
        <div className="seccion__cab">
          <span className="rotulo">Traza del expediente</span>
          <span className="dato silente">abierto {fechaCorta(exp.abierto)}</span>
        </div>
        <div className="traza">
          {exp.traza.map((t, i) => (
            <div key={i} className="traza__fila">
              <span className="traza__fecha">{fechaCorta(t.fecha)}</span>
              <span>{t.texto}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Requisito({ exp, req, plantillas, onActualizar, onCrearPlantilla }) {
  const [campoMirado, setCampoMirado] = useState(null)
  const compatibles = plantillas.filter((p) => p.requisito === req.id)
  const elegida = plantillas.find((p) => p.id === req.plantillaId) || null

  // Un requisito que ya trae plantilla pero no valores se abre con los datos
  // del expediente ya puestos: el agente solo escribe lo que falta.
  const valores = useMemo(() => {
    if (!elegida) return {}
    return Object.keys(req.valores || {}).length ? req.valores : precargar(elegida, exp, {})
  }, [elegida, req.valores, exp])

  const elegir = (plt) => {
    onActualizar(req.id, {
      plantillaId: plt.id,
      valores: precargar(plt, exp, req.valores),
      estado: req.estado === 'pendiente' ? 'curso' : undefined
    })
  }

  const cambiar = (clave, valor) => {
    onActualizar(req.id, { valores: { ...valores, [clave]: valor } })
  }

  const est = elegida ? completitud(elegida, valores) : null
  const conforme = req.estado === 'vigente'

  return (
    <div className="obra">
      <header className="obra__cab">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="sigla">{req.id}</span>
          <span className={`marca${conforme ? ' es-verde' : req.estado === 'caducado' ? ' es-sello' : req.estado === 'caduca' ? ' es-ocre' : ''}`}>
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
                    <rect x="0" y="0" width="30" height="4.5" fill="var(--registro-vapor)" />
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
              {est.requeridosListos}/{est.requeridos} obligatorios
            </span>
          </div>
          <div className="banco">
            <Hoja
              plantilla={elegida}
              valores={valores}
              expedienteId={exp.id}
              campoMirado={campoMirado}
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

      <div className="acciones">
        <span className="acciones__nota">
          {conforme
            ? `Aportado el ${fechaLarga(req.emitido)}.`
            : elegida && !est.completo
              ? est.requeridos - est.requeridosListos === 1
                ? 'Falta 1 campo obligatorio.'
                : `Faltan ${est.requeridos - est.requeridosListos} campos obligatorios.`
              : 'Marca el requisito cuando tengas el documento en el expediente.'}
        </span>

        {elegida && (
          <button
            className="btn"
            onClick={() => onActualizar(req.id, { valores: precargar(elegida, exp, {}) })}
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
            onClick={() => onActualizar(req.id, { estado: 'aportado', emitido: HOY })}
          >
            Marcar como aportado
          </button>
        )}
      </div>
    </div>
  )
}

export default function Expediente({
  exp,
  plantillas,
  abierto,
  onAbrirRequisito,
  onVolver,
  onActualizar,
  onCrearPlantilla
}) {
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

  return (
    <>
      <button className="volver" onClick={onVolver}>
        ← Expedientes
      </button>

      <header className="expcab">
        <div>
          <div className="expcab__ref">
            <span className="ficha__ref">{exp.id}</span>
            <span className="marca">{exp.fase}</span>
            {!cerrado && <span className="marca es-tinta">{etiquetaFirma(exp)}</span>}
            {exp.protocolo && <span className="marca es-verde">protocolo {exp.protocolo}</span>}
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
              <b>{exp.notaria.split(',')[0]}</b>
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
            referencia={exp.id}
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
          <section className="seccion">
            <div className="seccion__cab">
              <span className="rotulo">Traza del expediente</span>
              <span className="dato silente">
                {fechaCorta(exp.abierto)} — {fechaCorta(exp.cerrado)}
              </span>
            </div>
            <div className="traza">
              {exp.traza.map((t, i) => (
                <div key={i} className="traza__fila">
                  <span className="traza__fecha">{fechaCorta(t.fecha)}</span>
                  <span>{t.texto}</span>
                </div>
              ))}
            </div>
          </section>
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
            />
          ) : (
            <Vista exp={exp} res={res} bloques={bloques} onAbrir={onAbrirRequisito} />
          )}
        </div>
      )}
    </>
  )
}
