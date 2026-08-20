import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Red de seguridad. Sin esto, un fallo al pintar deja la pantalla en blanco y el
 * agente no sabe si ha perdido lo que estaba haciendo.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Timbre se ha roto al pintar:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="acceso">
        <div className="acceso__caja">
          <span className="rotulo">Timbre</span>
          <h1 className="acceso__nombre">Algo se ha roto</h1>
          <p className="acceso__sub">
            La pantalla no ha podido pintarse. Lo que hubiera guardado sigue en el servidor: al
            recargar vuelve donde estaba.
          </p>
          <p className="dato silente" style={{ marginTop: 10 }}>
            {this.state.error.message}
          </p>
          <button
            className="btn es-principal acceso__btn"
            onClick={() => window.location.reload()}
          >
            Recargar Timbre
          </button>
        </div>
      </div>
    )
  }
}
