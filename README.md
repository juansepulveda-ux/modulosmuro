# Módulos educativos Mallsport v13

Configuración de horarios, cuentas de personal y colores; bloqueo de módulos; reservas impagas con anulación condicional; exportación Excel y archivo recuperable de pruebas. Mantiene planificadores, declaraciones firmadas, pago presencial y check-in.

**Instalación existente:** lee `ACTUALIZAR_V13.md`. Para una instalación nueva: `INSTALACION.md`.

## Páginas principales

- `/planificador`: menú administrador y creación/publicación de jornadas.
- `/configuracion`: reglas, vendedores, recepcionistas y colores (solo administrador).
- `/datos`: Excel de clientes/participaciones y archivo recuperable (solo administrador).
- `/inscripciones`: cupos, alta, correcciones, pagos, anulaciones y bloqueo de módulos.
- `/checkin`: llegada con hora y usuario; filtro configurable de módulos pasados.
- `/declaracion` (también `/venta`): formulario familiar y firma.
- `/elegir-modulos`: reserva de actividades de hoy.
- `/hoy`: todos los módulos y participantes confirmados de hoy.
- `/pantalla?tipo=muro` o `?tipo=airtrail`: pantalla automática.

El ZIP excluye `data/`, claves y datos de clientes. Conserva tus datos actuales al actualizar.

## Vercel Hobby

Sin dependencias nuevas ni variables obligatorias nuevas. La revisión de reservas se hace al consultar o modificar la jornada y mediante las actualizaciones de las páginas operativas. **Con todas las páginas cerradas no hay un temporizador autónomo activado.** Para ello se incluye un endpoint protegido para un programador externo: instrucciones en `ACTUALIZAR_V13.md`. El paquete no configura ni contrata ese servicio.

## Verificación local

```sh
npm test
npm run dev
```

36 pruebas automatizadas, con Redis/GitHub simulados. El servidor demo utiliza únicamente datos ficticios en memoria. Se comprobó además el guardado de configuración, descarga Excel, bloqueo por vendedor y check-in en navegador; el XLSX se abrió con openpyxl para verificar su estructura y que datos que empiezan por `=` sigan siendo texto.

No se ha desplegado esta entrega en producción. Los manuales de administrador, vendedor y recepcionista se entregan separados, en PDF y LaTeX.
