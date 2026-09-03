# INDUSTRIAL IoT PLATFORM

## MASTER AI CONTEXT — ARCHITECTURE + DEVELOPMENT RULES

**Project:** `industrial-iot-platform`
**Architecture:** On-Premise Industrial IoT Platform
**Frontend:** Angular + TypeScript
**Backend:** NestJS + TypeScript
**Database:** PostgreSQL
**Messaging:** MQTT / Mosquitto
**OT Integration:** Node-RED
**Browser Realtime:** WebSocket
**Initial Architecture Style:** Modular Monolith
**Development Environment:** Docker + VS Code + Codex

---

# 1. PURPOSE OF THE PROJECT

Build a professional, scalable, on-premise Industrial IoT Platform for monitoring, acquiring data, operating and managing industrial equipment.

The platform must be broader than a traditional SCADA application.

Potential applications:

- SCADA / HMI
- dashboards
- telemetry
- historian
- alarms
- machine monitoring
- production
- OEE
- reports
- maintenance
- energy
- device monitoring
- configuration
- audit
- administration
- analytics

The system must operate locally inside the plant network and must not depend on cloud services for normal operation.

---

# 2. CURRENT PRODUCTION SYSTEM

There is already a functional production system.

It MUST remain untouched during development.

Existing production infrastructure:

```text
Node-RED
http://172.16.201.31:1880/

PostgreSQL
172.16.201.31:5432

Mosquitto
172.16.201.31:1883
```

Current system is operational and already communicates successfully with industrial devices.

DO NOT:

- stop production Node-RED;
- modify production Node-RED;
- modify production PostgreSQL;
- modify production Mosquitto;
- reuse production containers;
- reuse production Docker volumes;
- overwrite production data;
- migrate production directly into the development containers.

The new application must be developed independently.

---

# 3. DEVELOPMENT INFRASTRUCTURE

A separate Docker environment has already been created.

Containers:

```text
docker-postgre
docker-mosquitto
docker-nodered
```

Development ports:

```text
PostgreSQL:
127.0.0.1:55432 → container 5432

MQTT:
127.0.0.1:51883 → container 1883

MQTT WebSocket:
127.0.0.1:59001 → container 9001

Node-RED:
127.0.0.1:51880 → container 1880
```

These ports are intentionally different from production.

Development Docker networking:

```text
iot-messaging
├── docker-mosquitto
└── docker-nodered

application-data
└── docker-postgre
```

`application-data` is internal.

CRITICAL:

```text
docker-nodered MUST NOT directly access docker-postgre.
```

This is both an architectural rule and a network topology rule.

---

# 4. OFFICIAL APPLICATION ARCHITECTURE

The approved architecture is:

```text
                         INDUSTRIAL IoT PLATFORM

┌────────────────────────────────────────────────────────────┐
│                    Angular + TypeScript                    │
│                                                            │
│          HMI / Dashboards / Configuration / Reports        │
└───────────────────────────┬────────────────────────────────┘
                            │
                     REST + WebSocket
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│                    NestJS + TypeScript                     │
│                                                            │
│ Auth / RBAC / Commands / Telemetry / Alarms / Reports      │
│ Historian / Audit / Configuration / Business Logic         │
└────────────────────┬───────────────────────┬───────────────┘
                     │                       │
                   SQL                     MQTT
                     │                       │
                     ▼                       ▼
               PostgreSQL              Mosquitto Broker
                                             │
                                             ▼
                                          Node-RED
                                             │
                             ┌───────────────┼───────────────┐
                             │               │               │
                           RS485          Ethernet         TCP/IP
                             │               │               │
                             ▼               ▼               ▼
                           PLCs            Devices        Controllers
```

Additionally:

```text
MQTT-native devices
        │
        ▼
    Mosquitto
        │
        ▼
      NestJS
```

Node-RED is the main OT integration gateway, but it is NOT mandatory for every device.

---

# 5. NODE-RED RESPONSIBILITY

Node-RED is the OT Integration Gateway.

Primary responsibilities:

- RS485 communications;
- Modbus RTU;
- Modbus TCP;
- Ethernet communications;
- TCP/IP;
- Siemens PLC communication;
- Schneider PLC communication;
- device polling/acquisition;
- reconnect handling;
- communication timeout handling;
- protocol conversion;
- data normalization;
- publishing normalized data to MQTT;
- receiving command requests from MQTT;
- forwarding commands to industrial equipment;
- reporting command results.

Node-RED is NOT:

- application backend;
- database layer;
- authentication server;
- RBAC engine;
- application API;
- report server;
- PDF generator.

---

# 6. NODE-RED MUST NEVER ACCESS POSTGRESQL

This is one of the most important architecture rules.

INVALID:

```text
Node-RED → PostgreSQL
```

VALID:

```text
Node-RED
   ↓
MQTT
   ↓
NestJS
   ↓
PostgreSQL
```

NestJS is the only application component authorized to access PostgreSQL.

Node-RED must not have:

- PostgreSQL credentials;
- SQL connection;
- SQL queries;
- direct DB access;
- INSERT/UPDATE/DELETE permissions.

---

# 7. DIRECT MQTT DEVICES

Some devices can communicate directly with MQTT.

Example:

```text
ESP32
   ↓
MQTT
   ↓
Mosquitto
   ↓
NestJS
```

Node-RED is not required in that case.

Therefore the system must support both:

```text
Device → Node-RED → MQTT → NestJS
```

and:

```text
Device → MQTT → NestJS
```

The backend must normalize both sources into the same application data model.

---

# 8. DOMAIN MODEL

The platform uses this primary hierarchy:

```text
Plant
└── Area
    ├── Machines
    └── Devices
```

## Plant

Currently there is one actual plant:

```text
Alcos El Alto
```

A `plants` table will still exist because the architecture should remain extensible.

## Area

The plant contains multiple operational/organizational areas.

Examples:

- Mantenimiento
- Estériles
- Líquidos Orales
- Control de Calidad
- Materia Prima
- Dispensación
- Sólidos I
- Sólidos II
- Sólidos III
- Semisólidos
- etc.

Areas must be first-class entities, not only strings.

---

# 9. MACHINE

A Machine is a business/operational equipment entity managed by the application.

Examples:

- Bramcor
- Caldero Cleaver Brooks
- Compresor Schulz 3040
- Compresor Schulz 4050
- Compresor Somar
- Letzner
- Chiller Aermec
- Loop PW
- Loop WFI
- Autoclave #1
- Autoclave #2
- Autoclave #3
- UTA
- UEA
- etc.

Machine table:

```text
machines
---------
id
area_id
code
name
description
machine_type
legacy_machine_id
metadata
is_active
created_at
updated_at
```

`code` should preserve the current internal code where available.

Example:

```text
code = MQ-24-46
name = Bramcor
legacy_machine_id = 1
```

The existing database uses `maquinas.id`, `nombre`, `codigo_interno`, `area`, and `descripcion`.

---

# 10. DEVICE

IMPORTANT:

A Device does NOT mean the PLC or every internal sensor of a Machine.

A Device is an independently monitored data-producing device managed by the application.

Examples:

```text
Estabilidad1
Estabilidad2
...
Estabilidad12

ESP32_Client01
ESP32_Client02
...
ESP32_Client28
```

The plant may contain hundreds of physical sensing elements.

Do NOT create one application Device entity per sensor simply because a sensor exists physically.

The Device model should represent meaningful independently monitored/data-producing devices.

Table:

```text
devices
-------
id
area_id
code
name
description
device_type
legacy_device_id
metadata
is_active
created_at
updated_at
```

No mandatory `machine_id`.

A Device may exist independently from a Machine.

---

# 11. MACHINE INTERNAL PLC/SENSOR DATA

Do NOT create:

```text
Device AI01
Device AI02
Device AI03
...
```

for every analog/digital point inside every PLC.

Example Bramcor data:

```json
{
  "AI01": 23.74,
  "AI02": 0.52,
  "AI03": 21.12,
  "AI04": 21.93,
  "AI05": 7.8,
  "AI06": 84.2,
  "AI17": 0,
  "arranque": true
}
```

These are machine measurements, not separate application Devices.

---

# 12. MEASUREMENT DEFINITIONS

The platform may optionally maintain metadata for variables received in JSON.

This entity replaces the idea of mandatory `tags`.

Purpose:

- human-readable names;
- units;
- data type;
- descriptions;
- report labels;
- optional validation;
- form field metadata.

Example:

```text
machine = Bramcor
key = AI01
display_name = Temperatura ingreso
unit = °C
report_label = Temperatura de ingreso
```

Incoming JSON can remain:

```json
{
  "AI01": 23.74
}
```

The backend/UI can display:

```text
Temperatura de ingreso: 23.74 °C
```

Measurement definitions are NOT required for ingestion.

Unknown JSON keys must still be accepted and preserved.

---

# 13. JSONB PROCESS DATA

The existing production DB uses:

```text
maquina_data.lecturas JSONB
```

This is intentional because each machine can expose a completely different number and type of measurements.

Example:

Bramcor:

```json
{
  "AI01": 23.74,
  "AI02": 0.52,
  "AI17": 0,
  "arranque": true
}
```

Loop WFI:

```json
{
  "TempLoop": 75.3,
  "TempTanque": 75.6,
  "NivelTanque": 500,
  "Conductividad": 0.21
}
```

UTA:

```json
{
  "PresionIn": 2,
  "PresionOut": 4,
  "DamperSalida": 50,
  "DamperIngreso": 49,
  "DamperMezclador": 14,
  "FrecuenciaExtraccion": 31,
  "FrecuenciaSuministro": 35
}
```

The new architecture MUST preserve this flexibility.

Do NOT replace it with fixed columns per machine.

---

# 14. DATA STORAGE MODEL

The initial model deliberately does NOT introduce a separate mandatory `telemetry_samples` table.

Machine process data:

```text
process_data
```

Device data:

```text
device_data
```

Both preserve dynamic JSON readings.

Example:

```text
process_data
------------
id
machine_run_id
machine_id
event_time
data_id
readings JSONB
source_type
legacy_maquina_data_id
created_at
```

Device:

```text
device_data
-----------
id
device_id
event_time
data_id
readings JSONB
source_type
legacy_device_data_id
created_at
```

The source type should distinguish:

```text
NODE_RED
MQTT_DIRECT
MANUAL
```

---

# 15. DATA IS THE PRIMARY PAYLOAD CONCEPT

MQTT uses:

```text
data
```

rather than forcing the entire architecture around the term telemetry.

Machine:

```text
iot/v1/machines/{machineId}/data
```

Device:

```text
iot/v1/devices/{deviceId}/data
```

The payload can contain multiple readings in one message.

---

# 16. MQTT TOPICS

Machine topics:

```text
iot/v1/machines/{machineId}/data
iot/v1/machines/{machineId}/state
iot/v1/machines/{machineId}/event
iot/v1/machines/{machineId}/command
iot/v1/machines/{machineId}/command/result
```

Device topics:

```text
iot/v1/devices/{deviceId}/data
iot/v1/devices/{deviceId}/state
iot/v1/devices/{deviceId}/event
```

Do NOT put these in business topics:

```text
nodered
rs485
modbus
s7
ethernet
```

Those belong to integration/runtime metadata.

---

# 17. MQTT TOPIC SEMANTICS

## `/data`

Measured/process information.

Example:

```json
{
  "eventId": "uuid",
  "eventTime": "2026-08-31T17:00:00Z",
  "correlationId": "uuid",
  "payload": {
    "AI01": 23.74,
    "AI02": 0.52,
    "arranque": true
  }
}
```

## `/state`

Current operational/communication state.

Examples:

```text
RUNNING
STOPPED
IDLE
FAULT
MAINTENANCE
ONLINE
OFFLINE
DEGRADED
```

Machine state and communication state must not be confused.

## `/event`

Discrete events.

Examples:

```text
process.started
process.completed
batch.started
batch.completed
maintenance.started
mode.changed
```

## `/command`

Backend-to-machine command.

Examples:

```text
machine.start
machine.stop
machine.reset
set.speed
set.temperature
```

## `/command/result`

Response to a command.

Possible status:

```text
ACKNOWLEDGED
COMPLETED
FAILED
TIMEOUT
REJECTED
CANCELLED
```

---

# 18. MQTT INGESTION

NestJS has one centralized MQTT ingestion adapter.

Allowed subscription:

```text
iot/v1/machines/+/data
iot/v1/devices/+/data
```

Additional controlled subscriptions may exist for:

```text
state
event
command/result
```

Do NOT subscribe indiscriminately to:

```text
#
```

Wildcard access is a controlled integration capability, not a permission granted to all modules.

---

# 19. EVENT ENVELOPE

All application MQTT events use a common envelope:

```json
{
  "eventId": "UUID",
  "eventType": "machine.data",
  "schemaVersion": "1.0",
  "eventTime": "UTC",
  "correlationId": "UUID",
  "source": {
    "service": "nodered",
    "machineId": "MQ-24-46"
  },
  "payload": {}
}
```

Required identifiers must be clearly distinguished.

---

# 20. IDENTIFIERS

Do NOT use one ID for everything.

The architecture distinguishes:

```text
requestId
correlationId
eventId
commandId
idempotencyKey
```

## requestId

HTTP/API request identification.

## correlationId

Tracks a logical operation across services/transports.

## eventId

Unique identity of an event/message.

## commandId

Unique identity of an industrial command.

Generated by NestJS.

## idempotencyKey

Used to prevent duplicate request effects.

May originate in an HTTP request.

---

# 21. COMMAND EXPIRATION

Every command requiring physical action must have:

```text
expiresAt
```

Example:

```json
{
  "commandId": "uuid",
  "commandType": "machine.start",
  "createdAt": "2026-08-31T17:00:00Z",
  "expiresAt": "2026-08-31T17:00:30Z"
}
```

If the command expires:

```text
now > expiresAt
```

it must not be executed.

This prevents delayed execution of obsolete commands after network/gateway outages.

---

# 22. COMMAND VALIDATION

Commands cannot permanently remain:

```typescript
Record<string, unknown>;
```

without validation.

Each command type must eventually have a specific validation schema.

Examples:

```text
machine.start
machine.stop
machine.reset
set.speed
set.temperature
```

The backend validates:

- user authorization;
- machine scope;
- command type;
- parameters;
- physical/business limits;
- command expiration;
- idempotency.

---

# 23. COMMAND FLOW

```text
Angular
  ↓ REST
NestJS
  ↓ Authentication
  ↓ Authorization
  ↓ Resource Scope
  ↓ Business Validation
  ↓ Audit
  ↓ Command creation
  ↓ MQTT
Mosquitto
  ↓
Node-RED
  ↓
Industrial device / PLC
  ↓
MQTT result
  ↓
NestJS
  ↓
WebSocket
  ↓
Angular
```

Never:

```text
Angular → MQTT → PLC
```

---

# 24. AUTHENTICATION

The application contains authenticated users.

Initial architecture should support local authentication.

Future OIDC/SSO can be introduced if required.

Users:

```text
iam.users
```

Passwords are never stored in plaintext.

Use:

```text
password_hash
```

not:

```text
password
```

---

# 25. AUTHORIZATION / RBAC

Use:

```text
User
 ↓
Role
 ↓
Permission
```

And resource scopes:

```text
Plant
Area
Machine
Device
```

Examples:

```text
page.dashboard.view
page.machines.view
page.devices.view
page.alarms.view
page.historian.view
page.production.view
page.reports.view
page.configuration.view
page.configuration.edit

machine.control
alarm.acknowledge
report.create
configuration.write

user.manage
role.manage
audit.read
```

Frontend guards are for UX.

Backend authorization is authoritative.

---

# 26. RESOURCE SCOPES

A user may have:

```text
Role = OPERATOR
Scope = Area: Estériles
```

or:

```text
Role = MAINTENANCE
Scope = Machine: Bramcor
```

or:

```text
Role = SUPERVISOR
Scope = Plant: Alcos El Alto
```

WebSocket events must respect user scopes.

A user must not receive realtime events for machines outside their authorized scope.

---

# 27. AUDIT

Audit sensitive actions.

Minimum fields:

```text
auditId
occurredAt
userId
action
resourceType
resourceId
result
reason
sourceIp
userAgent
correlationId
metadata
```

Audit:

- login failures;
- authorization failures;
- commands;
- configuration changes;
- alarm acknowledgement;
- user changes;
- role changes;
- permission changes;
- relevant report actions.

Never store:

- passwords;
- complete tokens;
- MQTT secrets;
- DB passwords.

---

# 28. MACHINE RUNS

The existing `control_horas` table is used to track machine operating periods.

New model:

```text
machine_runs
------------
id
machine_id
started_at
finished_at
last_heartbeat_at
status
legacy_control_horas_id
metadata
created_at
updated_at
```

Purpose:

- machine operating hours;
- run sessions;
- machine uptime;
- production-related time calculations.

This is not simply telemetry.

---

# 29. PROCESS DATA

New model:

```text
process_data
------------
id
machine_run_id
machine_id
event_time
data_id
readings JSONB
source_type
legacy_maquina_data_id
created_at
```

This is the main contextual machine process data store.

It preserves the existing legacy `maquina_data.lecturas JSONB`.

---

# 30. MANUAL DATA ENTRY

The system MUST support data coming from a human operator.

Example:

```text
Machine without automatic communication
       ↓
Angular form
       ↓
REST
       ↓
NestJS
       ↓
process_data
```

No separate table is required for every machine form.

A machine-specific form can generate dynamic JSON:

```json
{
  "temperatura": 23.4,
  "presion": 2.1,
  "lote": "ABC123",
  "observaciones": "..."
}
```

and store it in:

```text
process_data.readings
```

with:

```text
source_type = MANUAL
```

This provides the same conceptual process-data storage whether the source is automatic or manual.

---

# 31. DEVICE DATA

For independent monitoring devices:

```text
device_data
-----------
id
device_id
event_time
data_id
readings JSONB
source_type
legacy_device_id
created_at
```

Examples:

```text
ESP32_Client01
  ↓
{
  "temperatura": 23.7,
  "humedad": 45.2
}
```

or:

```text
Estabilidad1
  ↓
{
  "temperatura": 21.4,
  "humedad": 42.1
}
```

---

# 32. ALARMS

Tables:

```text
alarm_definitions
alarm_events
alarm_acknowledgements
```

Definition:

```text
alarm_definitions
-----------------
id
machine_id
code
location
name
description
priority
is_active
legacy_alarm_info_id
created_at
updated_at
```

Events:

```text
alarm_events
------------
id
alarm_definition_id
event_id
correlation_id
activated_at
cleared_at
state
value_number
value_text
message
created_at
```

Acknowledgement:

```text
alarm_acknowledgements
----------------------
id
alarm_event_id
user_id
acknowledged_at
comment
```

---

# 33. REPORTS

Reports are application responsibilities.

Node-RED MUST NOT generate application PDFs.

Flow:

```text
Angular
 ↓
REST
 ↓
NestJS
 ↓
Report Job
 ↓
PostgreSQL
 ↓
PDF renderer
 ↓
On-prem storage
```

Report metadata:

```text
report_jobs
-----------
id
requested_by
machine_id
report_type
parameters JSONB
status
requested_at
started_at
completed_at
file_name
storage_path
error_message
correlation_id
```

---

# 34. REPORT FLEXIBILITY

Reports may differ by machine.

Machine-specific variable metadata may be defined using:

```text
measurement_definitions
```

Example:

```text
AI01 → Temperatura ingreso
AI02 → Presión entrada
```

while original JSON remains unchanged.

Therefore:

```text
raw data
+
metadata
+
report template
=
machine-specific report
```

---

# 35. TIMING MODEL

Three different timing concepts MUST exist.

## Acquisition Frequency

Controlled primarily by Node-RED/OT integration.

Example:

```text
PLC read every 100 ms
```

## Publication Frequency

Controls when data is sent through MQTT toward NestJS.

Example:

```text
publish every 250 ms
```

## Persistence Frequency

Controls when NestJS stores data in PostgreSQL.

Example:

```text
persist every 1 second
```

Therefore:

```text
Acquisition ≠ Publication ≠ Persistence
```

---

# 36. TIMING IS RUNTIME CONFIGURATION

The timing values do NOT need to become database columns simply because they exist.

For the initial architecture, they can be configuration/runtime policies.

Example:

```text
Node-RED:
acquisitionInterval = 100ms
publicationInterval = 250ms

NestJS:
persistenceInterval = 1000ms
```

These values should be configurable in appropriate application/flow configuration, not hardcoded into business schema unless a future requirement requires dynamic per-device configuration.

---

# 37. PERSISTENCE POLICY

NestJS decides how frequently/when data is injected into PostgreSQL.

Possible strategies:

```text
IMMEDIATE
INTERVAL
ON_CHANGE
ON_EVENT
AGGREGATED
DISABLED
```

Examples:

```text
Normal temperature:
INTERVAL 1s

Alarm:
IMMEDIATE

Critical event:
IMMEDIATE

High-frequency analog:
AGGREGATED / INTERVAL
```

Do not assume:

```text
1 MQTT message = 1 SQL INSERT
```

for every use case.

---

# 38. DATA RETENTION / LOSS

Do not introduce Redis/Kafka/TimescaleDB merely by assumption.

First measure:

```text
devices
messages/sec
payload size
sampling rates
DB write rates
history size
number of concurrent users
```

Then decide whether additional infrastructure is required.

Initial target:

```text
NestJS
+
PostgreSQL
+
MQTT
+
WebSocket
```

without unnecessary infrastructure.

---

# 39. DATABASE STRUCTURE

Main schemas:

```text
core
iam
operations
audit
reports
```

Recommended tables:

```text
core
-----
plants
areas
machines
devices
measurement_definitions

iam
---
users
roles
permissions
user_roles
role_permissions
user_scopes

operations
----------
machine_runs
process_data
device_data
alarm_definitions
alarm_events
alarm_acknowledgements
command_requests
command_results

audit
-----
audit_events

reports
-------
report_jobs
```

---

# 40. DATABASE MIGRATION PRINCIPLE

The existing production DB is a reference and source for migration.

Existing tables:

```text
maquinas
control_horas
maquina_data
ambientes_th
alarmas_info
alarmas_log
users
login_info
```

Conceptual mapping:

```text
maquinas
    ↓
machines OR devices depending on actual business meaning

control_horas
    ↓
machine_runs

maquina_data
    ↓
process_data

ambientes_th
    ↓
devices + device_data + measurement metadata

alarmas_info
    ↓
alarm_definitions

alarmas_log
    ↓
alarm_events

users
    ↓
iam.users

login_info
    ↓
audit_events
```

Do NOT simply copy the legacy schema 1:1.

Preserve legacy identifiers wherever useful:

```text
legacy_machine_id
legacy_device_id
legacy_control_horas_id
legacy_maquina_data_id
legacy_alarm_info_id
```

This supports deterministic migration and validation.

---

# 41. ZERO-DATA-LOSS MIGRATION

The production system must remain operational while migrating.

Target migration strategy:

```text
OLD SYSTEM
Node-RED
   ↓
PostgreSQL legacy


NEW PATH
Node-RED
   ↓
MQTT
   ↓
NestJS
   ↓
PostgreSQL new
```

During validation both can coexist.

Steps:

1. Create new schema.
2. Import historical data.
3. Validate historical counts.
4. Validate timestamps.
5. Validate representative readings.
6. Start new MQTT ingestion.
7. Compare old and new data.
8. Run both paths temporarily.
9. Validate equivalence.
10. Prepare rollback.
11. Only then stop legacy SQL writes in Node-RED.

Never perform an irreversible cutover without validation.

---

# 42. EXISTING DATABASE

A schema-only dump from the current DB was analyzed.

Current DB includes:

```text
maquinas
maquina_data
control_horas
ambientes_th
alarmas_info
alarmas_log
users
login_info
```

The existing DB is PostgreSQL 15.4.

The new Docker PostgreSQL is PostgreSQL 18.x.

Do not assume the new DB should be a literal binary/schema clone of the old DB.

The new schema is a deliberate application model.

---

# 43. FRONTEND ARCHITECTURE

Angular is organized by features.

Do NOT use only:

```text
pages/
components/
services/
models/
```

for the entire application.

Preferred structure:

```text
apps/web/src/app/

core/
├── auth/
├── authorization/
├── http/
├── websocket/
├── guards/
└── interceptors/

layout/
├── shell/
├── sidebar/
├── topbar/
└── navigation/

shared/
├── ui/
├── directives/
├── pipes/
└── validators/

features/
├── dashboard/
├── machines/
├── devices/
├── alarms/
├── historian/
├── production/
├── reports/
└── administration/
```

Feature modules own their feature-specific logic.

---

# 44. BACKEND ARCHITECTURE

NestJS is a modular monolith.

Preferred high-level structure:

```text
apps/api/src/

config/

common/

infrastructure/
├── database/
├── mqtt/
├── websocket/
├── filesystem/
├── jobs/
└── observability/

modules/
├── auth/
├── users/
├── roles/
├── permissions/
├── plants/
├── areas/
├── machines/
├── devices/
├── measurements/
├── telemetry/
├── realtime/
├── machine-runs/
├── process-data/
├── commands/
├── alarms/
├── reports/
├── audit/
└── health/
```

Use boundaries:

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
Infrastructure
```

Controllers must not directly implement database logic.

---

# 45. REPOSITORY PATTERNS

Avoid:

```text
Controller → SQL
Controller → Repository
Controller → MQTT
```

Prefer:

```text
Controller
   ↓
Application Service
   ↓
Domain / Policies
   ↓
Repository Port
   ↓
Infrastructure Adapter
   ↓
PostgreSQL
```

For MQTT:

```text
Application
   ↓
MQTT Port
   ↓
MQTT Adapter
```

For realtime:

```text
Application Event
   ↓
Realtime Port
   ↓
WebSocket Adapter
```

---

# 46. REALTIME ARCHITECTURE

Flow:

```text
MQTT
 ↓
NestJS
 ↓
Application event
 ↓
Authorization filtering
 ↓
WebSocket
 ↓
Angular
```

WebSocket is the browser realtime transport.

Do NOT implement browser polling for primary realtime machine dashboards.

REST is for request/response.

WebSocket is for realtime updates.

---

# 47. CURRENT STATE

Machine/device current state may be stored directly on the entity:

```text
machines.status
machines.last_seen_at

devices.status
devices.last_seen_at
```

A dedicated historical state table should only be added if later requirements demonstrate the need.

---

# 48. SECURITY PRINCIPLES

Use:

```text
Least Privilege
Defense in Depth
Explicit Authorization
Auditability
Secure Defaults
Network Segmentation
```

Development secrets:

```text
.env
```

must never be committed.

`.env.example` may be committed.

MQTT/Node-RED credentials must not be embedded in source code.

---

# 49. OBSERVABILITY

Every important operation should support:

```text
requestId
correlationId
eventId
commandId
```

and when applicable:

```text
userId
machineId
deviceId
```

Use structured logging.

Health endpoints:

```text
/health/live
/health/ready
```

Distinguish:

```text
application failure
database failure
MQTT failure
Node-RED failure
device communication failure
```

---

# 50. TESTING STRATEGY

Tests must eventually cover:

```text
Unit
Integration
REST
MQTT
WebSocket
Authorization
Commands
Database
Reports
```

Important scenarios:

```text
device offline
MQTT unavailable
database unavailable
Node-RED restart
duplicate event
out-of-order event
stale data
WebSocket reconnect
command timeout
expired command
duplicate command
unauthorized command
report failure
manual data entry
```

---

# 51. DEVICE SIMULATION

Before connecting real PLCs/devices to the new system, build simulation capability.

Simulators must eventually support:

```text
telemetry
state changes
events
alarms
disconnect
reconnect
duplicate data
out-of-order data
stale data
command responses
command timeout
```

This allows validation without risking production equipment.

---

# 52. DEVELOPMENT STRATEGY

Use vertical slices.

Recommended sequence:

```text
Sprint 0
Infrastructure ✅

Sprint 0.5
Domain + MQTT contracts

Sprint 1
NestJS + Angular foundation

Sprint 2
Authentication + RBAC

Sprint 3
Plant / Area / Machine / Device management

Sprint 4
MQTT + Data ingestion + WebSocket

Sprint 5
Machine runs + Process Data + Historian

Sprint 6
Alarms

Sprint 7
Commands

Sprint 8
Reports / PDF

Sprint 9
Production / OEE
```

Do not implement all modules simultaneously.

---

# 53. DOCKER DEVELOPMENT RULE

Existing production infrastructure:

```text
172.16.201.31
```

must remain untouched.

Development containers:

```text
docker-postgre
docker-mosquitto
docker-nodered
```

must remain isolated.

Do not connect the development Node-RED to real PLCs until an explicit controlled integration phase.

First use simulated data.

---

# 54. DO NOT ADD INFRASTRUCTURE PREMATURELY

Do not introduce:

```text
Redis
Kafka
NATS
TimescaleDB
RabbitMQ
microservices
```

unless an actual measured requirement exists.

The default architecture is:

```text
Angular
+
NestJS
+
PostgreSQL
+
Mosquitto
+
Node-RED
+
WebSocket
```

---

# 55. CODING STANDARDS

Use TypeScript strict mode.

Prefer:

- explicit types;
- small focused modules;
- dependency inversion;
- validation at system boundaries;
- typed DTOs;
- schema validation for external data;
- meaningful errors;
- structured logging;
- deterministic tests.

Avoid:

- giant services;
- generic `any`;
- hidden side effects;
- direct infrastructure access from domain logic;
- duplicated business rules;
- silent fallback behavior.

---

# 56. AI AGENT BEHAVIOR

The AI agent MUST NOT blindly implement architecture changes.

Before modifying the architecture:

1. Read `AGENTS.md`.
2. Read `PROJECT_CONTEXT.md`.
3. Read relevant docs.
4. Inspect repository structure.
5. Identify inconsistencies.
6. Explain the proposed change.
7. Wait for approval when the change affects architecture, data model, security or messaging contracts.

For normal implementation tasks:

1. inspect;
2. plan;
3. implement;
4. test;
5. report.

Do not modify unrelated files.

Do not rewrite the project unnecessarily.

---

# 57. CURRENT REPOSITORY EXPECTATION

The repository is a monorepo.

Expected structure:

```text
industrial-iot-platform/

apps/
├── api/
└── web/

packages/
└── contracts/

docs/

infra/
└── compose/

AGENTS.md
PROJECT_MASTER_CONTEXT.md
README.md
.env.example
.gitignore
package.json
pnpm-workspace.yaml
```

---

# 58. CURRENT PRIORITY

The Docker infrastructure is already working.

Do not recreate it unless required.

Current infrastructure status:

```text
PostgreSQL      ✅
Mosquitto       ✅
Node-RED        ✅
Port isolation  ✅
Network isolation ✅
.env            ✅
.gitignore      ✅
Node-RED auth   ✅
```

The project is now ready for application development.

---

# 59. FIRST DEVELOPMENT OBJECTIVE

Before implementing business modules, perform a repository review.

Codex must inspect:

```text
AGENTS.md
PROJECT_MASTER_CONTEXT.md
README.md
apps/
packages/
docs/
infra/
```

Then report:

```text
1. Current repository structure
2. Architecture consistency
3. Missing files
4. Build configuration issues
5. Dependency issues
6. Contract inconsistencies
7. Security concerns
8. MQTT concerns
9. Database concerns
10. Recommended Sprint 1 implementation order
```

Do NOT write application code during this review.
