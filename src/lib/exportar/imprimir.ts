/**
 * El PDF del documento, que es la hoja tal cual sale por la impresora.
 *
 * No hay librería de PDF y no la va a haber: la hoja ya está diseñada como un
 * documento —papel timbrado, ondas, justificado, pie de firmas— y el navegador
 * sabe imprimirla con sus tipografías de verdad. Cualquier generador que
 * metiéramos tendría que volver a maquetar todo eso y saldría peor. Además, un
 * contrato acaba impreso de todas formas.
 *
 * En vez de imprimir la hoja donde está, se clona a un contenedor propio
 * colgado del `body`. La hoja vive dentro de un panel pegajoso con altura
 * limitada y `overflow: hidden`, así que imprimirla en su sitio sacaría solo
 * el trozo que se ve.
 */

/** La clase del contenedor que sí sale a papel. Ver `@media print` en app.css. */
const CONTENEDOR = 'impresion'

export function imprimir(nodo: HTMLElement, titulo: string): void {
  const previo = document.title
  const contenedor = document.createElement('div')
  contenedor.className = CONTENEDOR
  contenedor.setAttribute('aria-hidden', 'true')
  contenedor.appendChild(nodo.cloneNode(true))
  document.body.appendChild(contenedor)
  document.body.classList.add('es-imprimiendo')

  // Chrome propone el título de la página como nombre del PDF que guarda.
  document.title = titulo

  let hecho = false
  const limpiar = () => {
    if (hecho) return
    hecho = true
    contenedor.remove()
    document.body.classList.remove('es-imprimiendo')
    document.title = previo
    window.removeEventListener('afterprint', limpiar)
    medio.removeEventListener('change', alSalir)
  }
  // `afterprint` no llega en todos los navegadores; el cambio de medio, sí.
  const medio = window.matchMedia('print')
  const alSalir = (e: MediaQueryListEvent) => {
    if (!e.matches) limpiar()
  }
  window.addEventListener('afterprint', limpiar)
  medio.addEventListener('change', alSalir)

  window.print()
  // Cuando `print()` es bloqueante ya se ha cerrado el diálogo al volver aquí.
  limpiar()
}
