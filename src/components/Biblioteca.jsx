import { useState } from 'react'
import { POR_ID, BLOQUES } from '../data/catalog.js'
import { fechaCorta } from '../lib/format.js'

export default function Biblioteca({ plantillas, onCrear, onEditar }) {
  const [filtro, setFiltro] = useState('todas')

  const lista =
    filtro === 'todas' ? plantillas : plantillas.filter((p) => p.requisito?.startsWith(filtro))

  return (
    <>
      <header className="cabecera">
        <div>
          <span className="rotulo">Biblioteca</span>
          <h1 className="cabecera__titulo">Plantillas de la agencia</h1>
          <p className="cabecera__pie">
            Cada plantilla lleva su propio juego de campos. Al abrirla desde un expediente, los
            datos que ya constan en el caso llegan rellenos y solo queda lo específico del
            documento.
          </p>
        </div>
        <button className="btn es-principal" onClick={() => onCrear(null)}>
          + Crear plantilla
        </button>
      </header>

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

      <div className="biblioteca">
        {lista.map((p) => {
          const req = POR_ID[p.requisito]
          return (
            <article key={p.id} className="tarjeta-plt">
              <div className="tarjeta-plt__cuerpo">
                <span className="sigla">
                  {p.requisito} · {req ? req.nombre : 'sin requisito'}
                </span>
                <h3 className="tarjeta-plt__nombre">{p.nombre}</h3>
                <p className="tarjeta-plt__desc">{p.descripcion}</p>
              </div>
              <div className="tarjeta-plt__pie">
                <span className="dato silente">
                  v{p.version} · {p.campos.length} campos · {fechaCorta(p.actualizada)}
                </span>
                <button className="btn es-plano" onClick={() => onEditar(p.id)}>
                  Editar
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
