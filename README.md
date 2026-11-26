# Módulos educativos Mallsport v14

Base central de monitores, dotación diaria e importación por actividad en ambos planificadores. Alejandra utiliza una cuenta de administrador, como el resto de responsables de planificación.

**Actualización desde v13:** `ACTUALIZAR_V14.md`. **Uso diario:** `GUIA_DOTACION_V14.md`. **Instalación nueva:** `INSTALACION.md`.

## Nuevo flujo de trabajo

1. `/monitores`: fichas, actividades habilitadas y capacitaciones de Airtrail/Tirolesa.
2. `/dotacion`: fecha, monitores que trabajan, ingreso, salida y actividad de ese día.
3. `/planificador-muro` o `/planificador-airtrail`: seleccionar la misma fecha e importar su dotación. Reemplaza el personal y descarta el plan sin publicar de ese editor.
4. Ajustar módulos/descansos, generar, revisar y publicar.

La importación trae solo el personal correspondiente a la actividad, conserva las capacitaciones y respeta las horas de ingreso y salida al minuto. Las fichas antiguas requieren una revisión explícita antes de asignarlas. Un monitor marcado para ambas actividades aparece en ambos planificadores: el administrador debe revisar que las asignaciones no se superpongan.

## Páginas existentes

- `/planificador`: menú administrador.
- `/configuracion`: reglas, cuentas de vendedores/recepción y colores.
- `/datos`: Excel de clientes/participaciones y archivo recuperable de inscripciones.
- `/inscripciones`: cupos, altas, correcciones, pagos, anulaciones y bloqueo de módulos.
- `/checkin`: llegadas y filtro de módulos pasados.
- `/declaracion` y `/venta`: datos familiares y firma; `/elegir-modulos`: reservas de hoy.
- `/hoy`: consulta familiar; `/pantalla?tipo=muro` y `?tipo=airtrail`: pantallas automáticas.
- `/`: visor de horarios de monitores publicados.

## Datos y despliegue

El ZIP excluye datos de producción y secretos. Conserva `data/`, especialmente `data/personal.json`, todas las variables de Vercel y el mismo `DATA_NAMESPACE`. No hay dependencias ni variables obligatorias nuevas.

La base central continúa en GitHub; la dotación por fecha se guarda en Redis. Guardar o importar dotación no modifica jornadas publicadas ni inscripciones. No se ha desplegado esta entrega en producción.

Las reglas de reservas de v13 siguen vigentes. Con todas las páginas cerradas no hay un temporizador autónomo activado; el endpoint para un programador externo se documenta en `ACTUALIZAR_V13.md`.

## Verificación local

```sh
npm test
npm run dev
```

45 pruebas automatizadas con GitHub/Redis simulados: incluyen permisos, conservación de monitores, versiones concurrentes, validación de capacidades, filtrado por actividad y planificación dentro de los horarios exactos. Se comprobó en navegador el alta de una ficha, guardado de dotación, validación de horarios e importación en ambos planificadores con datos ficticios. Esto no sustituye una comprobación en el despliegue real.
