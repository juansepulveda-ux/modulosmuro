> Documento histórico de v12. Para esta entrega usa primero ACTUALIZAR_V13.md; v13 sustituye la retención indefinida de cupos y agrega configuración, archivo y exportación.

# Actualización v12 — declaración, familias y pago

## Instalar sobre la versión actual

1. Respalda el repositorio y descomprime `modulosmuro_v12_declaraciones_pagos.zip`.
2. En el mismo repositorio de GitHub, reemplaza los archivos por el contenido de la carpeta `modulosmuro_v12`. Incluye las carpetas completas `api`, `lib` y `assets`, y las páginas nuevas.
3. **Conserva tu carpeta `data` actual completa**, incluyendo monitores y jornadas. El ZIP no trae una copia que pueda sobrescribirla.
4. Conserva las variables actuales de Vercel, la base Upstash y `DATA_NAMESPACE`. **No hay variables nuevas, correos por configurar ni nuevas dependencias.**
5. Espera al despliegue de Vercel. Recarga las pestañas del personal para cargar las páginas nuevas.
6. El QR para clientes debe apuntar a **tu dominio actual seguido de `/declaracion`**.

No se ha publicado en tu proyecto desde este trabajo. El paquete está preparado para actualizar el repositorio existente.

## Recorrido del cliente

1. Elegir si participa el adulto, menores o ambos.
2. Ingresar RUT. En primera visita, marcar esa opción y elegir entre:
   - Crear una clave de al menos 8 caracteres (predeterminado).
   - Autorizar expresamente que el perfil familiar se recupere con el RUT desde cualquier dispositivo, sin clave.
3. Completar nombre, RUT, nacimiento, teléfono y correo del adulto. Agregar nombre y nacimiento de cada menor; marcar los que participan hoy.
4. Leer la declaración, aceptar riesgos, términos y privacidad, confirmar la calidad de apoderado cuando corresponda y firmar con el dedo.
5. Confirmar. El registro firmado se guarda antes de elegir módulos. Si no hay cupos, los datos y la declaración quedan guardados.
6. Seleccionar Muro y/o Airtrail/Tirolesa para cada participante. Las actividades de un mismo participante no pueden solaparse. En Airtrail/Tirolesa, marcar ambas consume un cupo de cada una.
7. Confirmar la inscripción y acercarse a pagar a recepción. **No se cobra por internet**.

Solo se ofrecen módulos publicados, operativos y que aún no comienzan durante el día actual de Santiago. Un participante puede reservar Muro y Airtrail/Tirolesa con horarios compatibles. Gravity está incluido en el texto solicitado de la declaración; no se agregó un planificador ni venta de módulos Gravity.

## Ventas y recepción

- `/inscripciones`: «Declaración jurada» y «Pagado» son casillas independientes. Una declaración web queda marcada automáticamente y enlazada al documento firmado.
- «Ver lista» muestra origen QR, referencia de la reserva y casilla Pagado. «Actualizar lista» trae los cambios mientras la lista está abierta.
- Ventas o administración marca Pagado después de cobrar. Se guarda hora del servidor y usuario. Desmarcar también deja historial.
- Cada inscripción tiene su propio pago. Si una familia reserva varias inscripciones, confirmar todas las cobradas.
- **No hay vencimiento automático.** Un pendiente sigue ocupando cupo hasta que ventas, administración o recepción lo cancele.
- Recepción no registra pagos. En `/checkin` puede cancelar una inscripción pendiente o registrar llegada de una pagada.
- No se puede retirar el pago, cancelar o mover de módulo a alguien con check-in; primero deshacer su llegada.
- Las pantallas y `/hoy` muestran los participantes nuevos después de confirmar el pago. La disponibilidad sí descuenta los pendientes.
- La declaración y el pago son controles separados. Revisar una declaración pendiente sigue siendo responsabilidad operativa del personal.

## Compatibilidad con inscripciones anteriores

Las inscripciones v11 no tenían información de pago. Se mantienen, con el mensaje «Pago sin registro anterior», sin asumir que fueron cobradas ni bloquear su funcionamiento previo. El personal puede registrar el estado al revisarlas. Si se edita una inscripción antigua y se guarda Pagado desmarcado, pasa a pendiente y se aplica el comportamiento nuevo.

Los perfiles familiares no se infieren de las antiguas inscripciones: no contenían RUT ni fecha de nacimiento. El cliente debe completar `/declaracion` una primera vez.

## Datos y documentos

- Perfiles, firmas e inscripciones viven en la base Redis existente; no se publican en GitHub.
- Las claves de clientes se guardan con hash scrypt y salt aleatorio. No se pueden consultar en texto plano.
- La recuperación con RUT es una modalidad abierta y voluntaria; **no verifica identidad**. Un tercero que conozca ese RUT podrá consultar y reutilizar el perfil consentido, incluidos los menores. La opción muestra esta consecuencia y se registra el texto del consentimiento y su fecha. No debe describirse al cliente como acceso privado.
- La recuperación solo con RUT no permite consultar las firmas de visitas anteriores. El personal sí puede leer las declaraciones vinculadas a una inscripción. En la sesión donde se firma, el cliente puede abrir e imprimir su declaración.
- Las declaraciones guardan una copia de los datos, firma, texto local, enlaces de términos y privacidad, versión, fecha del servidor, consentimientos y huella SHA-256. Modificar el perfil después no modifica una declaración anterior.
- Los sitios externos de términos/privacidad se enlazan; esta versión no archiva automáticamente una copia de sus páginas. La huella del registro no equivale a certificación de identidad, firma avanzada, sellado de tiempo ni archivo inviolable frente a un administrador de la base.
- El texto está adaptado para adulto, menores o ambos. La cláusula de exención total se reemplazó por aceptación de riesgos preservando responsabilidades legales. Debe revisarse con asesoría jurídica antes de usarlo como documento definitivo. Referencia consultada: artículo 16, letra e), Ley 19.496, texto refundido https://www.bcn.cl/leychile/navegar?i=1160403 .
- La página de privacidad enlazada contiene una referencia al Ministerio de Ciencia ajena a este flujo; conviene corregir ese contenido y ajustar ambos documentos a la operación real. No se modificó WordPress.
- La edad se calcula con la fecha de nacimiento. El adulto firmante debe tener 18 años o más; menores guardados que ya cumplieron 18 deben retirarse de la lista de menores y completar su propia declaración.
- Hasta 20 menores por perfil y hasta 42 inscripciones por confirmación. Hay límites de intentos de acceso y guardados para reducir abuso.
- Esta versión no incluye recuperación automática de claves ni una pantalla para gestionar perfiles de clientes. Si alguien pierde su clave, el personal puede inscribirlo manualmente en `/inscripciones`; la recuperación del perfil requiere intervención técnica tras verificar su identidad. Tampoco permite cambiar la modalidad de acceso desde el formulario una vez creada la cuenta.
- Se conserva la arquitectura de v11 por jornada. Controlar capacidad de almacenamiento, respaldos y retención en Upstash; no activar expulsión automática de registros.

## Pruebas y verificación

24 pruebas automatizadas: sistema anterior, validaciones de RUT/edad/firma, recuperación con clave o RUT consentido, protección de firmas históricas, roles, CSRF, límites de intentos, cupos de ambas actividades, guardado familiar sin resultados parciales, concurrencia del último cupo, idempotencia, pago, check-in y cancelación por recepción.

Prueba en navegador con datos ficticios: adulto y menor, firma dibujada, reserva de ambas actividades, aparición en ventas, confirmación de pago con hora/usuario, check-in, cancelación de un pendiente por recepción y recuperación del perfil con RUT tras cerrar sesión. La interfaz está diseñada para móvil, pero esta prueba no reemplaza una prueba en teléfonos físicos.

Los servicios GitHub/Redis se simularon en las pruebas. Antes de comenzar la operación, hacer una inscripción de prueba en el dominio real, confirmar pago, revisar pantallas, registrar y deshacer check-in y cancelar la inscripción. No se realizaron cobros reales ni modificaciones en tu despliegue.
