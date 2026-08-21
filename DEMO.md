# Enseñarle Timbre a Sergio

Un guion de veinte minutos, pensado para que hable él. Las preguntas de
`PREGUNTAS-SERGIO.md` valen más si salen solas mientras mira algo funcionando,
así que **el objetivo no es lucir la aplicación: es que la interrumpa**.

## Antes de empezar

```sh
cd timbre-api
npm run demo            # deja EXP-2026-035 en un estado creíble
npm run demo -- --limpiar   # para retirarlo después
```

Comprueba que la versión servida es la última —los despliegues de Railway tardan
entre dos minutos y tres cuartos de hora, sin patrón—:

```sh
curl -s https://timbre-api-production-488f.up.railway.app/health
```

El expediente de demostración es un piso en el carrer del Rosselló: hipoteca,
comunidad, firma dentro de tres semanas. Tiene seis papeles dentro, cinco cosas
pedidas y sin llegar, y **una discrepancia de superficie preparada a propósito**.

Ten a mano un PDF cualquiera del escritorio para el paso 3. Vale un recibo.

---

## 1 · «¿Qué estás esperando ahora mismo?» (3 min)

Entra directo por **Esperas**, no por la cartera.

Es la pantalla que más se parece a su libreta: cinco documentos pedidos, por
orden de lo que lleva más tiempo fuera, con el nombre de quien lo debe. Tres en
ocre porque llevan más de una semana sin respuesta.

> **Lo que hay que decir:** «esto no lo mantiene nadie. Un requisito entra aquí
> el día que lo pones en curso, y sale el día que llega el papel».

**Cállate y mira qué hace.** Si esta pantalla no le dice nada, el resto importa
menos de lo que parece.

## 2 · El caso, y quién debe qué (4 min)

Abre el expediente del Rosselló. Arriba, lo que bloquea y lo que caduca; debajo,
**quién debe qué**, repartido por persona con su nombre, no por «vendedor».

Pregunta aquí, que es donde más ciego estoy:

- ¿Estas cuatro columnas son las personas con las que tú tratas, o falta alguien
  —la gestoría, el administrador, el banco—?
- De los 31 documentos, ¿cuáles no tocas nunca?

## 3 · Arrastrar un papel (3 min) — **el momento importante**

Arrastra a la carpeta el PDF que traías, **soltándolo dentro del requisito
IN-05, el certificado de deuda cero**.

Sin tocar ningún botón: el requisito pasa a conforme, con su fecha, y el contador
sube. Sale de la lista de esperas.

> **Lo que hay que decir:** «esto es lo único que te pide Timbre que hagas.
> Guardar el papel donde ya lo guardarías».

Quítalo después con **Quitar** y verás el requisito volver a pendiente.

## 4 · Leer el papel hacia el expediente (4 min)

En la nota simple, pulsa **Leer**. El escaneo a la izquierda, a la derecha lo que
ese tipo de documento trae dentro.

Fíjate en que **no hay que decir qué documento es**: está en IN-01, luego es una
nota simple.

> «La mitad de estos campos son datos del expediente. No es teclearlos dos
> veces: es la primera vez que se teclean, y encima quedan con el papel pegado».

Pregunta: **¿estos siete campos son los que te interesan de una nota simple?**
Esta lista es la más verde de todo el producto.

## 5 · La discrepancia (3 min) — **el segundo momento importante**

Baja a **Lo que sabemos del caso**. Arriba del todo, en carmín: la superficie.

- El Registro dice **89,15**
- El Catastro dice **92,00**
- La ficha del expediente dice **92**

Pulsa el renglón y se abren las tres fuentes con su papel al lado.

> «Antes esto era una casilla que se quedaba con lo último que alguien tecleó.
> Ahora caben las tres y Timbre lo dice en vez de elegir en silencio».

Pregunta: **¿esto te ha dado algún problema alguna vez?** Si la respuesta es
«siempre», la fase 3 estaba bien apostada. Si es «nunca me fijo», hay que
replanteársela.

## 6 · Un documento propio (3 min)

Abre IN-01 y baja a la hoja. **PDF** lo imprime tal cual se ve; **Word** lo baja
para retocarlo. Los huecos sin rellenar salen resaltados en amarillo.

Y en la carpeta, **Descargar todo**: el expediente entero en un ZIP con un índice
delante que lista lo que va dentro, lo que falta y a quién reclamárselo.

> «Esto es lo que hoy se manda a la notaría adjuntando veinte ficheros a un
> correo».

---

## Qué mirar mientras habla

Vale más esto que sus respuestas:

- **Qué es lo primero que busca** al abrir un expediente. Eso dice qué es
  importante de verdad, y probablemente no es lo que está arriba.
- **Qué palabras usa él.** La aplicación dice expediente, requisito, plantilla y
  traza. Si él dice otras, gana él.
- **Dónde dice «esto ya lo hago en…»**. Cada una de esas frases es una función
  que sobra.
- **Dónde se para a leer.** Si tiene que leer, no está claro.

## Lo que hay que decirle sin que pregunte

Que **el catálogo de 31 requisitos y los 127 campos por tipo de documento los
redacté yo a partir de normativa**, y que ningún agente los ha revisado. No es
una advertencia legal: es que si él corrige esa lista, corrige el producto
entero.

## Si algo se rompe

- Se cae la sesión → vuelve a entrar; la ruta está en la URL y el enlace del
  expediente sigue valiendo.
- El PDF no se ve en la captura → hay un enlace para abrirlo en otra pestaña.
- Todo lento → probablemente Railway está desplegando. Espera y recarga.
