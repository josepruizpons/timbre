import { API_HOSTNAME } from './constants'
import type {
  ActualizarRequisitoDTO,
  ActualizarUsuarioDTO,
  Agencia,
  CrearUsuarioDTO,
  EntradaTraza,
  Expediente,
  ExpedienteDTO,
  Marca,
  Plantilla,
  PlantillaDTO,
  UserInfo,
  Usuario,
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

export const actualizar_perfil = (datos: Partial<Pick<UserInfo, 'nombre' | 'colegiado' | 'telefono'>>) =>
  request<UserInfo>('/api/user/info', { method: 'PATCH', body: JSON.stringify(datos) })

export const cambiar_password = (actual: string, nueva: string) =>
  request<{ message: string }>('/api/user/password', {
    method: 'PUT',
    body: JSON.stringify({ actual, nueva }),
  })

// ─── Expedientes ─────────────────────────────────────────────────────────────

export const get_expedientes = () => request<Expediente[]>('/api/expedientes')

export const get_expediente = (id: string) =>
  request<Expediente>(`/api/expedientes/${id}`)

export const crear_expediente = (datos: ExpedienteDTO) =>
  request<Expediente>('/api/expedientes', {
    method: 'POST',
    body: JSON.stringify(datos),
  })

export const actualizar_expediente = (id: string, datos: ExpedienteDTO) =>
  request<Expediente>(`/api/expedientes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  })

export const borrar_expediente = (id: string) =>
  request<void>(`/api/expedientes/${id}`, { method: 'DELETE' })

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

export const borrar_traza = (id: string, entrada: number) =>
  request<void>(`/api/expedientes/${id}/traza/${entrada}`, { method: 'DELETE' })

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

/** Devuelve a cuántos requisitos deja sin plantilla, para poder avisar. */
export const borrar_plantilla = (id: string) =>
  request<{ requisitosAfectados: number }>(`/api/plantillas/${id}`, { method: 'DELETE' })

export const duplicar_plantilla = (id: string) =>
  request<Plantilla>(`/api/plantillas/${id}/duplicar`, { method: 'POST' })

// ─── Administración ──────────────────────────────────────────────────────────

export const get_usuarios = () => request<Usuario[]>('/api/admin/users')

export const crear_usuario = (datos: CrearUsuarioDTO) =>
  request<Usuario>('/api/admin/users', { method: 'POST', body: JSON.stringify(datos) })

export const actualizar_usuario = (id: number, datos: ActualizarUsuarioDTO) =>
  request<Usuario>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(datos) })

/** Da de baja sin borrar: los expedientes y la traza siguen apuntando a él. */
export const desactivar_usuario = (id: number) =>
  request<Usuario>(`/api/admin/users/${id}`, { method: 'DELETE' })

export const get_agencia = () => request<Agencia>('/api/admin/agencia')

export const actualizar_agencia = (marca: Partial<Marca>) =>
  request<Agencia>('/api/admin/agencia', { method: 'PATCH', body: JSON.stringify(marca) })
