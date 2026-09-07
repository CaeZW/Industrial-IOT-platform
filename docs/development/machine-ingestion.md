# 4D — Machine process data and operating runs

Status: implemented and validated locally. Manual entry is implemented in 4E;
see `manual-processes.md` for its independent behavior and verification.

Approved scope: machine MQTT ingestion, JSONB process readings linked to runs,
durable heartbeat/recovery and a read-only live dashboard with recent starts
and stops. No physical commands, manual forms or production connections.

Use iot/v1/machines/+/data and the canonical machine.data envelope, with the
same payload size/depth, non-retained, immutable event identity, monotonic event
time and scope rules as 4C. Preserve every JSON variable. The configured literal
running_key (default en_marcha) must be boolean. Invalid/missing signals still
update the live variables but neither close a run nor extend its heartbeat.

operations.machine_runs: one open run per machine, UTC start, finish, last
heartbeat, and internal observation identity. operations.process_data: JSONB,
event/receipt/create timestamps, source and relation to the matching machine/run.
operations.machine_ingestion_state: small durable ordering/sampling cursor,
not a full-frequency JSONB history. Lock the Machine row; run changes, heartbeat,
optional sample and cursor commit atomically. A partial unique index prevents
multiple open runs, and a composite foreign key prevents cross-machine linkage.

ON opens a run if absent, persisting the first process reading immediately.
Further ON readings update the persisted heartbeat every accepted cycle and
sample JSONB at the individually configured interval (default 300 seconds).
OFF never inserts process data. Normal OFF closes at eventTime. Repeated ON/OFF
and duplicate/older messages must not create extra runs or samples.

An observation identity changes after API startup, MQTT reconnection or an
ingestion failure. A recovered OFF for a previously open run closes it at its
last persisted heartbeat, used as the definitive accounting finish timestamp
without an interruption label. Recovered ON continues the same run. A heartbeat
cannot establish the physical instant of a stop or hidden stop/start cycles.
Silence alone is never treated as OFF. Source outages without a backend-observed
reconnection/failure cannot be distinguished from slower publication; Node-RED
must not present cached PLC values as fresh measurements.

The dashboard shows current variables including OFF readings, connection/receipt
age, the most recently observed running state, current run and heartbeat-confirmed
duration, plus the ten most recent runs with start/stop timestamps. It does not
advance confirmed operating time from the browser clock while no data arrives.
On API restart, historical readings are explicitly labeled and operation remains
awaiting a fresh observation. Selected run parameters can be consulted separately
in bounded pages, rather than rendering all historical samples on the dashboard.

Every REST lookup and WebSocket emission rechecks machine-view permission and
current resource scope. MQTT is ingestion only: no browser-originated start/stop
action is added by MQTT ingestion. Manual control recording is implemented in 4E.

Simulation is a separate SIM-MACHINE-01 machine in Mantenimiento, labeled
LOCAL_SIMULATOR, never a production machine. Default configured sampling stays
300 seconds. The simulator alternates ON/OFF and can force on/off states for
recovery checks. Provisioning uses local NestJS/Prisma; publication uses MQTT.
Reuse existing infrastructure. As in 4C, queues are bounded and not lossless
across outages; only one API ingestion instance is supported.

## Previsualización local

Desde la raíz del repositorio, con Docker Desktop iniciado:

```powershell
docker compose --env-file .env -f infra/compose/compose.yaml up -d --wait
pnpm db:generate
pnpm db:deploy
pnpm simulate:machine:init
```

La migración y la creación de la máquina simulada ya se ejecutaron en este
entorno local. Repetir estos comandos no reinicia cuentas ni borra datos; la
inicialización conserva el intervalo configurado de la máquina existente.

Terminal 1:

```powershell
pnpm dev:api
```

Terminal 2:

```powershell
pnpm dev:web
```

Terminal 3, después de que la API esté lista:

```powershell
pnpm simulate:machine -- --duplicates
```

Inicia sesión en http://127.0.0.1:4200 y abre Catálogo → Máquinas →
SIMULADA · Máquina de proceso → Ver parámetros y control de horas.
El usuario necesita permiso de visualización y acceso a esta máquina o su área
Mantenimiento. La pantalla administrativa permite asignarlo.

El simulador publica cada dos segundos, alternando aproximadamente veinte
segundos ON y diez OFF. Envía también duplicados idénticos para verificar que
no creen muestras ni controles adicionales. Cada ciclo corto conserva su primera
lectura; para observar varias muestras dentro del mismo control, mantenlo ON:

```powershell
pnpm simulate:machine -- --state=on --duplicates
```

El intervalo histórico inicial es cinco minutos y se modifica individualmente
en Administración → Equipos. Los parámetros en pantalla y el heartbeat no
esperan esos cinco minutos. Los valores son ficticios y pertenecen exclusivamente
al equipo SIM-MACHINE-01, no a las 45 máquinas suministradas.

Para detener el simulador usa Ctrl+C. Detener la publicación no equivale a OFF.
Con la API activa puedes enviar una parada explícita:

```powershell
pnpm simulate:machine -- --state=off --count=1
```

## Comprobación de recuperación

1. Publica ON y verifica un control abierto con heartbeat.
2. Detén el simulador y la API con Ctrl+C; conserva PostgreSQL.
3. Reinicia la API y espera a que MQTT esté conectado.
4. Publica OFF con el comando anterior: el control se cierra usando el último
   heartbeat persistido como hora final, sin etiqueta de interrupción.
5. Para probar continuidad, repite desde un nuevo control abierto y publica ON
   tras reiniciar: debe continuar el mismo identificador de control.

No se muestra todo el histórico inicialmente: aparecen los diez controles más
recientes. «Ver parámetros» consulta las lecturas vinculadas al control elegido,
en páginas de veinte registros. El tiempo mostrado está confirmado por heartbeat,
no es un contador ficticio que siga avanzando sin recepción de datos.

## Verificación automatizada

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

La integración usa MQTT local real y una base de datos desechable para ingesta.
Comprueba ON/OFF, controles cortos, claves e intervalos configurables, señales
inválidas, duplicados/concurrencia, autorización, asociación de lecturas,
restricción de un único control abierto y recuperación ON/OFF tras reinicio.
La regresión conjunta incluye devices, catálogo, autenticación y administración.
No se dejan servidores de previsualización ocupando los puertos 3000/4200.
