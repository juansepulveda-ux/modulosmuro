# modulosmuro — sistema integrado

## Estructura

- `index.html`: visor público con pestañas Muro / Airtrail + Tirolesa y selector de fecha.
- `planificador.html`: panel administrativo único.
- `planificador_muro.html`: planificador de miniclases de muro.
- `planificador_airtrail.html`: planificador Airtrail + Tirolesa.
- `api/jornadas.js`: publica, lista, lee y elimina jornadas en GitHub.

Las publicaciones se guardan automáticamente como:

- `data/muro/YYYY-MM-DD.json`
- `data/airtrail/YYYY-MM-DD.json`

No necesitas crear estas carpetas manualmente.

## Variables Vercel

Se reutilizan las que ya tienes:

- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`

`GITHUB_PATH` ya no se usa, pero puede quedarse configurada sin causar problemas.

## Instalación sobre tu repositorio actual

1. Sube el contenido de este paquete a la raíz de `modulosmuro`, reemplazando `index.html`, `planificador.html`, `vercel.json` y `package.json`.
2. Sube `planificador_muro.html` y `planificador_airtrail.html` a la raíz. Luego entra a la carpeta `api/` que ya existe y sube allí `jornadas.js`. Si GitHub deja `api/publicar.js` o `api/horario.js` antiguos, puedes borrarlos después; esta versión usa `api/jornadas.js`.
3. Haz Commit.
4. Vercel, al estar conectado a GitHub, desplegará automáticamente. No necesitas cambiar las variables de entorno ni el token.
5. Abre `/planificador` para publicar jornadas. Abre `/` para visualizarlas.

## Primer uso

Hasta que publiques la primera jornada de cada tipo, el visor mostrará que no hay jornadas disponibles.
