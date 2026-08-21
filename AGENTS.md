# AGENTS.md

## Commands

```sh
npm run dev       # servidor de desarrollo (HTTPS — necesita ./certs/, ver abajo)
npm run build     # tsc -b && vite build  (primero tipos, luego bundle)
npm run lint      # eslint .
npm run preview   # sirve el build de producción en local
```

No hay tests.

## Critical: HTTPS certs required before `npm run dev`

El servidor de desarrollo necesita certificados en `./certs/localhost-key.pem` y
`./certs/localhost.pem`. El directorio no está en el repo. Genéralos con
`mkcert` antes del primer arranque:

```sh
mkdir certs
mkcert -key-file ./certs/localhost-key.pem -cert-file ./certs/localhost.pem localhost
```

Fuente: `vite.config.ts`

La API también corre en HTTPS en local, y la cookie de sesión es `secure`: sin
certificados en los dos lados no hay sesión.

## Vite override: rolldown-vite

`vite` está aliasado a `rolldown-vite@7.2.5` con `overrides` en `package.json`.
Es el bundler experimental basado en Rolldown, no el Vite estándar: su
comportamiento puede divergir de la documentación de Vite.

## Backend dependency

El front habla con `timbre-api`, que vive en otro repo. URL base en
`VITE_API_HOSTNAME` (ver `.env.example`). Todas las llamadas van con
`credentials: 'include'`: la sesión es una cookie, no un token. Sin el backend
levantado no hay nada que enseñar, ni siquiera el login.

## TypeScript

- El build usa project references: `tsc -b` (no `tsc` a secas) — cubre
  `tsconfig.app.json` (src/) y `tsconfig.node.json` (config de vite).
- Estricto más allá de `"strict": true`: `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`,
  `erasableSyntaxOnly`.

## Architecture

SPA React 19 + TypeScript. No hay router: `src/App.tsx` mantiene la ruta en
estado (`{ v: 'panel' | 'exp' | 'biblioteca' | 'creador' }`).

Ficheros clave:
- `src/constants.ts` — `API_HOSTNAME` y enumerados
- `src/types.ts` — todos los tipos de dominio, espejo de los de `timbre-api`
- `src/api.ts` — todas las llamadas al backend
- `src/contexts/app_context.tsx` — sesión, expedientes y plantillas; único sitio
  donde se escribe contra la API
- `src/data/catalog.ts` — los 31 requisitos, con sus reglas de aplicabilidad
- `src/lib/expediente.ts` — evaluación de estados, caducidades y precarga
- `src/lib/guilloche.ts` — curvas paramétricas del sello y las orlas
- `src/styles/` — tokens y componentes

## El catálogo vive en el código, no en la base de datos

`src/data/catalog.ts` no se sirve desde la API: las reglas de aplicabilidad son
predicados (`aplica: (e) => e.hipoteca`). La base de datos solo guarda el estado
de cada requisito, con `req_id` (`IN-01`) como clave. Si cambian los requisitos,
se cambia aquí.

## El importador: los offsets se recalculan, no se guardan

`src/lib/importar/` funciona sobre un modelo deliberadamente simple: **el cuerpo
es siempre el texto actual, tokens incluidos.** Marcar una variable lo reescribe
en el acto y los hallazgos se vuelven a calcular sobre el texto nuevo.

No guardes offsets entre renders. Es de donde salen los fallos raros en los
editores de este tipo: marcas una variable, todas las posiciones posteriores se
desplazan, y el siguiente marcado corta por donde no es. Cuando haya que aplicar
varias marcas a la vez —`aceptarSeguros`— se ordenan de atrás hacia delante y se
aplican sobre el mismo texto de una tacada.

Dos cosas que parecen detalles y no lo son:

- **Los apóstrofos.** Word convierte `'` en `'` al teclear. Un expediente con
  «Carrer d'Aribau» no casa con un documento que dice «Carrer d'Aribau» si la
  comparación es literal. `plegar()` normaliza comillas, apóstrofos y guiones
  **carácter a carácter**, para que las posiciones dentro del texto no se muevan.
- **`lastIndex`.** Un regex con `/g` a nivel de módulo lleva estado dentro. Aquí
  se construyen en cada uso (`tokenRe()`), no se reutilizan.

## Formularios: una pregunta, un control

En el diálogo de marcar variable había dos controles —«¿qué es este dato?» y
«cómo se llama»— que preguntaban lo mismo, y por eso uno acababa siendo un
desplegable de veintidós entradas. Ahora es un solo campo de texto que busca
(`ui/Buscador.tsx`): escribes el nombre, y si coincide con un dato conocido lo
eliges; si no coincide con nada, lo escrito **es** el nombre del campo nuevo.

Debajo va solo la consecuencia de lo elegido, nunca las dos ramas a la vez: o se
rellena solo desde el expediente —y entonces se enseña cómo quedará escrito de
verdad, con el valor delante— o lo teclea el agente.

Lo que decide esa rama es si hay algo que lo rellene (`auto`), no de qué lista
salió la opción: un campo heredado de otra plantilla puede estar atado o no.

Dos detalles del desplegable que costaron una pasada de pruebas cada uno: dentro
de un diálogo lo recorta el `overflow`, así que va en posición fija y colocado a
mano; y devolver el foco al campo tras elegir lo reabría encima de la respuesta.

## Marca blanca: nunca escribas un color de acción a mano

Todo el color de acción sale de `--acento` y sus derivados, que `lib/marca.ts`
escribe en `:root` con la paleta de la agencia. En el CSS solo hay
`var(--acento)`, `var(--acento-honda)`, `var(--acento-tenue)`,
`var(--acento-vapor)`, `var(--acento-texto)`, `var(--acento-claro)` y
`var(--acento-contra)`.

`--sello` (carmín) y `--timbre` (ocre) sí son fijos: significan «caducado» y
«caduca pronto». No los uses para nada decorativo, y no los hagas configurables.

## No formatter

No hay Prettier ni `.editorconfig`. ESLint es la única herramienta de estilo.
