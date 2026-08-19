/**
 * Casilla de verificación dibujada a mano. El trazo se entinta al confirmarse
 * el requisito; en caducado y caduca conserva la marca pero cambia de tinta,
 * porque el documento existe: lo que falla es su vigencia.
 */
export default function Casilla({ estado = 'pendiente', tamano = 17 }) {
  const marcada = estado === 'vigente' || estado === 'caducado' || estado === 'caduca'
  const clase =
    estado === 'vigente'
      ? 'es-conforme'
      : estado === 'caducado'
        ? 'es-caducado'
        : estado === 'caduca'
          ? 'es-caduca'
          : estado === 'curso'
            ? 'es-curso'
            : ''

  return (
    <svg
      className={`casilla ${clase}`}
      width={tamano}
      height={tamano}
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="casilla__caja" x="1.2" y="1.2" width="15.6" height="15.6" rx="1" />
      {marcada && <path className="casilla__trazo" d="M4.4 9.2 L7.6 12.4 L13.6 5.6" />}
      {estado === 'curso' && <circle cx="9" cy="9" r="2.4" fill="var(--tinta-60)" />}
    </svg>
  )
}
