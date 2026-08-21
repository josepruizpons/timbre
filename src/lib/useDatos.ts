import { useCallback, useEffect, useState } from 'react'

import * as api from '../api'
import { ApiError } from '../api'
import type { DatoExpediente, GuardarDatoDTO } from '../types'

export interface Datos {
  lista: DatoExpediente[]
  cargando: boolean
  error: string
  guardar: (datos: GuardarDatoDTO[]) => Promise<void>
  recargar: () => Promise<void>
}

/**
 * Los datos de un expediente, con su procedencia.
 *
 * Se piden una vez por expediente, como los documentos: la ficha y la pantalla
 * de captura los enseñan a la vez y no tiene sentido traerlos dos veces.
 */
export function useDatos(expedienteId: string): Datos {
  const [lista, setLista] = useState<DatoExpediente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    try {
      setLista(await api.get_datos(expedienteId))
      setError('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se han podido cargar los datos.')
    } finally {
      setCargando(false)
    }
  }, [expedienteId])

  useEffect(() => {
    let vivo = true
    api
      .get_datos(expedienteId)
      .then((d) => vivo && setLista(d))
      .catch((e: unknown) => {
        if (vivo) setError(e instanceof ApiError ? e.message : 'No se han podido cargar los datos.')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [expedienteId])

  const guardar = useCallback(
    async (datos: GuardarDatoDTO[]) => {
      // La API devuelve la lista entera al guardar, así que no hace falta
      // recargar: lo que responde ya es el estado nuevo.
      setLista(await api.guardar_datos(expedienteId, datos))
    },
    [expedienteId]
  )

  return { lista, cargando, error, guardar, recargar }
}
