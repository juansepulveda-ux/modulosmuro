# Actualizar a v13

Entrega preparada el 24 de noviembre de 2026. No se cambió el despliegue ni la base de producción.

## Actualización desde v11/v12

1. Conserva una copia del repositorio actual y un respaldo de Redis desde tu proveedor. El Excel facilita revisión de operación, pero no sustituye un respaldo completo de firmas, perfiles e historial.
2. Descomprime `modulosmuro_v13_configuracion.zip` y abre `modulosmuro_v13`. Sube **su contenido** a la raíz del mismo repositorio, reemplazando archivos coincidentes. No subas la carpeta contenedora como subcarpeta.
3. Conserva `data/` y especialmente `data/personal.json`, `data/muro/` y `data/airtrail/`. No vienen en este ZIP. Conserva tus variables y el mismo `DATA_NAMESPACE` de producción.
4. Usa el proyecto Vercel existente, preset Other, Node.js 20 o superior. No hay dependencias nuevas ni variables obligatorias adicionales. Las funciones y HTML deben actualizarse juntos.
5. Espera el despliegue y recarga las pestañas. Entra con el administrador actual en `/login`, abre `/configuracion`, revisa los valores y guarda.
6. Realiza una prueba en tu dominio: publicar jornada, asignar cupos, reserva QR, pago, llegada, exportación y cancelación. Las pruebas de esta entrega usan servicios simulados.

## Reglas iniciales y alcance

| Ajuste | Inicial | Comportamiento |
|---|---|---|
| Ingreso después del inicio | Sí | Desmarcar cierra las altas al comenzar. |
| Plazo después del inicio | 20 min | Al alcanzar inicio +20, no se admiten altas ni cambio de módulo/actividad. Si termina antes, cierra al terminar. |
| Alerta de edad | Menor de 5 | Confirmación visible, no prohibición. Con 0 no se activa. |
| Módulo presente en check-in | 30 min | Visible durante el minuto 30; se oculta desde el 31 si el filtro está activado. |
| Anulación de impagos por actividad llena | Sí | Se evalúa desde 15 min antes del inicio. |
| Colores | Naranjo / verde / azul | Inscripciones / check-in / formulario de clientes, respectivamente. |

**Los valores iniciales se aplican desde que arranca v13, incluso antes del primer guardado de configuración.** Una reserva impaga antigua puede anularse en la primera consulta si cumple la condición. Revisa o confirma pagos pendientes antes de actualizar si corresponde; no se convierten automáticamente en pagados.

### Altas, correcciones y bloqueo

- Las ventanas se validan en el servidor usando America/Santiago, para el vendedor y el cliente. No se puede mover desde un módulo cuyo plazo cerró ni hacia un destino cerrado.
- Se permite corregir nombre, edad, casilla de declaración y observaciones después del plazo. Se guarda historial. En una inscripción con declaración firmada, la corrección operativa no modifica el documento original ni la ficha familiar; si hay un cambio de identidad real, corresponde una declaración nueva.
- Con check-in registrado, primero se debe deshacer para mover, cambiar actividades, cancelar o quitar pago. Pago, cancelación y check-in mantienen sus permisos propios.
- El vendedor y el administrador pueden bloquear todo un módulo y escribir el motivo. Se conservan los inscritos. Impide nuevas altas y entradas a ese módulo; pueden salir hacia otro antes del plazo. Desbloquear no reabre un horario ya cerrado.
- Los cupos por día y excepciones por módulo continúan en `/inscripciones`; 0 cierra el producto. No se reduce por debajo de los inscritos activos.

### Reservas impagas

Ejemplo: módulo de las 15:00, límite 15 minutos. Antes de las 14:45 se conservan. Desde las 14:45, si un producto está lleno, se anulan todas las inscripciones activas explícitamente impagas que ocupan ese producto. La saturación se toma antes de cancelar para aplicar la misma regla al conjunto. Si no está lleno, se mantienen y se vuelve a comprobar en futuras revisiones.

- Airtrail y Tirolesa tienen cupos independientes. Si uno se llena, se anulan las reservas impagas que ocupan ese producto. Una inscripción que incluya ambos se anula completa y libera ambos.
- Se conservan pagados, registros con check-in y registros heredados cuyo pago no se capturó (`paid` ausente). Las anulaciones incluyen fecha, motivo y autor Sistema; quedan visibles en el historial de la lista del módulo y en Excel.
- Una reserva impaga nueva que complete el cupo después del límite también puede anularse inmediatamente. El cliente recibe el estado de cada inscripción; ventas recibe un aviso. En ese caso cobra y registra una nueva inscripción pagada solo si hay cupo y el horario sigue abierto.
- Las inscripciones anuladas no se reactivan automáticamente. Si corresponde, crea una nueva dentro de las reglas vigentes.
- La cancelación libera cupos; no procesa dinero, cobros ni devoluciones. El sistema registra confirmaciones de cobro presencial.

### Ejecución automática en Vercel Hobby

Se comprueba al leer la jornada, registrar/modificar participantes, consultar el catálogo de clientes, mostrar `/hoy` o `/pantalla`, y al comenzar la exportación de hoy. Recepción y páginas públicas consultan cada 20 segundos; ventas, cada 30 segundos, incluso si tiene el editor abierto (sin reemplazar lo que escribe).

**Con todas esas páginas cerradas no hay ejecución autónoma habilitada en esta entrega.** La siguiente consulta aplica la regla; el instante guardado es el de la comprobación efectiva. También influyen suspensión de pestañas, conectividad y tiempos de respuesta. No se garantiza puntualidad exacta al segundo.

Hobby no permite el cron nativo cada minuto. No se agregó un cron que vuelva incompatible el despliegue. Para ejecutar la regla independientemente de las pantallas, un administrador técnico puede configurar un programador HTTP externo:

1. Generar un secreto aleatorio y añadir `CRON_SECRET` a las variables de Production; volver a desplegar.
2. Programar una llamada GET cada minuto a `https://modulosmuro.vercel.app/api/mantenimiento`.
3. Configurar la cabecera `Authorization: Bearer <valor de CRON_SECRET>` en el servicio. No colocar el secreto en la URL, en el repositorio ni en páginas públicas.
4. Comprobar que sin cabecera devuelve 401 y con la cabecera devuelve 200. La respuesta no contiene datos de clientes. El endpoint comprueba la jornada actual de Santiago y es seguro de reintentar.
5. Habilitar avisos de fallos en el programador y revisar sus condiciones/costos. Este servicio no está creado ni conectado por el ZIP.

La tarea libera reservas reales conforme a la configuración: probar primero con otra base o prefijo. No es necesario configurar correo para el sistema de declaraciones.

## Cuentas y sesiones

Administrador: continúa en `ADMIN_USER` / `ADMIN_PASSWORD` o cuenta admin de `USERS_JSON` en Vercel. No se muestra su clave en la web.

Vendedores y recepción: `/configuracion` permite crear, cambiar rol, cambiar clave o desactivar. Claves nuevas de 8 a 200 caracteres, guardadas mediante scrypt. Campo vacío conserva la clave. Las cuentas del mismo nombre definidas aquí reemplazan a las de Vercel; desactivar no vuelve a habilitar la cuenta anterior. Se invalida la sesión previa al guardar cambios de la cuenta. No hay visualización de claves existentes.

Las sesiones del personal duran hasta 12 horas; cerrar una pestaña no es cerrar sesión. Usa Cerrar sesión en equipos compartidos. El cliente mantiene una sesión independiente de hasta 4 horas.

## Excel

`/datos`, solo administrador. Descarga `.xlsx` real, sin instalar una biblioteca externa en el navegador.

- Participaciones: una fila por inscripción y producto, datos del adulto y participante cuando existe declaración vinculada, registro, pago, check-in, anulación, observación y marca de archivo. Muro es otra inscripción con su propia hora de llegada.
- Personas: todos los perfiles actuales de adultos y menores, incluso sin reserva. El rango de fechas solo filtra Participaciones por fecha de módulo, no esta hoja.
- Leer primero: explica los campos y cómo contar. Airtrail + Tirolesa repite registro/pago/check-in: no sumar filas como si fueran personas.
- Pagó sin check-in = Sí si consta pago y no hay llegada. Revisar también Estado inscripción y Archivada como prueba; una anulación de un pagado no equivale a devolución.
- Campos no capturados antiguamente quedan vacíos o Sin registro anterior. Los clientes inscritos manualmente pueden no tener datos familiares. Fechas y horas en Chile, como texto ordenable. Datos de usuario se guardan como texto, no como fórmulas.
- Descarga por páginas; no es una fotografía transaccional de toda la base. Evita archivar mientras descargas. Para volúmenes grandes, usa rangos menores. El rango de limpieza tiene un máximo de 367 días por operación.

## Limpieza y compatibilidad de datos

Se añadió **archivo reversible de inscripciones por fechas**, no un botón para destruir toda la base. Revisa fechas y cantidad, escribe la frase de confirmación y archiva. Retira todas las inscripciones del rango, no puede adivinar cuáles son pruebas: no uses rangos mezclados con ventas reales. Puedes incluir archivos en Excel y restaurar desde la misma página.

Cada día se valida contra la versión de la vista previa. Si alguien modificó ese día, se detiene sin sobrescribirlo; los días ya archivados se indican. Restaurar comprueba módulos, duplicados y cupos; no reemplaza datos actuales. No borra ni cambia familias, firmas, monitores, planes, cupos, bloqueos, usuarios o configuración. **No libera espacio en Redis.**

Para nuevas pruebas, usar un despliegue Preview con base separada o `DATA_NAMESPACE` diferente, y rama/repositorio de GitHub separado para las planificaciones. No cambiar el prefijo Production para ocultar datos: parecería que desaparecieron. No desactivar la persistencia ni activar expulsión de claves por memoria llena.

Los registros antiguos se normalizan al leerlos: esquema de jornada 3 con campos nuevos por defecto, conservando participantes y valores anteriores. Se guarda el nuevo esquema cuando se modifica la jornada. No se borra ni se inventa el pago de registros antiguos. Se rechazan esquemas de datos superiores al soportado. Volver a código antiguo puede ignorar reglas nuevas: no hacer rollback de aplicación sin revisar la compatibilidad de la base y su respaldo.

## Verificación de la entrega

36 pruebas automatizadas con Redis y GitHub simulados: límites, correcciones después del plazo, bloqueo, edad, anulación condicional, cupos simultáneos, permisos, revocación de cuentas, archivo/restore/conflictos, Excel por producto, migración, endpoint programado, declaraciones y privacidad. XLSX verificado con openpyxl (texto, acentos, filtros, celdas sin fórmulas). Revisión de navegador sobre datos ficticios: configuración guardada, bloqueo visible, descarga Excel y check-in con hora. No sustituye la comprobación de tu despliegue y conexiones reales.
