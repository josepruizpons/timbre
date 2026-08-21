# Recorridos de navegador

Lo que las pruebas de Node no alcanzan: que los botones estén donde se espera,
que la hoja se imprima entera y no el trozo que se ve en pantalla, y que el ZIP
se arme en el navegador bajando los ficheros del bucket de verdad —con su CORS
y sus URL firmadas—.

Se ejecutan **contra producción**, porque no hay otro sitio. Todo lo que suben
lleva «prueba» en el nombre y se borra al terminar; si un recorrido se corta a
medias, hay que comprobar que no queda nada.

## Poner en marcha

Playwright no está en `package.json` a propósito: su instalación se trae 180 MB
de navegadores y eso lo pagaría cada despliegue de Railway sin usarlo nunca.

```sh
npm i --no-save playwright && npx playwright install chromium
```

## Correrlos

```sh
WEB=https://timbre-web-production.up.railway.app \
HUMO_EMAIL=… HUMO_PASSWORD=… \
node scripts/navegador/descargas.mjs
```

`descargas.mjs` sube un papel, arma el ZIP del expediente y comprueba que el
fichero bajó del bucket byte a byte; descarga el .docx de un documento
generado; y verifica que en papel la hoja pierde el recorte y sale entera.

`caducidad.mjs` sube una nota simple, ve el requisito ponerse conforme solo,
corrige la fecha del papel a hace cien días y comprueba que el documento y el
requisito pasan a caducado.

`captura.mjs` corre sobre el expediente de demostración (`npm run demo` en
timbre-api): abre un papel al lado de sus campos, comprueba que se enseña en vez
de descargarse, y que una cifra con coma decimal se guarda entera. Lo deja como
estaba.

## Cuidado con dos cosas

**Medir el estilo con el medio equivocado.** En pantalla la hoja está recortada
a propósito. Leer ahí `overflow` no dice nada de lo que sale en papel: hay que
llamar a `emulateMedia({ media: 'print' })` *antes* de medir.

**El despliegue.** Un recorrido contra producción justo después de un push mide
el build anterior. Esperar a que el paquete servido contenga algo nuevo de este
commit.

**`type="number"` en castellano.** «89,15» no cabe en un campo numérico: el
navegador devuelve cadena vacía y el dato se pierde sin decir nada. Pasó de
verdad con la superficie registral. Por eso `captura.mjs` teclea siempre una
cifra con coma.
