# Administración y configuración — Sprint 1, 4A / 4B

## Abrir las pantallas

Con la API y Angular ejecutándose, inicia sesión como Administrador y abre
**Administración** en el menú superior:

- Usuarios y accesos: http://127.0.0.1:4200/administration/users
- Roles y permisos: http://127.0.0.1:4200/administration/roles
- Configuración de equipos: http://127.0.0.1:4200/administration/equipment

Si estás preparando otra copia del repositorio, desde la raíz:

```powershell
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
```

Después, en dos terminales:

```powershell
pnpm dev:api
```

```powershell
pnpm dev:web
```

Si ya están ejecutándose, no abras otras instancias. Tras actualizar el esquema,
reinicia la API en su propia terminal con Ctrl+C y pnpm dev:api. Recarga Angular.
La migración aditiva conserva usuarios, equipos, contraseñas y datos existentes.
No necesitas ejecutar users:init ni db:seed para usar estas pantallas.

## Usuarios

Nuevo usuario solicita nombre, username en minúsculas, correo opcional, rol y
alcances seleccionables por planta, área o equipo. Sin alcances no verá equipos.
Elegir planta incluye sus áreas/equipos; elegir área incluye sus equipos.

La contraseña temporal se muestra únicamente después del guardado exitoso.
Entrégala por un canal privado. Se oculta al pulsar Ocultar, salir de la pantalla
o transcurrir dos minutos. No se almacena en localStorage/sessionStorage. Si la
pierdes, restablécela explícitamente. El usuario debe cambiarla al ingresar.
El administrador nunca puede consultar una contraseña existente.

Editar acceso reemplaza el rol y los alcances. Activar/desactivar, cambiar
acceso o restablecer contraseña revoca sesiones existentes. Restablecer no
reactiva una cuenta desactivada. Las acciones sensibles solicitan confirmación.
Modificar tu propia cuenta puede cerrar tu sesión; no se puede desactivar ni
quitar el rol al último administrador activo.

## Roles y permisos

Selecciona un rol existente y marca sus permisos. Guardar reemplaza el conjunto
de permisos y revoca las sesiones de los usuarios de ese rol. La política de
Administrador permanece protegida. No se crean roles ni permisos nuevos desde
esta pantalla. Los permisos de control, alarmas y reportes no implementan esas
funciones por sí mismos.

La administración global de usuarios/roles exige además pertenecer a
ADMINISTRATOR. Configurar equipos exige configuration.write y acceso al recurso.
El backend valida las solicitudes aunque se invoque la API sin usar Angular.

## Configuración por máquina/device

Busca por nombre, código o área y selecciona un equipo. El intervalo se edita
en minutos y se almacena como segundos enteros, entre 1 segundo y 24 horas.
Todos empiezan en 5 minutos (300 segundos). Modificar uno no cambia los demás.
Los ajustes sobreviven a reinicios y el seed no los sobrescribe.

Máquinas también permiten editar la clave de funcionamiento, inicialmente
en_marcha. Usa arranque si ese es el nombre del booleano publicado por tu flujo.
Es una clave literal de primer nivel; no una expresión ni ruta anidada.
Los devices no tienen clave de funcionamiento ni control de horas.

**4C ya aplica estos intervalos a las lecturas MQTT de devices.**
4D también aplica el intervalo por máquina y su clave de funcionamiento; incluye
controles de horas y recuperación. Véase `machine-ingestion.md`.
Consulta `device-ingestion.md` para ejecutar el simulador y ver JSONB/WebSocket.
No se cambia Node-RED, ni se envían órdenes físicas, ni se toca producción.

## Verificación

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm --filter @industrial-iot-platform/web build
pnpm --filter @industrial-iot-platform/api build:tools
```

La compilación API aislada en .tools evita sobrescribir dist mientras se usa
la API en desarrollo. Las pruebas de integración abren un puerto efímero local,
usan identidades/equipos temporales y los eliminan al finalizar, conservando
su auditoría. No usan ni restablecen contraseñas de usuarios de planta.

Decisiones de seguridad: ../security/administration-ui.md.
