# Timbre

POC de seguimiento de expedientes de compraventa de vivienda para un agente
inmobiliario, desde la captación hasta la firma ante notario.

```bash
npm install
npm run dev      # http://localhost:5173
```

React 18 + Vite, sin backend. Los datos viven en `localStorage`; el botón
**Reiniciar muestra** de la barra superior los devuelve a su estado original.

## Qué hay dentro

- **Panel de expedientes** — activos e historial, con los contadores que
  gobiernan el día de un agente: requisitos por cerrar, documentos que caducan,
  documentos ya caducados y días hasta la firma más próxima.
- **Ficha de expediente** — el catálogo de requisitos aplicable a ese caso
  concreto, agrupado por bloques y presentado como checks.
- **Requisito** — base legal, quién lo emite, quién lo aporta y su vigencia;
  selección de plantilla, vista previa del documento sobre papel timbrado y
  formulario de campos enlazado con la vista previa.
- **Creador de plantillas** — editor de campos y de cuerpo con tokens, y vista
  previa en vivo contra un expediente real.

## El catálogo de requisitos

`src/data/catalog.js` recoge 31 requisitos reales de una compraventa en España,
cada uno con emisor, responsable, vigencia y referencia normativa. No todos
aplican a todos los expedientes: el catálogo se filtra por las circunstancias
del caso, de modo que el número de checks cambia de un expediente a otro.

| Bloque | Contenido | Ejemplos condicionados |
| --- | --- | --- |
| `IN` Inmueble | Situación registral, física y energética | Cédula de habitabilidad solo en las 8 CCAA que la exigen; ITE en edificios de 45+ años; libro del edificio solo en obra nueva |
| `PT` Partes | Identidad y capacidad | NIE solo si el comprador es extranjero; poder solo si hay representación; últimas voluntades solo si el título es una herencia |
| `FN` Financiación | Hipoteca del comprador y cargas del vendedor | FEIN, FiAE, acta de transparencia y tasación solo si hay hipoteca; certificado de deuda solo si la finca está gravada |
| `FS` Fiscal y blanqueo | Impuestos y Ley 10/2010 | Modelo 211 solo si el vendedor es no residente |
| `NT` Notaría | Preparación material de la firma | — |

### Vigencias

La caducidad es el mecanismo estructural de la aplicación. Un requisito marcado
como aportado se evalúa contra la vigencia de su catálogo y la fecha de emisión,
y pasa a `caduca pronto` o `caducado` por sí solo. Los plazos usados: nota
simple 90 días, certificado de deuda cero de la comunidad 30 días, certificado
de deuda hipotecaria 15 días, FEIN 10 días naturales antes de la firma, tasación
6 meses (Orden ECO/805/2003), certificado energético 10 años (RD 390/2021).

## Plantillas

Nueve plantillas de muestra ya cargadas: arras penitenciales, nota de encargo,
solicitud de nota simple, certificado de deuda cero, declaración de medios de
pago, encargo de certificado energético, minuta de comparecencia, cambio de
titularidad de suministros y minuta de poder especial.

El cuerpo de una plantilla es texto plano con marcas:

| Marca | Efecto |
| --- | --- |
| `# ` | Título del documento |
| `§ ` | Encabezado de cláusula |
| `-` en su propia línea | Regla horizontal |
| `> ` | Nota al pie |
| `{{clave}}` | Campo |

Y filtros sobre los campos:

| Filtro | Resultado |
| --- | --- |
| `{{precio\|eur}}` | `425.000,00 €` |
| `{{precio\|letra}}` | `CUATROCIENTOS VEINTICINCO MIL EUROS` |
| `{{fecha\|fecha}}` | `14 de agosto de 2026` |
| `{{nombre\|may}}` | Mayúsculas |

Cada campo puede enlazarse con un dato del expediente (`auto`), y así llega
precargado al abrir la plantilla. Los campos vacíos aparecen en la vista previa
como huecos punteados; al enfocar un campo del formulario se resalta su hueco en
el documento.

## Estructura

```
src/
  data/catalog.js      requisitos, bloques y reglas de aplicabilidad
  data/templates.js    plantillas de muestra
  data/cases.js        10 expedientes (6 activos, 4 en historial)
  lib/guilloche.js     curvas de guilloche y bandas de onda paramétricas
  lib/format.js        formato español, incluida la conversión de importes a letra
  lib/expediente.js    evaluación de estados, caducidades y precarga
  components/          Sello, Casilla, Hoja, Formulario, Panel, Expediente,
                       Biblioteca, Creador
  styles/              tokens y componentes
```

## Diseño

La identidad viene de la impresión de seguridad de los documentos oficiales
españoles. El sello de cada expediente es una roseta de guilloche generada con
curvas paramétricas reales (`lib/guilloche.js`): sus seis anillos se entintan de
fuera hacia dentro conforme quedan conformes los requisitos, y al llegar al
pleno el sello se estampa en carmín. Los documentos se componen sobre papel
timbrado con número de serie y orlas de onda.

Paleta: tinta prusia `#101E2E`, salvia de archivo `#DBE2DD`, papel `#F8F9F7`,
verde de fondo registral `#0E6F5C`, carmín de sello `#A81F35` y ocre de timbre
`#8A6A12`. El carmín queda reservado a lo que ya ha caducado o bloquea la firma.
Tipografías: Archivo para títulos, Alegreya Sans para texto y IBM Plex Mono para
referencias y cifras.

## Aviso

Los textos legales son de muestra para el prototipo, no asesoramiento jurídico.
Los tipos impositivos y varios requisitos dependen de la comunidad autónoma y
del municipio, y cambian con frecuencia.
