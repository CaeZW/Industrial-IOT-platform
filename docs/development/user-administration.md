# Administración local de usuarios — Sprint 1, Slice 3

## Alcance y seguridad

Estos comandos administran únicamente PostgreSQL local. No requieren que NestJS
esté escuchando HTTP ni que Angular esté abierto; sí requieren PostgreSQL activo.
Se ejecutan desde la raíz del repositorio y compilan la API antes de operar.
La salida administrativa y de pruebas se genera en `.tools`, separada de `dist`,
para no borrar los archivos utilizados por la API en desarrollo. Los comandos
de administración no regeneran Prisma ni reinician el servidor; ejecuta
`db:generate` en la preparación inicial o después de cambiar el esquema.

La autoridad del comando es tu cuenta de Windows con acceso al proyecto y a su
configuración de base de datos. No son comandos para entregar a los operadores.
Las acciones quedan auditadas como `local-os:<usuario del sistema>`. La futura
administración HTTP deberá exigir permisos del usuario de la aplicación.

No se creó una página administrativa ni se habilitaron comandos de máquinas.

## Primera instalación

```powershell
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm users:init
```

La inicialización crea las 13 cuentas suministradas, todas activas, con sus roles
y alcances aprobados. Supervisor cubre toda la planta. Control de Calidad, I&D,
Producción y Validaciones cubren las once áreas indicadas, excluyendo
Mantenimiento e incluyendo Estabilidad.

Repetir `users:init` no cambia contraseñas, activación, roles ni alcances de
usuarios existentes. Tampoco restablece permisos editados de roles existentes.
`db:seed` administra el inventario, no las credenciales.

## Entrega de contraseñas

Cada cuenta nueva recibe una contraseña temporal aleatoria y diferente. El
comando indica la ruta de un archivo `.local/credentials-<identificador>.json`.
Ábrelo tú localmente para consultar las contraseñas y entregarlas por un canal
privado. Nunca adjuntes ese archivo a Git, correos colectivos o conversaciones.

El archivo se crea sin sobrescribir otro, con acceso restringido al usuario
actual y SYSTEM en Windows (0600 en POSIX). No se imprime su contenido.
Después de distribuirlo, elimínalo. La aplicación conserva únicamente hashes;
si se pierde una contraseña, usa el restablecimiento, no una consulta SQL.

El primer acceso permite solamente gestionar la sesión y reemplazar la
contraseña. La contraseña definitiva debe tener 8–128 caracteres. El cambio
invalida las otras sesiones del usuario y conserva el límite de ocho horas del
inicio de sesión original.

## Crear un usuario después

```powershell
pnpm users:create
```

El asistente solicita nombre, username, correo opcional, código de rol y
alcances. Genera y entrega la contraseña temporal con el mismo mecanismo privado.
No debes escribir contraseñas en argumentos del comando.

| Código de rol | Nombre |
| --- | --- |
| ADMINISTRATOR | Administrador |
| SUPERVISOR | Supervisor |
| MAINTENANCE | Mantenimiento |
| OPERATOR | Operador |
| QUALITY_CONTROL | Control de Calidad |
| PRODUCTION | Producción |
| RESEARCH_DEVELOPMENT | Investigación y desarrollo / I&D |
| VALIDATION | Validaciones |

Operador empieza con consulta del catálogo. Los permisos de control asignados a
otros roles son metadatos: no existe un endpoint de control físico en este slice.

## Consultar, activar, desactivar y restablecer

Sustituye `nuevo_usuario` por el username real:

```powershell
pnpm users list
pnpm users disable nuevo_usuario
pnpm users enable nuevo_usuario
pnpm users reset nuevo_usuario
```

Desactivar, activar y restablecer invalidan las sesiones existentes. Restablecer
no reactiva una cuenta desactivada. No se permite desactivar al último
administrador activo ni quitarle ese rol.

## Modificar rol y alcances

Este comando **reemplaza**, no suma, el rol y los alcances del usuario:

```powershell
pnpm users access nuevo_usuario OPERATOR "AREA:ESTERILES,AREA:LIQUIDOS-ORALES"
```

Los recursos se identifican por códigos del catálogo, no por nombres:

```text
PLANT:ALCOS-EL-ALTO
AREA:ESTABILIDAD
MACHINE:MQ-24-46
DEVICE:ESP32_Client01
```

Un alcance de planta incluye sus áreas y equipos; uno de área incluye sus
equipos. Un alcance de máquina o dispositivo no incluye sus hermanos. Si el
código de un área es ambiguo entre plantas, el comando rechaza el cambio.

`NONE` como último argumento deja al usuario sin recursos autorizados.
Los usuarios con áreas explícitas no reciben automáticamente áreas nuevas.

## Cambiar permisos de un rol

Este comando **reemplaza todos los permisos** del rol y revoca las sesiones de
sus usuarios. Ejemplo para conservar Operador en solo consulta:

```powershell
pnpm users permissions OPERATOR "page.dashboard.view,page.machines.view,page.devices.view"
```

Permisos disponibles: `page.dashboard.view`, `page.machines.view`,
`page.devices.view`, `machine.control`, `alarm.acknowledge`, `report.create`,
`configuration.write`, `user.manage`, `role.manage`, `audit.read`.

`NONE` quita todos los permisos. La política de ADMINISTRATOR no se reduce
mediante este comando de recuperación. Para nuevos roles o permisos, amplía
`apps/api/src/users/initial-policy.ts`, revisa las pruebas y ejecuta
`users:init`; para cambiar un rol existente utiliza el comando explícito.

## Auditoría

```powershell
pnpm users audit
```

Muestra los 100 eventos más recientes. Registra accesos rechazados, inicios y
cierres de sesión, cambios de contraseña y acciones administrativas. Los eventos
de las pruebas se conservan identificados como pruebas; sus cuentas temporales
se eliminan al finalizar.

## Sesiones

- Una hora sin interacción del usuario.
- Ocho horas como máximo desde el login, incluso con actividad continua.
- Las consultas periódicas, la comprobación de sesión y WebSocket no renuevan
  la actividad. Las interacciones se notifican de forma agrupada.
- NestJS valida cada petición. El navegador comprueba su estado periódicamente;
  las conexiones WebSocket ya abiertas se revisan cada 15 segundos y también
  antes de procesar paquetes. No hay emisiones de datos de negocio todavía.
- Los cambios de cuenta entre pestañas actualizan las demás pestañas.
- Fuera de loopback se requiere HTTPS y completar la puerta de despliegue. Este
  trabajo no autoriza exponer el entorno de desarrollo en la red de planta.
