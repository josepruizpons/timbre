import { useEffect, useState, type FormEvent } from 'react'

import Sello from './Sello'
import { Apartado, CampoTexto } from './ui/Campos'
import * as api from '../api'
import { ApiError } from '../api'
import { useApp } from '../contexts/app_context'
import { ACENTOS_SUGERIDOS, aplicarMarca, iniciales, paletaDe } from '../lib/marca'

function Perfil() {
  const { agente, avisar, refrescarPerfil } = useApp()
  const [nombre, setNombre] = useState(agente?.nombre ?? '')
  const [colegiado, setColegiado] = useState(agente?.colegiado ?? '')
  const [telefono, setTelefono] = useState(agente?.telefono ?? '')
  const [guardando, setGuardando] = useState(false)

  const sucio =
    nombre !== (agente?.nombre ?? '') ||
    colegiado !== (agente?.colegiado ?? '') ||
    telefono !== (agente?.telefono ?? '')

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (guardando || !sucio) return
    setGuardando(true)
    try {
      await api.actualizar_perfil({
        nombre: nombre.trim(),
        colegiado: colegiado.trim() || null,
        telefono: telefono.trim() || null,
      })
      await refrescarPerfil()
      avisar('Ficha actualizada.')
    } catch (err) {
      avisar(err instanceof ApiError ? err.message : 'No se ha podido guardar.', 'mal')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="tarjeta" onSubmit={enviar}>
      <Apartado titulo="Tu ficha" nota={agente?.email}>
        <CampoTexto id="p-nombre" etiqueta="Nombre y apellidos" requerido valor={nombre} onChange={setNombre} />
        <CampoTexto
          id="p-colegiado" etiqueta="Número de colegiado" valor={colegiado} onChange={setColegiado}
          pista="Aparece en las plantillas que lo autorrellenan."
        />
        <CampoTexto id="p-telefono" etiqueta="Teléfono" tipo="tel" valor={telefono} onChange={setTelefono} />
      </Apartado>
      <div className="tarjeta__pie">
        <button className="btn es-principal" type="submit" disabled={guardando || !sucio}>
          {guardando ? 'Guardando…' : 'Guardar ficha'}
        </button>
      </div>
    </form>
  )
}

function Contrasena() {
  const { avisar } = useApp()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (guardando) return
    setError('')
    if (nueva.length < 10) return setError('La contraseña nueva necesita al menos 10 caracteres.')
    if (nueva !== repetida) return setError('Las dos contraseñas nuevas no coinciden.')

    setGuardando(true)
    try {
      await api.cambiar_password(actual, nueva)
      setActual('')
      setNueva('')
      setRepetida('')
      avisar('Contraseña cambiada. Las demás sesiones se han cerrado.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se ha podido cambiar la contraseña.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="tarjeta" onSubmit={enviar} noValidate>
      <Apartado titulo="Contraseña" nota="Cambiarla cierra tus sesiones en los demás dispositivos">
        <CampoTexto
          id="c-actual" etiqueta="Contraseña actual" tipo="password" requerido
          autoComplete="current-password" valor={actual} onChange={setActual}
        />
        <CampoTexto
          id="c-nueva" etiqueta="Contraseña nueva" tipo="password" requerido
          autoComplete="new-password" valor={nueva} onChange={setNueva}
          pista="Al menos 10 caracteres."
        />
        <CampoTexto
          id="c-repetida" etiqueta="Repite la nueva" tipo="password" requerido
          autoComplete="new-password" valor={repetida} onChange={setRepetida}
        />
      </Apartado>
      {error && (
        <div className="aviso es-sello" style={{ margin: '0 0 14px' }}>
          <span className="aviso__rotulo">Revisa</span>
          <span>{error}</span>
        </div>
      )}
      <div className="tarjeta__pie">
        <button className="btn es-principal" type="submit" disabled={guardando}>
          {guardando ? 'Cambiando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  )
}

/**
 * Marca blanca. El acento se aplica en cuanto se toca, no al guardar: elegir un
 * color a ciegas y descubrir el resultado después no es elegir.
 */
function MarcaAgencia() {
  const { agente, guardarMarca } = useApp()
  const marca = agente?.agencia

  const [nombre, setNombre] = useState(marca?.nombre ?? '')
  const [nombreCorto, setNombreCorto] = useState(marca?.nombreCorto ?? '')
  const [lema, setLema] = useState(marca?.lema ?? '')
  const [logoUrl, setLogoUrl] = useState(marca?.logoUrl ?? '')
  const [color, setColor] = useState(marca?.colorAcento ?? '#0e6f5c')
  const [guardando, setGuardando] = useState(false)

  const valido = /^#[0-9a-f]{6}$/i.test(color)

  // Vista previa en vivo. Al salir de Ajustes se restaura lo guardado, de modo
  // que un color probado y no guardado no se queda puesto.
  useEffect(() => {
    if (valido) aplicarMarca({ colorAcento: color })
  }, [color, valido])

  useEffect(() => {
    return () => aplicarMarca(marca ?? null)
  }, [marca])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (guardando || !valido) return
    setGuardando(true)
    try {
      await guardarMarca({
        nombre: nombre.trim(),
        nombreCorto: nombreCorto.trim() || null,
        lema: lema.trim() || null,
        logoUrl: logoUrl.trim() || null,
        colorAcento: color.toLowerCase(),
      })
    } catch {
      // El aviso lo pone el contexto.
    } finally {
      setGuardando(false)
    }
  }

  const paleta = paletaDe(valido ? color : '#0e6f5c')

  return (
    <form className="tarjeta es-ancha" onSubmit={enviar} noValidate>
      <Apartado titulo="La agencia" nota="Cómo se llama y cómo se ve Timbre para todo tu equipo">
        <CampoTexto id="m-nombre" etiqueta="Nombre" requerido valor={nombre} onChange={setNombre} />
        <CampoTexto
          id="m-corto" etiqueta="Nombre corto" valor={nombreCorto} onChange={setNombreCorto}
          pista="El que se estampa en el margen. Dos o tres palabras."
        />
        <CampoTexto
          id="m-lema" etiqueta="Lema" valor={lema} onChange={setLema}
          placeholder="expedientes de compraventa"
          pista="Va bajo el nombre en la pantalla de acceso."
        />
        <CampoTexto
          id="m-logo" etiqueta="Logotipo (URL)" tipo="url" valor={logoUrl} onChange={setLogoUrl}
          placeholder="https://…/logo.svg"
          pista="Cuadrado y con fondo transparente. Si lo dejas vacío se usan las iniciales."
        />
      </Apartado>

      <section className="apartado">
        <header className="apartado__cab">
          <span className="rotulo">Color de acento</span>
          <span className="apartado__nota">
            El carmín de «caducado» y el ocre de «caduca pronto» no cambian: significan eso
          </span>
        </header>

        <div className="acentos">
          {ACENTOS_SUGERIDOS.map((a) => (
            <button
              key={a.hex}
              type="button"
              className={`acento${color.toLowerCase() === a.hex ? ' es-elegido' : ''}`}
              style={{ background: a.hex }}
              onClick={() => setColor(a.hex)}
              title={a.nombre}
              aria-label={a.nombre}
              aria-pressed={color.toLowerCase() === a.hex}
            />
          ))}

          <label className="acento es-libre" title="Otro color">
            <input
              type="color"
              value={valido ? color : '#0e6f5c'}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Elegir otro color"
            />
          </label>

          <input
            className="campo es-hex dato"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Color en hexadecimal"
            spellCheck={false}
          />
        </div>

        <div className="muestra">
          <div className="muestra__margen">
            <span className="muestra__iniciales">{iniciales(nombreCorto || nombre || 'Timbre')}</span>
            <span className="muestra__serie estampado">{nombreCorto || nombre}</span>
          </div>
          <div className="muestra__hoja">
            <Sello progreso={0.62} tamano={58} />
            <div>
              <span className="rotulo">Vista previa</span>
              <p className="muestra__frase">
                Así se verá el color de acción: los botones, los enlaces y los tramos conformes de
                la regleta.
              </p>
              <div className="muestra__tira">
                <span className="btn es-principal es-pequeno">Marcar como aportado</span>
                <span className="marca es-acento">18/24 conformes</span>
                <span className="marca es-ocre">2 caducan</span>
                <span className="marca es-sello">1 caducado</span>
              </div>
            </div>
          </div>
        </div>

        {!valido && (
          <p className="campo-fila__error">
            Escribe el color en formato #rrggbb, por ejemplo #1d4f8c.
          </p>
        )}
      </section>

      <div className="tarjeta__pie">
        <span className="tarjeta__nota dato silente">
          acción {paleta.acento} · relleno {paleta.acentoTenue}
        </span>
        <button className="btn es-principal" type="submit" disabled={guardando || !valido}>
          {guardando ? 'Guardando…' : 'Guardar la marca'}
        </button>
      </div>
    </form>
  )
}

export default function Ajustes() {
  const { agente, esAdmin } = useApp()

  return (
    <>
      <header className="portada es-simple">
        <div className="portada__texto">
          <span className="rotulo">Ajustes</span>
          <h1 className="portada__titulo">Tu cuenta y tu agencia</h1>
          <p className="portada__pie">
            {esAdmin
              ? 'Como administrador decides también cómo se llama y cómo se ve Timbre para el resto del equipo.'
              : `Estás en ${agente?.agencia.nombre}. La marca y el equipo los lleva un administrador de la agencia.`}
          </p>
        </div>
      </header>

      <div className="ajustes">
        <Perfil />
        <Contrasena />
        {esAdmin && <MarcaAgencia />}
      </div>
    </>
  )
}
