/**
 * Pie de firmas propio de cada tipo de documento.
 *
 * Los requisitos que no aparecen aquí no se firman: son solicitudes o
 * comunicaciones, y ponerles un pie de firma les daría un aire de contrato que
 * no tienen.
 */
export const FIRMAS: Record<string, string[]> = {
  'PT-05': ['La parte vendedora', 'La parte compradora'],
  'PT-06': ['El cliente', 'Por la agencia'],
  'IN-05': ['El administrador de fincas', 'Sello de la comunidad'],
  'FS-01': ['El comprador declarante', ''],
  'PT-03': ['El poderdante', ''],
}
