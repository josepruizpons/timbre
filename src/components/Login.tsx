import { useState, type FormEvent } from 'react'

import Sello from './Sello'
import { ApiError } from '../api'
import { useApp } from '../contexts/app_context'

/**
 * Puerta de la aplicación. El sello aparece a medio entintar: es el mismo
 * dispositivo que gobierna los expedientes, aquí como marca de la casa.
 */
export default function Login() {
  const { entrar } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (enviando) return
    setError('')
    setEnviando(true)
    try {
      await entrar(email.trim(), password)
    } catch (err) {
      // El backend responde 401 sin distinguir si falla el correo o la clave.
      // El 429 sí se distingue: ahí el mensaje dice cuánto hay que esperar.
      setError(
        err instanceof ApiError && err.status === 429
          ? err.message
          : 'Correo o contraseña incorrectos.'
      )
      setEnviando(false)
    }
  }

  return (
    <div className="acceso">
      <form className="acceso__caja" onSubmit={enviar}>
        <div className="acceso__marca">
          <Sello progreso={0.5} tamano={72} />
          <div>
            <span className="acceso__nombre">Timbre</span>
            <span className="acceso__sub">expedientes de compraventa</span>
          </div>
        </div>

        <div className="campo-fila">
          <label className="campo-fila__etiqueta" htmlFor="acceso-email">
            Correo
          </label>
          <input
            id="acceso-email"
            className="campo"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="campo-fila">
          <label className="campo-fila__etiqueta" htmlFor="acceso-clave">
            Contraseña
          </label>
          <input
            id="acceso-clave"
            className="campo"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="aviso es-sello" style={{ margin: 0 }}>
            <span className="aviso__rotulo">Acceso</span>
            <span>{error}</span>
          </div>
        )}

        <button className="btn es-principal acceso__btn" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="acceso__ayuda">
          Las cuentas las da de alta un administrador de tu agencia. Si has perdido la contraseña,
          pídele que te ponga una nueva desde Ajustes → Equipo.
        </p>
      </form>
    </div>
  )
}
