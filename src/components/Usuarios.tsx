import { useEffect, useState, type FormEvent } from 'react'

import Modal from './ui/Modal'
import Confirmar, { type PeticionConfirmar } from './ui/Confirmar'
import { Apartado, CampoSelect, CampoTexto } from './ui/Campos'
import * as api from '../api'
import { ApiError } from '../api'
import { useApp } from '../contexts/app_context'
import { fechaCorta } from '../lib/format'
import type { CrearUsuarioDTO, Rol, Usuario } from '../types'

const ROLES: { valor: Rol; texto: string }[] = [
  { valor: 'agente', texto: 'Agente' },
  { valor: 'admin', texto: 'Administrador' },
]

/** Contraseña inicial legible: se le dicta al agente y él la cambia al entrar. */
function sugerirPassword(): string {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, 'x')
}

interface FichaProps {
  base: Usuario | null
  onGuardar: (datos: CrearUsuarioDTO | Partial<CrearUsuarioDTO>) => Promise<void>
  onCerrar: () => void
}

function FichaUsuario({ base, onGuardar, onCerrar }: FichaProps) {
  const [email, setEmail] = useState(base?.email ?? '')
  const [nombre, setNombre] = useState(base?.nombre ?? '')
  const [colegiado, setColegiado] = useState(base?.colegiado ?? '')
  const [telefono, setTelefono] = useState(base?.telefono ?? '')
  const [rol, setRol] = useState<Rol>(base?.rol ?? 'agente')
  const [password, setPassword] = useState(() => (base ? '' : sugerirPassword()))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (guardando) return
    setError('')

    if (!nombre.trim()) return setError('Falta el nombre.')
    if (!email.trim()) return setError('Falta el correo.')
    if (!base && password.length < 10) {
      return setError('La contraseña inicial necesita al menos 10 caracteres.')
    }

    setGuardando(true)
    try {
      await onGuardar({
        email: email.trim(),
        nombre: nombre.trim(),
        colegiado: colegiado.trim() || null,
        telefono: telefono.trim() || null,
        rol,
        ...(password ? { password } : {}),
      })
      onCerrar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se ha podido guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto
      rotulo={base ? 'Editar' : 'Alta'}
      titulo={base ? base.nombre : 'Nuevo miembro del equipo'}
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn es-principal" form="form-usuario" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : base ? 'Guardar cambios' : 'Dar de alta'}
          </button>
        </>
      }
    >
      <form id="form-usuario" onSubmit={enviar} noValidate>
        <Apartado titulo="Identidad">
          <CampoTexto id="u-nombre" etiqueta="Nombre y apellidos" requerido valor={nombre} onChange={setNombre} />
          <CampoTexto
            id="u-email" etiqueta="Correo" tipo="email" requerido autoComplete="off"
            valor={email} onChange={setEmail} pista="Es con lo que inicia sesión."
          />
          <CampoTexto id="u-colegiado" etiqueta="Número de colegiado" valor={colegiado} onChange={setColegiado} placeholder="API 04-1188" />
          <CampoTexto id="u-telefono" etiqueta="Teléfono" tipo="tel" valor={telefono} onChange={setTelefono} />
        </Apartado>

        <Apartado titulo="Acceso">
          <CampoSelect
            id="u-rol" etiqueta="Rol" valor={rol} onChange={(v) => setRol(v as Rol)}
            opciones={ROLES}
            pista="Un administrador gestiona el equipo, la marca y puede borrar expedientes."
          />
          <CampoTexto
            id="u-password"
            etiqueta={base ? 'Nueva contraseña' : 'Contraseña inicial'}
            valor={password}
            onChange={setPassword}
            autoComplete="new-password"
            requerido={!base}
            pista={
              base
                ? 'Déjalo vacío para no tocarla. Al cambiarla se cierran sus sesiones abiertas.'
                : 'Dísela y pídele que la cambie desde Ajustes al entrar.'
            }
          />
        </Apartado>

        {error && (
          <div className="aviso es-sello" style={{ marginBottom: 0 }}>
            <span className="aviso__rotulo">Revisa</span>
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  )
}

export default function Usuarios() {
  const { agente, avisar } = useApp()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [creando, setCreando] = useState(false)
  const [confirmar, setConfirmar] = useState<PeticionConfirmar | null>(null)

  // `vivo` corta las escrituras de estado si el administrador cambia de sección
  // antes de que llegue la respuesta.
  useEffect(() => {
    let vivo = true
    api
      .get_usuarios()
      .then((lista) => {
        if (!vivo) return
        setUsuarios(lista)
        setError('')
      })
      .catch((err: unknown) => {
        if (!vivo) return
        setError(err instanceof ApiError ? err.message : 'No se ha podido cargar el equipo.')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  const guardar = async (id: number | null, datos: Partial<CrearUsuarioDTO>) => {
    const guardado = id
      ? await api.actualizar_usuario(id, datos)
      : await api.crear_usuario(datos as CrearUsuarioDTO)

    setUsuarios((prev) =>
      id ? prev.map((u) => (u.id === guardado.id ? guardado : u)) : [...prev, guardado]
    )
    avisar(id ? `${guardado.nombre} actualizado.` : `${guardado.nombre} dado de alta.`)
  }

  const cambiarActivo = (u: Usuario) => {
    if (u.activo) {
      setConfirmar({
        titulo: `Dar de baja a ${u.nombre}`,
        cuerpo:
          `${u.nombre} dejará de poder entrar y se cerrarán sus sesiones abiertas. ` +
          `Sus ${u.expedientes} expedientes y sus anotaciones en la traza se conservan, ` +
          'y puedes volver a darle de alta cuando quieras.',
        accion: 'Dar de baja',
        destructiva: true,
        alConfirmar: async () => {
          try {
            const actualizado = await api.desactivar_usuario(u.id)
            setUsuarios((prev) => prev.map((x) => (x.id === u.id ? actualizado : x)))
            avisar(`${u.nombre} dado de baja.`, 'neutro')
          } catch (err) {
            avisar(err instanceof ApiError ? err.message : 'No se ha podido dar de baja.', 'mal')
            throw err
          }
        },
      })
      return
    }

    void (async () => {
      try {
        const actualizado = await api.actualizar_usuario(u.id, { activo: true })
        setUsuarios((prev) => prev.map((x) => (x.id === u.id ? actualizado : x)))
        avisar(`${u.nombre} vuelve a tener acceso.`)
      } catch (err) {
        avisar(err instanceof ApiError ? err.message : 'No se ha podido reactivar.', 'mal')
      }
    })()
  }

  return (
    <>
      <header className="portada es-simple">
        <div className="portada__texto">
          <span className="rotulo">Agencia · {agente?.agencia.nombre}</span>
          <h1 className="portada__titulo">El equipo</h1>
          <p className="portada__pie">
            Cada persona entra con su propio correo y firma sus anotaciones en la traza de los
            expedientes. Los expedientes y las plantillas son de la agencia: se ven entre todos.
          </p>
          <button className="btn es-principal" onClick={() => setCreando(true)}>
            Dar de alta
          </button>
        </div>
      </header>

      {error && (
        <div className="aviso es-sello">
          <span className="aviso__rotulo">Error</span>
          <span>{error}</span>
        </div>
      )}

      {cargando ? (
        <div className="vacio">
          <p className="vacio__titulo">Cargando el equipo…</p>
        </div>
      ) : (
        <div className="registro">
          {usuarios.map((u) => (
            <div key={u.id} className={`fila es-estatica${u.activo ? '' : ' es-cerrada'}`}>
              <span className="fila__folio dato" aria-hidden="true">
                {u.rol === 'admin' ? '★' : '·'}
              </span>

              <span className="persona__sello" aria-hidden="true">
                {u.nombre.slice(0, 1).toUpperCase()}
              </span>

              <span className="fila__cuerpo">
                <span className="fila__id">
                  <span className="fila__ref">{u.nombre}</span>
                  <span className={`marca${u.rol === 'admin' ? ' es-acento' : ''}`}>
                    {u.rol === 'admin' ? 'Administrador' : 'Agente'}
                  </span>
                  {!u.activo && <span className="marca es-sello">De baja</span>}
                  {u.id === agente?.id && <span className="marca es-tinta">Tú</span>}
                </span>
                <span className="fila__dir es-normal">{u.email}</span>
                <span className="fila__partes">
                  {u.colegiado ?? 'Sin colegiado'}
                  <span className="fila__flecha" aria-hidden="true">·</span>
                  {u.expedientes} {u.expedientes === 1 ? 'expediente' : 'expedientes'}
                  <span className="fila__flecha" aria-hidden="true">·</span>
                  {u.ultimoAcceso
                    ? `último acceso ${fechaCorta(u.ultimoAcceso.slice(0, 10))}`
                    : 'no ha entrado todavía'}
                </span>
              </span>

              <span className="fila__acciones">
                <button className="btn es-plano" onClick={() => setEditando(u)}>
                  Editar
                </button>
                <button
                  className={`btn ${u.activo ? 'es-sello' : ''}`}
                  onClick={() => cambiarActivo(u)}
                  disabled={u.id === agente?.id && u.activo}
                  title={
                    u.id === agente?.id && u.activo
                      ? 'No puedes darte de baja a ti mismo'
                      : undefined
                  }
                >
                  {u.activo ? 'Dar de baja' : 'Dar de alta'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {(creando || editando) && (
        <FichaUsuario
          base={editando}
          onGuardar={(datos) => guardar(editando?.id ?? null, datos)}
          onCerrar={() => {
            setCreando(false)
            setEditando(null)
          }}
        />
      )}

      <Confirmar peticion={confirmar} onCerrar={() => setConfirmar(null)} />
    </>
  )
}
