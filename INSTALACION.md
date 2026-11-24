# Módulos educativos — Inscripciones y recepción

## Qué está incluido

Ampliación del proyecto existente para GitHub y Vercel. Mantiene los dos planificadores y el visor de monitores, e incorpora:

| Dirección | Uso |
|---|---|
| `/declaracion` | Formulario móvil, datos familiares y firma |
| `/elegir-modulos` | Selección de actividades y módulos de hoy |
| `/declaracion-registro?id=...` | Lectura autorizada e impresión de una declaración |
| `/configuracion` | Reglas, cuentas de ventas/recepción y colores |
| `/datos` | Excel y archivo recuperable de pruebas |
| `/venta` | Alias del formulario de clientes, color azul |
| `/login` | Inicio de sesión del personal |
| `/planificador` | Menú de administración |
| `/planificador-muro` | Planificador Muro existente con sesión |
| `/planificador-airtrail` | Planificador Airtrail/Tirolesa existente con sesión |
| `/inscripciones` | Ventas, cupos e inscripciones por día |
| `/checkin` | Recepción: llegada y hora registrada por servidor |
| `/pantalla?tipo=muro` | Pantalla automática del Muro |
| `/pantalla?tipo=airtrail` | Pantalla automática Airtrail/Tirolesa |
| `/hoy` | Consulta pública de todos los módulos de hoy |
| `/` | Visor existente de horarios de monitores |

El código está preparado y probado localmente. No se ha desplegado en tu Vercel ni conectado a una base real desde este trabajo.

## 1. Preparar la base compartida

Las jornadas y la base de monitores siguen guardándose en GitHub. Los perfiles familiares, declaraciones firmadas, inscripciones, pagos, check-ins y sesiones usan una base Redis de Upstash independiente, accesible por HTTPS. No se escriben datos de participantes ni claves en GitHub.

Crea una base de Upstash Redis y copia su **REST URL** y su **REST Token de lectura/escritura**. No uses el token de solo lectura. Documentación oficial: https://upstash.com/docs/redis/features/restapi

Mantén los datos persistentes, sin una política de expulsión de registros por falta de memoria. Configura respaldo en el proveedor y controla almacenamiento/uso. Esta implementación conserva las jornadas registradas; no las elimina automáticamente.

## 2. Configurar variables en Vercel

En el proyecto actual, agrega estas variables de entorno para Production. Si pruebas un despliegue Preview, usa otra base o un `DATA_NAMESPACE` distinto para no mezclar datos.

| Variable | Qué poner |
|---|---|
| `UPSTASH_REDIS_REST_URL` | REST URL de la base |
| `UPSTASH_REDIS_REST_TOKEN` | Token de lectura/escritura de la base |
| `AUTH_SECRET` | Secreto aleatorio propio de al menos 32 caracteres |
| `SELLER_USER` | Nombre de usuario del vendedor |
| `SELLER_PASSWORD` | Contraseña propia del vendedor |
| `RECEPTION_USER` | Nombre de usuario de recepción |
| `RECEPTION_PASSWORD` | Contraseña propia de recepción |

Se conservan las variables existentes: `ADMIN_USER`, `ADMIN_PASSWORD`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN` y `GITHUB_BRANCH` (por defecto `main`). El token GitHub necesita acceso de lectura/escritura al contenido del repositorio.

También se aceptan `KV_REST_API_URL` y `KV_REST_API_TOKEN` como alternativa a los dos nombres Upstash. `DATA_NAMESPACE` es opcional; por defecto vale `modulosmuro:v1`. No cambies este prefijo en producción sin migrar los datos.

Puedes generar AUTH_SECRET en tu equipo, sin compartirlo en el chat:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Para cuentas individuales adicionales, configura `USERS_JSON` como un arreglo de objetos con `username`, `password` y `role`. Los roles admitidos son `admin`, `vendedor` y `recepcionista`. No repitas usuarios ya definidos mediante variables individuales. No se requieren variables de correo. Las cuentas individuales permiten identificar a cada persona en el check-in. En v13, el administrador puede crear y modificar vendedores y recepcionistas en `/configuracion`; esas cuentas se guardan con hash scrypt en Redis. La cuenta administradora se mantiene en Vercel. Una cuenta guardada en configuración reemplaza a la del mismo nombre de las variables de entorno.

## 3. Subir el código

1. Conserva un respaldo del repositorio actual.
2. Descomprime el ZIP y abre la carpeta `modulosmuro_v13`.
3. Sube su contenido a la raíz del mismo repositorio. Reemplaza los archivos coincidentes e incorpora `assets`, `lib`, las API nuevas y las páginas nuevas.
4. **No borres las carpetas existentes `data/muro` y `data/airtrail`. No reemplaces tu `data/personal.json` actual.** El paquete excluye datos de producción para conservarlos.
5. Usa el mismo proyecto Vercel, con Node.js 20 o superior y Framework Preset “Other”. No requiere compilación; conserva el despliegue de HTML y funciones de `/api`.
6. Vuelve a desplegar después de configurar las variables. Entrarás por `/login` con tu administrador actual.

El cambio de autenticación requiere desplegar juntas las páginas y las API del paquete. Una pestaña abierta con la versión vieja debe recargarse.

## 4. Primera jornada

1. Administración publica los módulos con los planificadores habituales.
2. Ventas entra a `/inscripciones`, selecciona la fecha y configura los cupos del día.
3. Los cupos iniciales son **0**: se deben configurar antes de la primera inscripción. El 0 cierra las ventas de esa actividad.
4. “Cupos” en una tarjeta permite fijar una excepción para ese módulo. “Usar cupos del día” retira la excepción.
5. Inscribe nombre, edad, declaración jurada mediante casilla, pago mediante casilla y observaciones. También puedes dirigir a los clientes a `/declaracion` para que completen los datos y reserven por sí mismos. En Airtrail/Tirolesa puedes marcar una actividad o ambas. Ambas ocupa un cupo en cada una.
6. Ventas confirma el cobro marcando «Pagado». Recepción entra a `/checkin`, busca al participante y toca “Registrar llegada”. Solo permite check-in para el día actual de Chile. “Deshacer” guarda la corrección en el historial.
7. Abre la URL de cada pantalla en su televisor y activa “Pantalla completa”. Comparte `/hoy` con las familias.

## Funcionamiento y límites

- Sesión compartida entre las páginas del mismo dominio, válida hasta 12 horas o hasta cerrar sesión. La cookie es de sesión: normalmente se borra al cerrar el navegador, pero la restauración de sesiones de algunos navegadores puede conservarla. Cerrar una pestaña no equivale a cerrar sesión. Usa “Cerrar sesión” al terminar en un equipo compartido.
- Credenciales del personal en configuración del servidor; las claves de clientes se guardan con salt y hash scrypt en Redis, nunca en texto plano; cookie HttpOnly, SameSite Strict y Secure en producción. Cambiar una contraseña o AUTH_SECRET invalida las sesiones correspondientes.
- El servidor controla roles, cupos y revisiones. Las modificaciones de una jornada se serializan con un bloqueo Redis con vencimiento y validación de propietario al guardar. Si dos vendedores compiten por el último cupo, solo uno puede confirmarlo. Los reintentos con el mismo identificador no duplican una inscripción.
- Un módulo se identifica por actividad y minuto de inicio, no por su número ni monitor. Cambiar monitores o numeración conserva participantes. No se puede borrar, cambiar el inicio o dejar sin cobertura un módulo con inscritos activos: primero reubícalos o cancela sus inscripciones. Una modificación directa de JSON en GitHub evita este control; publica desde el planificador.
- No se admiten inscripciones en módulos sin responsable principal del Muro o sin las tres funciones obligatorias cubiertas de Airtrail. El apoyo del Muro sigue siendo opcional.
- Para mover o cancelar a alguien que ya hizo check-in, recepción debe deshacerlo primero. No se puede reducir un cupo por debajo de la cantidad inscrita.
- La declaración manual es una casilla. Las declaraciones de `/declaracion` tienen firma manuscrita capturada, fecha, texto y aceptaciones guardados como registro separado e inmutable. No se afirma que la firma sea avanzada ni certificada. El check-in confirma llegada y exige pago en inscripciones nuevas; no bloquea automáticamente a quien tenga declaración pendiente.
- Las pantallas conservan los módulos recién iniciados durante 10 minutos y muestran los dos siguientes. Listas largas rotan automáticamente. Si por intervalos muy cortos hay más de tres módulos vigentes, también rotan las tarjetas.
- La página familiar muestra todos los módulos de hoy, incluidos los finalizados. No admite consulta pública de participantes de otras fechas. La API aplica este límite, no solo la interfaz.
- Hora y fecha: `America/Santiago`, con reloj del servidor para check-in y sincronización de pantallas. Actualización pública cada 20 segundos. Si no se logra actualizar durante 90 segundos, la pantalla retira la lista para no presentarla como vigente.
- Las nuevas inscripciones pendientes de pago retienen cupo hasta cancelación del personal o anulación automática por la regla configurable de actividad llena y plazo de pago vencido; no aparecen en pantallas ni consulta familiar hasta marcarse pagadas. Recepción puede cancelar pendientes, pero solo vendedor/administrador confirman pagos.
- El formulario ofrece recuperación solo con RUT desde cualquier dispositivo únicamente por consentimiento explícito y desmarcado por defecto. Es una modalidad sin verificación de identidad: cualquier conocedor del RUT puede consultar y reutilizar el perfil consentido. No entrega firmas históricas; cada sesión de este tipo solo puede leer las declaraciones que firma. La alternativa exige clave de al menos 8 caracteres. No se envían correos.
- Las sesiones de clientes duran hasta 4 horas y usan una cookie distinta de la del personal. Los datos del cliente no se guardan en localStorage; sessionStorage contiene solamente referencias de declaración/reserva.
- Público: primer nombre e inicial del último apellido; actividad y horario. No expone edad, declaración, observaciones, identidad del vendedor ni datos de check-in.
- La página `/` original continúa mostrando planificación de monitores por fecha; la restricción de “solo hoy” aplica a `/hoy`, `/pantalla` y `/api/publico`, que contienen la información de participantes.
- La reserva usa Redis por jornada. Es adecuada como ampliación de este sistema; no se presenta como arquitectura validada para millones de inscripciones ni como sistema de pago. El crecimiento y los respaldos deben controlarse en el proveedor.

## Verificación realizada

36 pruebas automatizadas con Node: cupos combinados, excepciones, movimientos, cancelación, check-in, historial, roles, privacidad, medianoche en Chile, protección al republicar, cookies, cierre de sesión, cambios de contraseña y simulación concurrente del último cupo.

Los servicios externos se simularon en las pruebas: no equivalen a una prueba de la base real o del despliegue Vercel. En navegador se comprobó el alta de un participante ficticio en ambas actividades, la actualización de ambos contadores, su búsqueda y check-in con hora y usuario, y el acceso al planificador con sesión. La lógica de ventanas de pantalla se probó automáticamente.

Consulta `ACTUALIZAR_V13.md` para las reglas, la migración, la limpieza y la ejecución programada en Hobby. `ACTUALIZAR_V12.md` es el documento histórico de la incorporación de declaraciones; sus reglas de reserva quedan sustituidas por v13.

Antes del uso real, completa una inscripción de prueba en tu dominio, comprueba recepción y ambas vistas públicas, y cancélala al terminar.

## Prueba local opcional

Con Node.js 20 o superior:

```sh
npm test
npm run dev
```

Abre `http://localhost:3000/login`. La demostración muestra una franja amarilla y accesos para probar cada rol. Sus datos son ficticios y se borran al reiniciar. El servidor demo reemplaza las conexiones por simulaciones locales y no se usa en producción. No existen cuentas demo en las API desplegadas: las cuentas reales son únicamente las variables configuradas en Vercel.

## Reglas de v13

Después del despliegue, el administrador debe revisar `/configuracion`: alta tardía permitida hasta antes de inicio +20 minutos o del final del módulo; alerta para menores de 5; visibilidad de check-in por 30 minutos; anulación impaga desde 15 minutos antes del inicio cuando la actividad está llena. Estas reglas también se aplican a inscripciones ya existentes al consultarlas. Detalles y ejemplo en `ACTUALIZAR_V13.md`.
