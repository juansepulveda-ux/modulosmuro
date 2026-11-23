# Módulos educativos Mallsport v11

Planificadores existentes + sesiones por rol + inscripciones y cupos + check-in + pantallas y consulta pública de hoy.

**Antes de subir:** lee `INSTALACION.md`. Requiere configurar Redis REST y las cuentas en Vercel. No incluye datos de producción; conserva tu carpeta `data` actual.

- `npm test`: pruebas automáticas.
- `npm run dev`: demostración local con datos ficticios.
- Producción: HTML y funciones Node de `/api`, usando `vercel.json`.

Las inscripciones reales se guardan en Redis. Las jornadas y monitores siguen en GitHub.
