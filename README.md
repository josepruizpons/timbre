# Timbre

Seguimiento de expedientes de compraventa de vivienda para un agente
inmobiliario, desde la captación hasta la firma ante notario.

React 19 + TypeScript sobre Vite. Es solo el front: los datos viven en
PostgreSQL detrás de [timbre-api](https://github.com/josepruizpons/timbre-api),
con el que se habla por sesión en cookie.

```bash
npm install
cp .env.example .env              # VITE_API_HOSTNAME apunta a timbre-api

mkdir certs                       # el dev server va por HTTPS
mkcert -key-file ./certs/localhost-key.pem -cert-file ./certs/localhost.pem localhost

npm run dev                       # https://localhost:5173
```

Hace falta `timbre-api` levantado y con su base de datos sembrada: sin backend
no pasas del login.

## Qué hay dentro

- **Cartera** — activos e historial en un registro foliado, encabezado por la
  regleta: una sola barra con todos los requisitos de la cartera repartidos por
  estado, porque lo que se mira es la proporción, no cuatro cifras sueltas.
- **Alta y edición de expedientes** — la finca, las partes, la operación y las
  circunstancias. Cada circunstancia dice al lado qué requisitos abre o cierra,
  y el pie del formulario cuenta cuántos habrá antes de guardar.
- **Ficha de expediente** — el catálogo de requisitos aplicable a ese caso
  concreto, agrupado por bloques y presentado como checks.
- **Requisito** — base legal, quién lo emite, quién lo aporta y su vigencia;
  selección de plantilla, vista previa del documento sobre papel timbrado y
  formulario de campos enlazado con la vista previa.
- **Creador de plantillas** — editor de campos y de cuerpo con tokens, y vista
  previa en vivo contra un expediente real. Duplicar versiona sin tocar lo que
  ya usan los expedientes firmados.
- **Traza** — histórico y auditoría a la vez: lo que anota el agente va firmado
  con su nombre y se puede borrar; lo que escribe la aplicación al cambiar de
  estado queda marcado y no.
- **Equipo** (administradores) — alta, edición, cambio de rol y baja. Dar de
  baja no borra la fila: los expedientes y las anotaciones siguen apuntando a
  esa persona.
- **Ajustes** — la ficha propia, la contraseña y, para administradores, la marca
  de la agencia.

## El catálogo de requisitos

`src/data/catalog.ts` recoge 31 requisitos reales de una compraventa en España,
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
| `{{fecha\|fecha}}` | `14 de agosto de 2026` (fecha en largo) |
| `{{nombre\|may}}` | Mayúsculas |

Cada campo puede enlazarse con un dato del expediente (`auto`), y así llega
precargado al abrir la plantilla. Los campos vacíos aparecen en la vista previa
como huecos punteados; al enfocar un campo del formulario se resalta su hueco en
el documento.

## Estructura

```
src/
  api.ts               todas las llamadas al backend
  types.ts             tipos de dominio, espejo de los de timbre-api
  constants.ts         API_HOSTNAME y enumerados
  contexts/            app_context: sesión, expedientes, plantillas y avisos
  lib/marca.ts         del color de la agencia salen los seis tonos de la interfaz
  data/catalog.ts      requisitos, bloques y reglas de aplicabilidad
  lib/guilloche.ts     curvas de guilloche y bandas de onda paramétricas
  lib/format.ts        formato español, incluida la conversión de importes a letra
  lib/expediente.ts    evaluación de estados, caducidades y precarga
  components/          Sello, Casilla, Hoja, Formulario, Margen, Panel,
                       Expediente, ExpedienteForm, Biblioteca, Creador,
                       Usuarios, Ajustes, Login, ErrorBoundary
  components/ui/       Modal, Avisos, Confirmar, Campos
  styles/              tokens y componentes
```

Los expedientes, las plantillas y el estado de cada requisito están en
PostgreSQL. El catálogo no: sus reglas de aplicabilidad son predicados sobre las
circunstancias del expediente, así que vive en el código.

## Diseño

El modelo es el papel timbrado: un margen impreso a la izquierda, oscuro y
estrecho, con la referencia corriendo en vertical; y a su derecha la hoja, donde
se trabaja. La aplicación entera es ese par. La navegación vive en el margen
porque en el papel es donde vive la referencia, y el margen sigue llevando
estampado en vertical el nombre de la agencia.

Tres planos y siempre en el mismo orden: el margen oscuro `#16232E`, el pliego
de carpeta `#DBE2DD` y el papel de las fichas `#F5F7F4`. Sobre el papel, tinta
prusia `#101E2E`.

El sello de cada expediente es una roseta de guilloche generada con curvas
paramétricas reales (`lib/guilloche.ts`): sus seis anillos se entintan de fuera
hacia dentro conforme quedan conformes los requisitos, y al llegar al pleno el
sello se estampa en carmín. Los documentos se componen sobre papel timbrado con
número de serie y orlas de onda.

Tipografías: Archivo, Alegreya Sans e IBM Plex Mono. Archivo es variable en
anchura además de en peso, y esa es la única articulación tipográfica de la
interfaz: `wdth 62` para lo estampado en el margen, `wdth 112` para los
titulares. No hay una segunda familia de display.

### Marca blanca

Cada agencia elige un color de acento desde Ajustes. De ese único hexadecimal
`lib/marca.ts` deriva los seis tonos que necesita la interfaz —acción, pulsado,
dos rellenos, la variante legible sobre papel y la legible sobre el margen
oscuro— y los escribe como variables CSS en `:root`. El cálculo del contraste
usa luminancia relativa de la WCAG, así que un acento muy claro se oscurece para
poder leerse como texto y uno muy oscuro se aclara para verse en el margen.

Lo que **no** se deriva de ahí es el carmín `#A81F35` de «caducado» y el ocre
`#8A6A12` de «caduca pronto». Son semánticos: una agencia puede trabajar en el
color que quiera, pero un documento vencido tiene que verse vencido.

## Aviso

Los textos legales son de muestra para el prototipo, no asesoramiento jurídico.
Los tipos impositivos y varios requisitos dependen de la comunidad autónoma y
del municipio, y cambian con frecuencia.
