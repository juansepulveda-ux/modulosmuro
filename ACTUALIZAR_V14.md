# Actualización v14 — Monitores y dotación diaria

## Subir a GitHub

1. Descarga un respaldo del repositorio actual.
2. Descomprime `modulosmuro_v14_monitores_dotacion.zip` y abre `modulosmuro_v14`.
3. Sube **el contenido de esa carpeta** a la raíz de tu repositorio actual. Reemplaza los archivos coincidentes y agrega los nuevos. No subas el ZIP como un único archivo ni dejes todo dentro de otra carpeta.
4. **Conserva la carpeta `data/` que ya tienes**, incluyendo `data/personal.json`, `data/muro/` y `data/airtrail/`. Este ZIP no incluye esos datos.
5. Conserva las variables actuales de Vercel, la base Redis y su `DATA_NAMESPACE`. No necesitas claves, servicios ni variables nuevas.
6. Espera que Vercel termine el despliegue y recarga las pestañas antiguas. Ingresa con tu administrador actual.

El paquete contiene 11 funciones API y no agrega tareas programadas. Mantiene el esquema de despliegue existente: HTML y funciones Node.js, Framework Preset Other, sin compilación. No ejecuta una migración destructiva ni borra clientes.

## Primera vez

En Administración aparecen **Base de monitores** y **Dotación diaria**.

La base de monitores anterior se conserva. Las fichas antiguas aparecen como **por revisar**: abre Editar, verifica Muro y/o Airtrail/Tirolesa, revisa las capacitaciones y guarda cada ficha una vez. Esto evita dar por confirmadas actividades que el archivo anterior no registraba explícitamente. Los identificadores y las capacidades anteriores válidas se conservan. Si no existe una base guardada, crea las fichas en esta pantalla.

Alejandra entra con una cuenta de administrador y tiene los mismos permisos que cualquier administrador. No se incorpora un rol separado de Operaciones.

## Qué cambia en los planificadores

- Se abren sin personal precargado. Selecciona la fecha y pulsa **Importar dotación del día**.
- Muro importa solo quienes tienen Muro marcado en la dotación de esa fecha. Airtrail/Tirolesa importa solo quienes tienen esa actividad marcada.
- La importación reemplaza todos los nombres del editor, selecciona los importados y descarta su planificación sin publicar. Pide confirmación antes de hacerlo.
- Se copian ingreso, salida y capacitaciones. Los horarios admiten minutos exactos, como 10:07–18:43; las grillas de módulos conservan su funcionamiento.
- Cambiar la fecha después de importar retira esa dotación del editor: vuelve a importar el día correcto.
- Los ajustes manuales del personal dentro del planificador afectan solo el borrador. La base central se edita en `/monitores`.
- Importar no borra la base central, la dotación guardada ni las jornadas publicadas. Generar y publicar siguen siendo pasos explícitos.
- Si Alejandra modifica la dotación después de que tú la importaste, vuelve a importarla y genera/revisa de nuevo. No se actualizan automáticamente planes abiertos ni publicados.

## Actividades y capacidades

Cada ficha permite habilitar Muro, Airtrail/Tirolesa o ambas. Para Airtrail/Tirolesa marca las funciones para las que está capacitado: Equipamiento, Lanzamiento, Freno y Poleas/arneses. La función preferida es opcional y debe estar entre las habilitadas; no sustituye una capacitación.

La dotación diaria solo permite asignar actividades habilitadas en la ficha. Un monitor inactivo, pendiente de revisión o cuya capacidad cambió debe corregirse en la base/dotación antes de importar. Desactivar conserva su ficha y las jornadas anteriores.

**Ambas actividades significa que aparecerá en ambos planificadores.** Esta versión no coordina automáticamente los dos horarios: revisa que no quede trabajando simultáneamente en Muro y Airtrail/Tirolesa. No es una asignación automática entre actividades.

## Guardado y conservación

- Una dotación por fecha, con un intervalo de ingreso/salida por monitor dentro del mismo día. No contempla turnos nocturnos ni dos intervalos separados para una misma persona.
- Guardar una dotación vacía requiere confirmación. Importarla reemplaza la lista del editor por una lista vacía.
- Base central: `data/personal.json`, formato versión 2, usando la conexión GitHub existente.
- Dotación: Redis, claves separadas por fecha dentro del mismo namespace; no vence automáticamente.
- Las escrituras comprueban versiones. Si otra persona guardó cambios primero, recarga y revisa antes de guardar otra vez. No sobrescribe silenciosamente la versión anterior.
- El archivo de inscripciones de `/datos` no elimina fichas de monitores ni dotaciones diarias.
- Mantén los respaldos habituales de GitHub y Redis.

## Comprobación después de actualizar

Revisa una ficha existente, guarda una dotación para una fecha de trabajo, impórtala en Muro y Airtrail/Tirolesa y comprueba nombres, horarios y capacidades antes de publicar. El código pasó 45 pruebas automatizadas con servicios simulados y comprobación del flujo en navegador. No se conectó a tu base real ni se publicó desde este trabajo.

Las reglas de configuración, reservas, clientes y check-in de v13 siguen vigentes; consulta `ACTUALIZAR_V13.md` para ellas.
