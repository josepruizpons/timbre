import { useCallback, useEffect, useState } from 'react'

import * as api from '../api'
import { ApiError } from '../api'
import type { Documento } from '../types'

export interface Documentos {
  lista: Documento[]
  cargando: boolean
  error: string
  anadir: (documento: Documento) => void
  quitar: (id: string) => void
  recargar: () => Promise<void>
}

/**
 * Los documentos de un expediente, traídos una sola vez.
 *
 * Vive aquí y no dentro de `Carpeta` porque la carpeta se pinta dos veces en la
 * misma pantalla —la del expediente entero y la de cada requisito—, y cada una
 * con su propio `fetch` significaba pedir la lista dos veces y enseñar
 * «Cargando…» al abrir cada requisito.
 */
export function useDocumentos(expedienteId: string): Documentos {
  const [lista, setLista] = useState<Documento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    try {
      setLista(await api.get_documentos(expedienteId))
      setError('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se han podido cargar los documentos.')
    } finally {
      setCargando(false)
    }
  }, [expedienteId])

  useEffect(() => {
    let vivo = true
    api
      .get_documentos(expedienteId)
      .then((d) => vivo && setLista(d))
      .catch((e: unknown) => {
        if (vivo) setError(e instanceof ApiError ? e.message : 'No se han podido cargar los documentos.')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [expedienteId])

  const anadir = useCallback((documento: Documento) => {
    setLista((prev) => [documento, ...prev])
  }, [])

  const quitar = useCallback((id: string) => {
    setLista((prev) => prev.filter((d) => d.id !== id))
  }, [])

  return { lista, cargando, error, anadir, quitar, recargar }
}
