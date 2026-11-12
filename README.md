# Planificación Mallsport v4

Sistema integrado con dos planificadores independientes.

- `/planificador-muro`: Muro de escalada.
- `/planificador-airtrail`: Airtrail + Tirolesa.
- `/planificador`: menú simple de acceso.
- `/`: visor público por actividad y fecha.

## Datos

- `data/personal.json`: base compartida de personal, apodos, horarios predeterminados y competencias Airtrail.
- `data/muro/YYYY-MM-DD.json`: jornadas publicadas de Muro.
- `data/airtrail/YYYY-MM-DD.json`: jornadas publicadas de Airtrail + Tirolesa.

## Variables de Vercel

Reutiliza: `ADMIN_USER`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`. No hace falta cambiar `GITHUB_PATH`; simplemente deja de utilizarse.

La base compartida y las publicaciones se escriben en GitHub mediante las funciones de `/api`.
