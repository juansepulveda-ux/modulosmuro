# Módulos educativos Mallsport v12

Actualización sobre v11: declaración pública, familias, firma y pago presencial.

**Para actualizar una instalación existente:** lee `ACTUALIZAR_V12.md`.
Para una instalación nueva: `INSTALACION.md`.

No se requieren dependencias nuevas, servicio de correo ni variables adicionales sobre v11.

- `/declaracion`: adultos y menores, recuperación consentida por RUT o protegida por clave, firma y aceptaciones.
- `/elegir-modulos`: actividades y horarios de hoy; cupos pendientes hasta cancelación del personal.
- `/inscripciones`: declaración y pago con casillas; pagos con hora y usuario.
- `/checkin`: llegada después del pago; cancelación de pendientes por recepción.
- `/declaracion-registro?id=...`: documento firmado, solo para personal o cliente autorizado; imprimible.

Los planificadores existentes y sus datos se conservan. El ZIP no incluye `data/`.

## Pruebas locales

```sh
npm test
npm run dev
```

La demostración utiliza datos ficticios en memoria y conexiones simuladas. El envío real de datos se hace únicamente al desplegar las funciones en Vercel y configurar la base como indica la guía.
