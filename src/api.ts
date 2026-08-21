import { API_HOSTNAME } from './constants'
import type {
  ActualizarRequisitoDTO,
  DatoExpediente,
  Documento,
  GuardarDatoDTO,
  SubidaConcedida,
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

// ─── Documentos ──────────────────────────────────────────────────────────────

export const get_documentos = (expId: string) =>
  request<Documento[]>(`/api/expedientes/${expId}/documentos`)

/**
 * Sube un fichero al expediente. El fichero **no pasa por la API**: se pide una
 * URL firmada, el navegador la usa para subir directo al almacén y luego avisa.
 * Así una subida de veinte megas no ocupa el servidor.
 */
export async function subir_documento(
  expId: string,
  fichero: File,
  datos: { reqId?: string | null; nombre?: string; emisor?: string; emitido?: string } = {},
  alProgresar?: (porcentaje: number) => void
): Promise<Documento> {
  const concedida = await request<SubidaConcedida>(
    `/api/expedientes/${expId}/documentos/subida`,
    {
      method: 'POST',
      body: JSON.stringify({
        nombreFichero: fichero.name,
        mime: fichero.type || 'application/octet-stream',
        tamano: fichero.size,
        reqId: datos.reqId ?? null,
      }),
    }
  )

  await subir_al_almacen(concedida.url, fichero, alProgresar)

  return request<Documento>(
    `/api/expedientes/${expId}/documentos/${concedida.documentoId}/confirmar`,
    {
      method: 'POST',
      body: JSON.stringify({
        ...(datos.nombre ? { nombre: datos.nombre } : {}),
        ...(datos.emisor ? { emisor: datos.emisor } : {}),
        ...(datos.emitido ? { emitido: datos.emitido } : {}),
      }),
    }
  )
}

/**
 * El PUT va con XHR y no con fetch por una sola razón: fetch todavía no informa
 * del progreso de subida, y un escaneo de veinte megas por una línea mala
 * necesita barra.
 */
function subir_al_almacen(
  url: string,
  fichero: File,
  alProgresar?: (porcentaje: number) => void
): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const peticion = new XMLHttpRequest()
    peticion.open('PUT', url)
    peticion.setRequestHeader('Content-Type', fichero.type || 'application/octet-stream')

    peticion.upload.onprogress = (e) => {
      if (e.lengthComputable && alProgresar) {
        alProgresar(Math.round((e.loaded / e.total) * 100))
      }
    }
    peticion.onload = () =>
      peticion.status >= 200 && peticion.status < 300
        ? resolver()
        : rechazar(new ApiError(peticion.status, 'ALMACEN', 'No se ha podido subir el fichero'))
    peticion.onerror = () =>
      rechazar(new ApiError(0, 'ALMACEN', 'Se ha cortado la subida del fichero'))
    peticion.send(fichero)
  })
}

export const actualizar_documento = (
  expId: string,
  id: string,
  datos: Partial<Pick<Documento, 'nombre' | 'emisor' | 'nota' | 'emitido' | 'reqId' | 'estado'>>
) =>
  request<Documento>(`/api/expedientes/${expId}/documentos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  })

/** Los datos que el expediente sabe, cada uno con el papel del que salió. */
export const get_datos = (expId: string) =>
  request<DatoExpediente[]>(`/api/expedientes/${expId}/datos`)

/** Guarda varias observaciones de golpe: es como se rellena mirando un papel. */
export const guardar_datos = (expId: string, datos: GuardarDatoDTO[]) =>
  request<DatoExpediente[]>(`/api/expedientes/${expId}/datos`, {
    method: 'PUT',
    body: JSON.stringify({ datos }),
  })

export const borrar_dato = (expId: string, id: number) =>
  request<void>(`/api/expedientes/${expId}/datos/${id}`, { method: 'DELETE' })

export const borrar_documento = (expId: string, id: string) =>
  request<void>(`/api/expedientes/${expId}/documentos/${id}`, { method: 'DELETE' })

/** Devuelve una URL firmada de vida corta, no el fichero. */
export const url_de_descarga = (expId: string, id: string) =>
  request<{ url: string }>(`/api/expedientes/${expId}/documentos/${id}/descarga`)

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
