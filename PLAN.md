# Plan de Timbre

Estado a 21 de agosto de 2026.

## La tesis

Un agente inmobiliario lleva cada venta entre WhatsApps, una libreta y la
memoria. Timbre existe para **centralizar los documentos de un expediente y el
seguimiento de lo que falta**, desde que hay acuerdo hasta que se firma ante
notario.

Regla que gobierna todas las decisiones de este plan:

> **Todo lo que Timbre le pida al agente que no estuviera haciendo ya, juega en
> contra.** Un sistema que hay que alimentar pierde contra la libreta. Por eso
> el estado tiene que salir de gestos que el agente ya hace —recibir un papel y
> guardarlo— y no de que se acuerde de marcar una casilla.

## Los cuatro pilares, y dónde estamos

| Pilar | Qué es | Estado |
| --- | --- | --- |
| **Seguimiento** | Qué falta, qué caduca, qué bloquea la firma | ✅ Hecho |
| **Generación** | Redactar los documentos propios y las peticiones | ✅ Hecho |
| **Organización** | Guardar los papeles que llegan | ✅ Hecho (fases 1 y 2) |
| **Reclamación** | Saber quién debe qué y pedírselo | ✅ Hecho (fase 1b) |

Lo construido hasta hoy: catálogo de 31 requisitos con reglas de aplicabilidad,
estados y caducidades, cartera ordenada por urgencia, plantillas con
autorrelleno desde el expediente, importador de documentos de Word,
administración de usuarios y marca blanca por agencia.

**El agujero que decide la adopción es Organización.** Mientras Timbre no guarde
ficheros, el agente no cierra WhatsApp: los papeles le llegan por ahí.

## Fases

### Fase 1 · Documentos — ✅ hecha el 21 de agosto de 2026

Lo que cierra WhatsApp.

- Tabla `documentos`, separada de `expediente_requisitos`. Un requisito es la
  obligación y su estado; un documento es la cosa física que la satisface.
- `origen`: `generado` (plantilla + valores) o `recibido` (fichero).
- `req_id` anulable: si es nulo, el documento está en la carpeta del expediente
  sin cubrir requisito. El expediente hace de carpeta.
- Subida a S3 detrás de una interfaz de almacenamiento, con URL firmadas de vida
  corta. El fichero no pasa por la API.
- **El estado del requisito se deriva del papel que hay dentro.** Subes el
  documento y dices de qué fecha es → aportado, y la caducidad se calcula contra
  la vigencia del catálogo. El botón manual se queda solo para los requisitos
  que no son un papel (la entrega de llaves es un acto).
- Versiones: una nota simple caducada no se borra cuando llega la nueva. La
  sustituye y queda en el histórico.

**Lo entregado.** Tabla `documentos` separada de `expediente_requisitos`, con un
CHECK que garantiza la forma —un generado necesita plantilla, un recibido
necesita fichero—. Subida directa al bucket con URL firmada, sin que el fichero
pase por la API. PDF, imágenes (HEIC incluido, que es como llegan las fotos de
un móvil) y Word, hasta 25 MB. La carpeta se pinta en el expediente y dentro de
cada requisito. El estado del requisito sale del papel que hay dentro.

Comprobado en producción: `npm run documentos` (13 comprobaciones sobre la API)
y un recorrido por el navegador que sube un fichero de verdad, ve el requisito
ponerse conforme solo, lo descarga y lo quita.

**Lo que falta de esta fase**, y que no bloquea la 2:

- ~~Editar los datos de un documento desde la interfaz~~ — hecho el 21 de
  agosto. Nombre, fecha del papel, requisito que cubre, emisor y nota, con la
  consecuencia de la fecha calculada mientras se teclea («vale 90 días: caduca
  el 19 de noviembre, quedan 62»). Hacía falta para que la caducidad valiera de
  algo: al subir se pone la fecha de hoy, y una nota simple pedida hace tres
  semanas caduca tres semanas antes de lo que Timbre creía.
- ~~Calcular `caduca` al subir~~ — hecho el 21 de agosto. Sale de cruzar
  `emitido` con la vigencia del catálogo, y se recalcula al corregir la fecha o
  al mover el documento de requisito. La carpeta lo enseña: «caducado hace 4 d»,
  «caduca en 12 d», «vale hasta 30 oct».
- Reasignar un documento a otro requisito arrastrándolo. Se puede ya desde el
  formulario de datos; falta el gesto.
- Los documentos generados todavía no se crean como filas de `documentos`: el
  requisito sigue guardando su plantilla y sus valores como antes. Conviven sin
  estorbarse, pero hay que unificarlo.

### Fase 1b · Pendientes por persona — ✅ hecha el 21 de agosto de 2026

Barata, porque el dato ya está en el catálogo (`responsable`) y sin usar.

De los 31 requisitos, **20 dependen de que otra persona te mande algo**: 11 el
vendedor, 9 el comprador. El WhatsApp del agente no es transporte de ficheros,
es la persecución.

- Vista de «quién te debe qué» por expediente y por persona.
- Botón para pedirlo, reusando las plantillas de petición que ya existen: **6 de
  las 9 plantillas sembradas no son documentos propios, son solicitudes a un
  tercero**.
- El ciclo completo de un requisito es **pedir → esperar → recibir → vigilar
  vigencia**. Hoy se cubre «pedir» y a medias «vigilar».

**Lo entregado.** La pantalla **Esperas** enseña, de toda la cartera, lo que ya
se ha pedido y no ha llegado, por orden de lo que lleva más tiempo fuera y
agrupado por la persona que lo debe —con su nombre, no con su papel—. A la
semana sin respuesta el renglón se pone en ocre; «Recordar» lo apunta y le
compra otros siete días.

Las fechas salen del cambio de estado, no de que nadie las teclee: pasar un
requisito a «en curso» significa «se lo he pedido», y de ahí sale `pedido`.
Dentro del caso, lo mismo repartido por persona, con «Pedir» y «Recordar».

**Lo que falta.** El botón de pedir no compone todavía la solicitud desde la
plantilla: apunta la fecha y deja traza, pero el documento hay que abrirlo
aparte.

### Fase 2 · Descargas — ✅ hecha el 21 de agosto de 2026

- **PDF imprimiendo la hoja**: `@media print` + `window.print()`. Cero
  dependencias, la hoja ya está diseñada como documento, y un contrato se
  imprime de todas formas.
- **DOCX** desde el mismo marcado `#`/`§`.
- **ZIP del expediente entero**: lo que se manda a la notaría la semana antes de
  firmar, y que hoy se arma a mano adjuntando veinte ficheros a un correo.

**Lo entregado.** Un escritor de ZIP propio (`src/lib/exportar/zip.ts`), sin
dependencias, que sirve para las dos cosas: un .docx es un ZIP de cuatro XML y
la carpeta del expediente es un ZIP de los papeles del caso. Se descartó la
librería `docx` —medio mega para verter un marcado de cuatro símbolos— y se
descartó `fflate` porque el ZIP sin comprimir cabe en dos cabeceras y los PDF y
las fotos ya vienen comprimidos.

El PDF se imprime en vez de generarse. La hoja ya está maquetada como documento
—papel timbrado, ondas, justificado, pie de firmas— y el navegador la imprime
con sus tipografías de verdad; cualquier generador tendría que rehacer esa
maquetación y saldría peor. La hoja se clona a un contenedor propio antes de
imprimir, porque en pantalla vive dentro de un panel con altura limitada y
`overflow: hidden` que solo sacaría a papel el trozo visible.

El ZIP del expediente lleva delante un **índice**, y ahí está lo que aporta: la
lista de lo que falta viaja con la carpeta. Quien la recibe no tiene que abrir
los veinte ficheros para saber qué no le has mandado.

Lo comprueba `npm run exportar`: 25 comprobaciones, entre ellas que `mammoth`
—el mismo lector con el que el importador se traga los Word de la agencia— abre
el .docx que generamos, y que el índice no se contradice.

Y `scripts/navegador/` guarda dos recorridos con Playwright para lo que Node no
alcanza: que el ZIP se arme en el navegador bajando los ficheros del bucket de
verdad, y que en papel la hoja pierda el recorte que tiene en pantalla.

**Lo que falta de esta fase.** Nadie ha abierto todavía el .docx en un Word de
verdad: se ha comprobado contra `unzip` y contra `mammoth`, que son estrictos
pero no son Word.

### Un hallazgo suelto — ✅ resuelto

La aplicación no llevaba la ruta en la URL: recargar dentro de un expediente
devolvía a la lista, y no se podía mandar el enlace de un caso a un compañero.
Resuelto el 21 de agosto con `src/lib/ruta.ts`, sin librería: son siete
pantallas y el servidor estático ya sirve `index.html` para cualquier ruta.

### Fase 3 · Datos con procedencia — ✅ hecha el 21 de agosto de 2026

Donde el expediente deja de ser un formulario y pasa a ser un registro de
hechos. Es la fase que más cambia el producto.

- **Dos pisos.** Los ~22 datos con los que la aplicación razona —precio, fecha
  de firma, comunidad, superficie, circunstancias— siguen siendo columnas,
  porque ordenan la cartera y deciden qué requisitos aplican. Lo demás —capital
  de la hipoteca, TIN, calificación energética, protocolo— va a una tabla
  clave-valor.
- **Tabla de procedencia**: de qué documento salió cada dato, quién lo confirmó
  y cuándo. Las columnas no se tocan; todos los datos ganan una historia.
- **Discrepancias.** La superficie registral y la catastral casi nunca coinciden.
  Con procedencia, el mismo dato admite dos fuentes con dos valores y Timbre lo
  avisa en vez de elegir en silencio.
- **Ficha de datos**: cada hecho conocido del caso, su valor y su fuente. Pulsas
  la fuente y se abre el documento.
- **Ascenso**: si tres plantillas piden el mismo dato aportado, deja de ser un
  dato del documento y pasa a ser uno del caso.

**Lo entregado.** `src/data/esquemas.ts` con los 31 tipos de documento y 127
campos, 17 de los cuales alimentan el expediente. `expediente_datos` guarda
observaciones —«la nota simple dice 89,15»— y no verdades, con índices únicos
parciales para que lo que teclea el agente y lo que dice cada papel sean filas
distintas a propósito: esa convivencia **es** la discrepancia. La ficha junta
los tres orígenes y pone delante lo que no cuadra.

Dos cosas que encontró `npm run dominio` y que eran de fondo:

- La superficie catastral y la de tasación no apuntaban al mismo hecho que la
  registral, así que las tres convivían sin mirarse. El ejemplo de manual por el
  que existe esta fase, y estaba roto.
- `fechaFirma` significaba dos cosas: el tope que ponen las arras y la cita con
  el notario. Con la misma clave se mezclaban en silencio. Ahora son dos claves
  del mismo hecho, y que no cuadren es perder las arras.

**Lo que falta.** El **ascenso** —si tres plantillas piden el mismo dato
aportado, deja de ser un dato del documento y pasa a ser uno del caso— no está.
Y los datos no se escriben de vuelta a las columnas del expediente: conviven,
pero el formulario sigue siendo la fuente para ordenar la cartera.

### Fase 4 · Captura desde el documento — ✅ hecha el 21 de agosto de 2026

El agente migra el papel al sistema.

- Al subir en el hueco de un requisito, **el tipo ya se sabe por construcción**:
  si lo subes en IN-01, es una nota simple. No hay que clasificar nada.
- Pantalla partida: el escaneo o la foto a la izquierda, los campos de ese tipo
  de documento a la derecha. Se teclea mirando el papel, y el dato queda con su
  fuente pegada.
- Parte de esos campos **son datos del expediente**, así que rellenarlos lo
  nutre. No es teclear dos veces: es la primera vez que se teclean.
- Prerrelleno por extracción de texto para los PDF digitales —notas simples,
  FEIN, certificados—, reutilizando las expresiones regulares del importador
  (`src/lib/importar/deteccion.ts`) giradas del revés. No es IA.

**Lo entregado.** El botón «Leer» de cada papel recibido abre la pantalla
partida. Cuando lo que se escribe no cuadra con lo que ya tenía el expediente no
se pisa nada: se avisa ahí mismo y quedan las dos versiones.

Un fallo que solo se vio mirando una captura de pantalla: `type="number"` no
admite «89,15», así que el navegador devolvía cadena vacía y **el dato se perdía
sin decir nada**. En castellano las cifras llevan coma; esos campos son de
texto.

**Lo que falta.** El prerrelleno por extracción de texto. Hoy se teclea todo
mirando el papel, que es lo que hay que validar primero: si a Sergio teclear
siete campos le parece trabajo extra, la extracción no lo arregla, solo lo
disimula.

### Fase 5 · Plantillas de lectura

El espejo de las plantillas de redacción: una receta por tipo de documento y
emisor («el número de finca va detrás de FINCA Nº»). Se enseña una vez y a
partir de ahí todas las notas simples de ese Registro se leen solas.

A partir de aquí entran las mejoras con modelo: OCR para escaneados, extracción
contra el esquema de campos, clasificación de documentos sueltos, discrepancias
semánticas. Con una regla: **ningún dato extraído se escribe sin que una persona
lo confirme.**

## Decisiones tomadas

- **Almacenamiento: S3** desde el principio, con el mismo patrón que
  `bosko-api` (`AWS_ID`, `AWS_SECRET_KEY`, `AWS_BUCKET`, `AWS_REGION`) y URL
  firmadas. Detrás de una interfaz, para poder correr en local sin credenciales.
  Se descartó el volumen de Railway: son contratos firmados y documentación
  bancaria, y un disco sin copias de seguridad no es sitio para eso.
- **El catálogo vive en el código**, no en la base de datos: sus reglas de
  aplicabilidad son predicados sobre las circunstancias del expediente.
- **Marca blanca por color de acento**, con el carmín de «caducado» y el ocre de
  «caduca pronto» fuera del alcance de la agencia: son semánticos.

## Lo que está sin validar

El catálogo de 31 requisitos se redactó a partir de conocimiento general de
compraventas en España. Las referencias legales que cita son reales; **ni un
agente en ejercicio ni un notario lo han revisado nunca**, y todo el producto se
apoya en esa lista.

Preguntas para el agente que valide, por orden de cuánto cambian el diseño:

1. De estos 31 documentos, ¿cuáles pides tú y cuáles no tocas nunca? ¿Cuáles son
   de la gestoría o de la notaría?
2. ¿Cuáles bloquean de verdad la firma? Hoy hay 21 marcados como críticos y son
   probablemente demasiados.
3. **¿Cuáles faltan?** Lo que no está en la lista no se puede echar de menos.
4. ¿Qué documento da más guerra? Ahí es donde el producto se gana el sueldo.
5. ¿Se ha caído alguna firma por un papel? ¿Cuál?
6. ¿Las vigencias son las que manejas? Sobre todo nota simple y deuda cero.
7. En tu comunidad, ¿qué se pide que no se pida en otras?
8. De diez ventas, ¿en cuántas hay hipoteca, herencia, poder o no residente?
9. **¿Qué haces hoy con los papeles?** Carpeta compartida, correo, papel. Esto
   decide contra qué compite Timbre y puede cambiar la fase 1.

## Cómo se comprueba todo esto

Sin entorno de pruebas: todo va contra producción, así que cada recorrido deja
lo que toca y luego lo retira.

| Dónde | Qué |
| --- | --- |
| `timbre/npm run dominio` | 17 · el catálogo, la persecución y la ficha, sin red |
| `timbre/npm run exportar` | 25 · el ZIP, el .docx y el índice |
| `timbre-api/npm run humo` | 47 · la API de siempre |
| `timbre-api/npm run s3` | 11 · el almacén y el límite de permisos |
| `timbre-api/npm run documentos` | 17 · el ciclo del documento y su caducidad |
| `timbre-api/npm run datos` | 13 · la persecución y la procedencia |
| `timbre/scripts/navegador/` | 27 · lo que solo se ve en un navegador |

Los tres recorridos de navegador cubren lo que Node no alcanza: que el ZIP se
arme bajando de verdad del bucket, que la hoja pierda en papel el recorte que
tiene en pantalla, y que una cifra con coma decimal no se pierda por el camino.

## Riesgos

- **Que Timbre sea trabajo extra.** El mayor de todos. Se mitiga anclando el
  estado a la subida del documento, que es un gesto que el agente ya hace.
- **Que el catálogo esté mal.** Se mitiga con la validación de arriba.
- **Seguridad de los datos.** Timbre pasa a guardar NIF, contratos firmados y
  documentación bancaria. Sin resolver: cifrado en reposo, caducidad de las URL
  de descarga, política de retención y borrado, registro de descargas, y qué
  pasa con los documentos de un expediente archivado.
- **Editar una plantilla cambia documentos ya firmados**, porque el cuerpo se
  busca en vivo. `duplicar` existe como escape pero no es automático.
