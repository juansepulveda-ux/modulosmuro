# Muro Mallsport — planificación y publicación

Este repositorio contiene el sistema completo:

- `planificador.html`: crea la planificación, exporta JSON/Excel/CSV y publica directamente.
- `api/publicar.js`: función segura de Vercel que actualiza `horario.json` en GitHub.
- `api/horario.js`: devuelve al visor de Vercel la versión más reciente guardada en GitHub.
- `index.html`: visor de solo lectura para monitores.
- `horario.json`: planificación actualmente publicada (incluye datos demo al inicio).

## Flujo de uso

1. Abrir `https://TU-PROYECTO.vercel.app/planificador`.
2. Crear la jornada y revisar cobertura.
3. Escribir usuario y contraseña administrativos.
4. Pulsar **Publicar horario**.
5. Vercel actualiza `horario.json` en GitHub.
6. El visor público lee la planificación. En Vercel la obtiene directamente desde GitHub mediante `/api/horario`; en GitHub Pages lee `horario.json`.

## Variables de entorno en Vercel

Crear en Project → Settings → Environment Variables:

- `ADMIN_USER` — por ejemplo `administracion`
- `ADMIN_PASSWORD` — contraseña administrativa (Secret)
- `GITHUB_TOKEN` — Fine-grained Personal Access Token (Secret)
- `GITHUB_OWNER` — usuario u organización propietaria del repositorio
- `GITHUB_REPO` — `modulosmuro`
- `GITHUB_BRANCH` — `main`
- `GITHUB_PATH` — `horario.json`

Después de crear o modificar variables, hacer un redeploy.

## Token de GitHub

Usar un Fine-grained Personal Access Token restringido solo al repositorio `modulosmuro` con:

- Repository access: Only select repositories → `modulosmuro`
- Repository permissions → Contents → Read and write

No pegar el token en ningún HTML ni JavaScript público.

## URLs

En Vercel:

- Visor: `https://TU-PROYECTO.vercel.app/`
- Planificador: `https://TU-PROYECTO.vercel.app/planificador`

Si también activas GitHub Pages, el visor puede publicarse allí desde `index.html`. La publicación administrativa debe hacerse desde Vercel porque `/api/publicar` necesita secretos del servidor.
