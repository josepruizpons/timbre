// Los datos que un expediente puede volcar en un documento.
//
// `contextoDe()` produce el mapa clave → valor; esto le pone nombre, tipo y
// grupo a cada clave. Lo usan tres sitios: el importador para nombrar lo que
// detecta, el creador para su selector de autorrelleno, y el formulario para
// agrupar los campos.

import { ESTADOS_CIVILES } from './catalog'
import type { TipoCampo } from '../types'

export interface DatoExpediente {
  clave: string
  etiqueta: string
  tipo: TipoCampo
  grupo: string
  /** Filtro con el que suele aparecer escrito en un documento. */
  filtro?: 'eur' | 'letra' | 'fecha' | 'may'
  opciones?: string[]
  /**
   * Un valor corto se confunde con cualquier cifra suelta del texto. Los que
   * lo son se detectan igual, pero exigiendo que el hallazgo venga acompañado
   * de su unidad o su rótulo.
   */
  contexto?: RegExp
}

export const DATOS_EXPEDIENTE: DatoExpediente[] = [
  // ─── Partes ──────────────────────────────────────────────────────────────
  { clave: 'vendedor', etiqueta: 'Vendedor', tipo: 'text', grupo: 'Partes' },
  { clave: 'vendedorNif', etiqueta: 'NIF del vendedor', tipo: 'nif', grupo: 'Partes' },
  { clave: 'vendedorEstadoCivil', etiqueta: 'Estado civil del vendedor', tipo: 'select', grupo: 'Partes', opciones: ESTADOS_CIVILES },
  { clave: 'comprador', etiqueta: 'Comprador', tipo: 'text', grupo: 'Partes' },
  { clave: 'compradorNif', etiqueta: 'NIF del comprador', tipo: 'nif', grupo: 'Partes' },
  { clave: 'compradorEstadoCivil', etiqueta: 'Estado civil del comprador', tipo: 'select', grupo: 'Partes', opciones: ESTADOS_CIVILES },

  // ─── Inmueble ────────────────────────────────────────────────────────────
  { clave: 'direccion', etiqueta: 'Dirección completa', tipo: 'text', grupo: 'Inmueble' },
  { clave: 'municipio', etiqueta: 'Municipio', tipo: 'text', grupo: 'Inmueble' },
  { clave: 'provincia', etiqueta: 'Provincia', tipo: 'text', grupo: 'Inmueble' },
  { clave: 'refCatastral', etiqueta: 'Referencia catastral', tipo: 'text', grupo: 'Inmueble' },
  { clave: 'fincaRegistral', etiqueta: 'Finca registral', tipo: 'text', grupo: 'Inmueble' },
  { clave: 'registro', etiqueta: 'Registro de la Propiedad', tipo: 'text', grupo: 'Inmueble' },
  { clave: 'superficie', etiqueta: 'Superficie', tipo: 'number', grupo: 'Inmueble', contexto: /m²|m2|metros/i },
  { clave: 'anioConstruccion', etiqueta: 'Año de construcción', tipo: 'number', grupo: 'Inmueble', contexto: /constru|edificad|antigüedad|año/i },

  // ─── Operación ───────────────────────────────────────────────────────────
  { clave: 'precio', etiqueta: 'Precio', tipo: 'money', grupo: 'Operación', filtro: 'eur' },
  { clave: 'arras', etiqueta: 'Arras', tipo: 'money', grupo: 'Operación', filtro: 'eur' },
  { clave: 'fechaFirma', etiqueta: 'Fecha de firma', tipo: 'date', grupo: 'Operación', filtro: 'fecha' },
  { clave: 'notaria', etiqueta: 'Notaría', tipo: 'text', grupo: 'Operación' },
  { clave: 'arrasLinea', etiqueta: 'Cláusula de arras', tipo: 'textarea', grupo: 'Operación' },

  // ─── Quien firma por la agencia ──────────────────────────────────────────
  { clave: 'agente', etiqueta: 'Agente', tipo: 'text', grupo: 'Agencia' },
  { clave: 'agencia', etiqueta: 'Agencia', tipo: 'text', grupo: 'Agencia' },
  { clave: 'hoy', etiqueta: 'Fecha del documento', tipo: 'date', grupo: 'Agencia', filtro: 'fecha' },
]

export const DATO_POR_CLAVE: Record<string, DatoExpediente> = Object.fromEntries(
  DATOS_EXPEDIENTE.map((d) => [d.clave, d])
)
