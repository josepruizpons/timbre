import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import * as api from '../api'
import type {
  ActualizarRequisitoDTO,
  Expediente,
  Plantilla,
  PlantillaDTO,
  UserInfo,
} from '../types'

interface AppState {
  /** `null` mientras se comprueba la sesión al arrancar. */
  sesion: boolean | null
  agente: UserInfo | null
  expedientes: Expediente[]
  plantillas: Plantilla[]
  cargando: boolean
  error: string | null
  entrar: (email: string, password: string) => Promise<void>
  salir: () => Promise<void>
  actualizarRequisito: (expId: string, reqId: string, parche: ActualizarRequisitoDTO) => Promise<void>
  guardarPlantilla: (plantilla: PlantillaDTO) => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp fuera de AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<boolean | null>(null)
  const [agente, setAgente] = useState<UserInfo | null>(null)
  const [expedientes, setExpedientes] = useState<Expediente[]>([])
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setExpedientes(exps)
      setPlantillas(plts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se han podido cargar los datos')
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
  }, [])

  /** La API devuelve el expediente entero, así que se sustituye sin recargar. */
  const actualizarRequisito = useCallback(
    async (expId: string, reqId: string, parche: ActualizarRequisitoDTO) => {
      const actualizado = await api.actualizar_requisito(expId, reqId, parche)
      setExpedientes((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)))
    },
    []
  )

  const guardarPlantilla = useCallback(async (plantilla: PlantillaDTO) => {
    const guardada = plantilla.id
      ? await api.actualizar_plantilla(plantilla.id, plantilla)
      : await api.crear_plantilla(plantilla)

    setPlantillas((prev) => {
      const existe = prev.some((p) => p.id === guardada.id)
      return existe ? prev.map((p) => (p.id === guardada.id ? guardada : p)) : [guardada, ...prev]
    })
  }, [])

  const valor = useMemo<AppState>(
    () => ({
      sesion,
      agente,
      expedientes,
      plantillas,
      cargando,
      error,
      entrar,
      salir,
      actualizarRequisito,
      guardarPlantilla,
    }),
    [sesion, agente, expedientes, plantillas, cargando, error, entrar, salir, actualizarRequisito, guardarPlantilla]
  )

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>
}
