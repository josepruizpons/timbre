import { useState } from 'react'

import Confirmar, { type PeticionConfirmar } from './ui/Confirmar'
import { POR_ID, BLOQUES } from '../data/catalog'
import { fechaCorta } from '../lib/format'
import { useApp } from '../contexts/app_context'
import type { Plantilla } from '../types'

interface BibliotecaProps {
  plantillas: Plantilla[]
  onCrear: () => void
  onImportar: () => void
  onEditar: (id: string) => void
}

export default function Biblioteca({ plantillas, onCrear, onImportar, onEditar }: BibliotecaProps) {
  const { borrarPlantilla, duplicarPlantilla } = useApp()
  const [filtro, setFiltro] = useState('todas')
  const [confirmar, setConfirmar] = useState<PeticionConfirmar | null>(null)

  const lista =
    filtro === 'todas' ? plantillas : plantillas.filter((p) => p.requisito?.startsWith(filtro))

  const pedirBorrado = (p: Plantilla) =>
    setConfirmar({
      titulo: `Borrar «${p.nombre}»`,
      cuerpo:
        p.usos > 0
          ? `Esta plantilla se ha usado en ${p.usos} ${p.usos === 1 ? 'expediente' : 'expedientes'}. ` +
            'Los requisitos que la tuvieran se quedan sin plantilla, pero conservan los datos que ya ' +
            'se habían rellenado. Si lo que quieres es cambiarla sin tocar lo antiguo, duplícala.'
          : 'La plantilla no está en uso en ningún expediente. El borrado no tiene vuelta atrás.',
      accion: 'Borrar plantilla',
      destructiva: true,
      alConfirmar: () => borrarPlantilla(p.id),
    })

  return (
    <>
      <header className="portada es-simple">
        <div className="portada__texto">
          <span className="rotulo">Biblioteca</span>
          <h1 className="portada__titulo">Plantillas de la agencia</h1>
          <p className="portada__pie">
            Cada plantilla lleva su propio juego de campos. Al abrirla desde un expediente, los
            datos que ya constan en el caso llegan rellenos y solo queda lo específico del
            documento.
          </p>
          <div className="portada__botones">
            <button className="btn es-principal" onClick={onImportar}>
              Importar un documento
            </button>
            <button className="btn" onClick={onCrear}>
              Escribir una desde cero
            </button>
          </div>
        </div>
      </header>

      {plantillas.length > 0 && (
        <div className="filtros" style={{ marginBottom: 16 }}>
          <div className="pestanas">
            <button
              className={`pestana${filtro === 'todas' ? ' es-activa' : ''}`}
              onClick={() => setFiltro('todas')}
            >
              Todas · {plantillas.length}
            </button>
            {BLOQUES.map((b) => {
              const n = plantillas.filter((p) => p.requisito?.startsWith(b.sigla)).length
              if (!n) return null
              return (
                <button
                  key={b.sigla}
                  className={`pestana${filtro === b.sigla ? ' es-activa' : ''}`}
                  onClick={() => setFiltro(b.sigla)}
                >
                  {b.nombre} · {n}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="vacio">
          <p className="vacio__titulo">Todavía no hay plantillas</p>
          <p className="vacio__texto">
            Una plantilla es un escrito que la agencia repite —un contrato de arras, una solicitud
            de nota simple— con huecos que se rellenan solos con los datos del expediente. Si ya
            tienes esos documentos en Word, tráelos: Timbre reconoce sus datos solo.
          </p>
          <div className="portada__botones" style={{ justifyContent: 'center' }}>
            <button className="btn es-principal" onClick={onImportar}>
              Importar un documento
            </button>
            <button className="btn" onClick={onCrear}>
              Escribir una desde cero
            </button>
          </div>
        </div>
      ) : (
        <div className="biblioteca">
          {lista.map((p) => {
            const req = p.requisito ? POR_ID[p.requisito] : undefined
            return (
              <article key={p.id} className="tarjeta-plt">
                <div className="tarjeta-plt__cuerpo">
                  <span className="sigla">
                    {p.requisito ?? '—'} · {req ? req.nombre : 'sin requisito'}
                  </span>
                  <h3 className="tarjeta-plt__nombre">{p.nombre}</h3>
                  <p className="tarjeta-plt__desc">{p.descripcion}</p>
                </div>
                <div className="tarjeta-plt__pie">
                  <span className="dato silente">
                    v{p.version ?? '1'} · {p.campos.length} campos · {p.usos} usos ·{' '}
                    {fechaCorta(p.actualizada)}
                  </span>
                  <div className="tarjeta-plt__acciones">
                    <button className="btn es-plano" onClick={() => onEditar(p.id)}>
                      Editar
                    </button>
                    <button
                      className="btn es-plano"
                      onClick={() => void duplicarPlantilla(p.id)}
                      title="Crear una copia para versionar sin tocar la original"
                    >
                      Duplicar
                    </button>
                    <button className="btn es-plano es-peligro" onClick={() => pedirBorrado(p)}>
                      Borrar
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Confirmar peticion={confirmar} onCerrar={() => setConfirmar(null)} />
    </>
  )
}
