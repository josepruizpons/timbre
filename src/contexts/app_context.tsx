import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import * as api from '../api'
import { ApiError } from '../api'
import { aplicarMarca } from '../lib/marca'
import type {
  ActualizarRequisitoDTO,
  Expediente,
  ExpedienteDTO,
  Marca,
  Plantilla,
  PlantillaDTO,
  UserInfo,
} from '../types'

export interface Aviso {
  id: number
  tono: 'bien' | 'mal' | 'neutro'
  texto: string
}

interface AppState {
  /** `null` mientras se comprueba la sesión al arrancar. */
  sesion: boolean | null
  agente: UserInfo | null
  esAdmin: boolean
  expedientes: Expediente[]
  plantillas: Plantilla[]
  cargando: boolean
  error: string | null
  avisos: Aviso[]

  entrar: (email: string, password: string) => Promise<void>
  salir: () => Promise<void>
  recargar: () => Promise<void>

  avisar: (texto: string, tono?: Aviso['tono']) => void
  descartarAviso: (id: number) => void

  crearExpediente: (datos: ExpedienteDTO) => Promise<Expediente>
  actualizarExpediente: (id: string, datos: ExpedienteDTO) => Promise<void>
  borrarExpediente: (id: string) => Promise<void>
  actualizarRequisito: (expId: string, reqId: string, parche: ActualizarRequisitoDTO) => Promise<void>
  anadirTraza: (expId: string, texto: string, fecha?: string) => Promise<void>
  borrarTraza: (expId: string, entrada: number) => Promise<void>

  guardarPlantilla: (plantilla: PlantillaDTO) => Promise<void>
  borrarPlantilla: (id: string) => Promise<void>
  duplicarPlantilla: (id: string) => Promise<Plantilla>

  guardarMarca: (marca: Partial<Marca>) => Promise<void>
  refrescarPerfil: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp fuera de AppProvider')
  return ctx
}

/** Un fallo de la API en un mensaje que se le pueda enseñar al agente. */
function comoTexto(err: unknown, porDefecto: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'La sesión ha caducado. Vuelve a entrar.'
    if (err.status === 500) return porDefecto
    return err.message || porDefecto
  }
  if (err instanceof TypeError) return 'No hay conexión con el servidor.'
  return porDefecto
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<boolean | null>(null)
  const [agente, setAgente] = useState<UserInfo | null>(null)
  const [expedientes, setExpedientes] = useState<Expediente[]>([])
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const siguienteAviso = useRef(1)

  const avisar = useCallback((texto: string, tono: Aviso['tono'] = 'bien') => {
    const id = siguienteAviso.current++
    setAvisos((prev) => [...prev, { id, tono, texto }])
    // Los avisos son confirmaciones, no diálogos: se van solos.
    window.setTimeout(() => {
      setAvisos((prev) => prev.filter((a) => a.id !== id))
    }, tono === 'mal' ? 7000 : 4000)
  }, [])

  const descartarAviso = useCallback((id: number) => {
    setAvisos((prev) => prev.filter((a) => a.id !== id))
  }, [])

  /**
   * Envuelve una escritura: deja el mensaje de error en pantalla y lo relanza,
   * para que quien la llamó pueda decidir si cierra el formulario o no.
   */
  const intentar = useCallback(
    async <T,>(accion: () => Promise<T>, alFallar: string): Promise<T> => {
      try {
        return await accion()
      } catch (err) {
        const texto = comoTexto(err, alFallar)
        avisar(texto, 'mal')
        if (err instanceof ApiError && err.status === 401) setSesion(false)
        throw err
      }
    },
    [avisar]
  )

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [info, exps, plts] = await Promise.all([
        api.get_user_info(),
        api.get_expedientes(),
        api.get_plantillas(),
      ])
      setAgente(info)
      aplicarMarca(info.agencia)
      setExpedientes(exps)
      setPlantillas(plts)
    } catch (err) {
      setError(comoTexto(err, 'No se han podido cargar los datos.'))
      if (err instanceof ApiError && err.status === 401) setSesion(false)
    } finally {
      setCargando(false)
    }
  }, [])

  // Al arrancar preguntamos por la sesión: la cookie puede seguir viva de una
  // visita anterior, y en ese caso no hay que pasar por el login.
  useEffect(() => {
    let vivo = true
    api.check_session().then((activa) => {
      if (!vivo) return
      setSesion(activa)
      if (activa) void cargar()
    })
    return () => {
      vivo = false
    }
  }, [cargar])

  const entrar = useCallback(
    async (email: string, password: string) => {
      await api.login(email, password)
      setSesion(true)
      await cargar()
    },
    [cargar]
  )

  const salir = useCallback(async () => {
    await api.logout().catch(() => undefined)
    setSesion(false)
    setAgente(null)
    setExpedientes([])
    setPlantillas([])
    aplicarMarca(null)
  }, [])

  const refrescarPerfil = useCallback(async () => {
    const info = await api.get_user_info()
    setAgente(info)
    aplicarMarca(info.agencia)
  }, [])

  // ─── Expedientes ───────────────────────────────────────────────────────────

  /** La API devuelve el expediente entero, así que se sustituye sin recargar. */
  const sustituir = useCallback((exp: Expediente) => {
    setExpedientes((prev) => prev.map((e) => (e.id === exp.id ? exp : e)))
  }, [])

  const crearExpediente = useCallback(
    async (datos: ExpedienteDTO) => {
      const creado = await intentar(
        () => api.crear_expediente(datos),
        'No se ha podido abrir el expediente.'
      )
      setExpedientes((prev) => [creado, ...prev])
      avisar(`Expediente ${creado.referencia} abierto.`)
      return creado
    },
    [intentar, avisar]
  )

  const actualizarExpediente = useCallback(
    async (id: string, datos: ExpedienteDTO) => {
      const actualizado = await intentar(
        () => api.actualizar_expediente(id, datos),
        'No se han podido guardar los cambios.'
      )
      sustituir(actualizado)
      avisar(`Expediente ${actualizado.referencia} guardado.`)
    },
    [intentar, sustituir, avisar]
  )

  const borrarExpediente = useCallback(
    async (id: string) => {
      const exp = expedientes.find((e) => e.id === id)
      await intentar(() => api.borrar_expediente(id), 'No se ha podido borrar el expediente.')
      setExpedientes((prev) => prev.filter((e) => e.id !== id))
      avisar(`Expediente ${exp?.referencia ?? ''} borrado.`, 'neutro')
    },
    [expedientes, intentar, avisar]
  )

  const actualizarRequisito = useCallback(
    async (expId: string, reqId: string, parche: ActualizarRequisitoDTO) => {
      const actualizado = await intentar(
        () => api.actualizar_requisito(expId, reqId, parche),
        'No se ha podido guardar el requisito.'
      )
      sustituir(actualizado)
      // Las plantillas llevan contador de usos y la API acaba de subirlo.
      if (parche.plantillaId) {
        api.get_plantillas().then(setPlantillas).catch(() => undefined)
      }
    },
    [intentar, sustituir]
  )

  const anadirTraza = useCallback(
    async (expId: string, texto: string, fecha?: string) => {
      const entrada = await intentar(
        () => api.anadir_traza(expId, texto, fecha),
        'No se ha podido guardar la anotación.'
      )
      setExpedientes((prev) =>
        prev.map((e) => (e.id === expId ? { ...e, traza: [entrada, ...e.traza] } : e))
      )
      avisar('Anotación añadida.')
    },
    [intentar, avisar]
  )

  const borrarTraza = useCallback(
    async (expId: string, entrada: number) => {
      await intentar(
        () => api.borrar_traza(expId, entrada),
        'No se ha podido borrar la anotación.'
      )
      setExpedientes((prev) =>
        prev.map((e) =>
          e.id === expId ? { ...e, traza: e.traza.filter((t) => t.id !== entrada) } : e
        )
      )
      avisar('Anotación borrada.', 'neutro')
    },
    [intentar, avisar]
  )

  // ─── Plantillas ────────────────────────────────────────────────────────────

  const guardarPlantilla = useCallback(
    async (plantilla: PlantillaDTO) => {
      const guardada = await intentar(
        () =>
          plantilla.id
            ? api.actualizar_plantilla(plantilla.id, plantilla)
            : api.crear_plantilla(plantilla),
        'No se ha podido guardar la plantilla.'
      )

      setPlantillas((prev) => {
        const existe = prev.some((p) => p.id === guardada.id)
        return existe ? prev.map((p) => (p.id === guardada.id ? guardada : p)) : [guardada, ...prev]
      })
      avisar(plantilla.id ? `«${guardada.nombre}» guardada.` : `«${guardada.nombre}» creada.`)
    },
    [intentar, avisar]
  )

  const borrarPlantilla = useCallback(
    async (id: string) => {
      const plt = plantillas.find((p) => p.id === id)
      const { requisitosAfectados } = await intentar(
        () => api.borrar_plantilla(id),
        'No se ha podido borrar la plantilla.'
      )
      setPlantillas((prev) => prev.filter((p) => p.id !== id))

      // Los requisitos que la usaban se quedan sin plantilla: el expediente que
      // haya abierto tiene que enterarse.
      if (requisitosAfectados > 0) {
        api.get_expedientes().then(setExpedientes).catch(() => undefined)
        avisar(
          `«${plt?.nombre ?? 'Plantilla'}» borrada. ${requisitosAfectados} ${
            requisitosAfectados === 1 ? 'requisito se queda' : 'requisitos se quedan'
          } sin plantilla, con sus datos intactos.`,
          'neutro'
        )
      } else {
        avisar(`«${plt?.nombre ?? 'Plantilla'}» borrada.`, 'neutro')
      }
    },
    [plantillas, intentar, avisar]
  )

  const duplicarPlantilla = useCallback(
    async (id: string) => {
      const copia = await intentar(
        () => api.duplicar_plantilla(id),
        'No se ha podido duplicar la plantilla.'
      )
      setPlantillas((prev) => [copia, ...prev])
      avisar(`«${copia.nombre}» creada a partir del original.`)
      return copia
    },
    [intentar, avisar]
  )

  // ─── Marca ─────────────────────────────────────────────────────────────────

  const guardarMarca = useCallback(
    async (marca: Partial<Marca>) => {
      const agencia = await intentar(
        () => api.actualizar_agencia(marca),
        'No se han podido guardar los cambios de la agencia.'
      )
      setAgente((prev) => (prev ? { ...prev, agencia } : prev))
      aplicarMarca(agencia)
      avisar('Marca de la agencia actualizada.')
    },
    [intentar, avisar]
  )

  const valor = useMemo<AppState>(
    () => ({
      sesion,
      agente,
      esAdmin: agente?.rol === 'admin',
      expedientes,
      plantillas,
      cargando,
      error,
      avisos,
      entrar,
      salir,
      recargar: cargar,
      avisar,
      descartarAviso,
      crearExpediente,
      actualizarExpediente,
      borrarExpediente,
      actualizarRequisito,
      anadirTraza,
      borrarTraza,
      guardarPlantilla,
      borrarPlantilla,
      duplicarPlantilla,
      guardarMarca,
      refrescarPerfil,
    }),
    [
      sesion, agente, expedientes, plantillas, cargando, error, avisos,
      entrar, salir, cargar, avisar, descartarAviso,
      crearExpediente, actualizarExpediente, borrarExpediente, actualizarRequisito,
      anadirTraza, borrarTraza,
      guardarPlantilla, borrarPlantilla, duplicarPlantilla,
      guardarMarca, refrescarPerfil,
    ]
  )

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>
}
