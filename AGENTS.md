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

## No formatter

No hay Prettier ni `.editorconfig`. ESLint es la única herramienta de estilo.
