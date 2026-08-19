import { API_HOSTNAME } from './constants'
import type {
  ActualizarRequisitoDTO,
  EntradaTraza,
  Expediente,
  Plantilla,
  PlantillaDTO,
  UserInfo,
} from './types'

/** Error de la API ya interpretado: `code` es el del backend (`NOT_FOUND`…). */
export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_HOSTNAME}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      body?.error ?? 'UNKNOWN',
      body?.message ?? response.statusText
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// ─── Sesión ──────────────────────────────────────────────────────────────────

export const login = (email: string, password: string) =>
  request<{ success: true }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const logout = () => request<{ message: string }>('/auth/logout')

/** 204 si la sesión sigue viva, 401 si no. Se usa al arrancar la aplicación. */
export const check_session = async (): Promise<boolean> => {
  try {
    await request<void>('/api/check')
    return true
  } catch {
    return false
  }
}

export const get_user_info = () => request<UserInfo>('/api/user/info')

// ─── Expedientes ─────────────────────────────────────────────────────────────

export const get_expedientes = () => request<Expediente[]>('/api/expedientes')

export const get_expediente = (id: string) =>
  request<Expediente>(`/api/expedientes/${id}`)

export const crear_expediente = (datos: Partial<Expediente>) =>
  request<Expediente>('/api/expedientes', {
    method: 'POST',
    body: JSON.stringify(datos),
  })

export const actualizar_expediente = (id: string, datos: Partial<Expediente>) =>
  request<Expediente>(`/api/expedientes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  })

/** Devuelve el expediente entero: el panel recalcula sus contadores con él. */
export const actualizar_requisito = (
  id: string,
  req_id: string,
  parche: ActualizarRequisitoDTO
) =>
  request<Expediente>(`/api/expedientes/${id}/requisitos/${req_id}`, {
    method: 'PUT',
    body: JSON.stringify(parche),
  })

export const anadir_traza = (id: string, texto: string, fecha?: string) =>
  request<EntradaTraza>(`/api/expedientes/${id}/traza`, {
    method: 'POST',
    body: JSON.stringify({ texto, fecha }),
  })

// ─── Plantillas ──────────────────────────────────────────────────────────────

export const get_plantillas = () => request<Plantilla[]>('/api/plantillas')

export const crear_plantilla = (plantilla: PlantillaDTO) =>
  request<Plantilla>('/api/plantillas', {
    method: 'POST',
    body: JSON.stringify(plantilla),
  })

export const actualizar_plantilla = (id: string, plantilla: PlantillaDTO) =>
  request<Plantilla>(`/api/plantillas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(plantilla),
  })

export const borrar_plantilla = (id: string) =>
  request<void>(`/api/plantillas/${id}`, { method: 'DELETE' })
