# AGENTS.md — Industrial IoT Platform

## 1. Mission

You are an engineering agent working on an on-premise Industrial IoT platform.

Priorities, in order:

1. correctness;
2. safety;
3. security;
4. reliability;
5. maintainability;
6. observability;
7. testability;
8. simplicity.

Do not optimize for maximum code volume or number of technologies.

---

## 2. Mandatory context

Before changing the project, read:

```text
PROJECT_CONTEXT.md
README.md
docs/architecture/
docs/security/
docs/messaging/
docs/development/
```

Inspect the actual repository before making assumptions.

---

## 3. Architecture invariants

These rules are mandatory.

```text
Angular → NestJS
Angular -X-> PostgreSQL
Angular -X-> MQTT
Angular -X-> PLC

Node-RED → MQTT
Node-RED -X-> PostgreSQL

NestJS → PostgreSQL
NestJS ↔ MQTT
NestJS → WebSocket → Angular
```

NestJS is the application/data boundary.

Node-RED is the OT integration gateway.

MQTT is the integration/event bus.

WebSocket is browser realtime.

REST is request/response.

Node-RED MUST NOT contain application database access.

---

## 4. Production isolation

Never modify the existing production installation unless explicitly authorized.

Production:

```text
172.16.201.31
```

Development:

```text
localhost
```

Do not:

- connect development Node-RED to production PostgreSQL;
- connect development containers to production MQTT accidentally;
- change production flows;
- change production data;
- stop production services.

---

## 5. Domain model

The primary domain hierarchy is:

```text
Plant
└── Area
    ├── Machines
    └── Devices
```

Do NOT introduce an `Asset` entity unless a future approved decision explicitly requires it.

### Machine

An industrial/operational machine managed by the application.

### Device

An independently monitored/data-producing device.

Do NOT create application Devices for every:

- PLC register;
- analog input;
- digital input;
- internal machine sensor.

---

## 6. Machine data

Machine data is dynamic.

Example:

```json
{
  "AI01": 23.74,
  "AI02": 0.52,
  "arranque": true
}
```

Do not create fixed database columns for every machine-specific variable.

Use JSONB for process/device data.

---

## 7. Measurement definitions

`measurement_definitions` is metadata.

It can map:

```text
AI01
→ Temperatura ingreso
→ °C
```

It is NOT required for ingestion.

Unknown incoming keys must be preserved.

---

## 8. MQTT topics

Machine:

```text
iot/v1/machines/{machineId}/data
iot/v1/machines/{machineId}/state
iot/v1/machines/{machineId}/event
iot/v1/machines/{machineId}/command
iot/v1/machines/{machineId}/command/result
```

Device:

```text
iot/v1/devices/{deviceId}/data
iot/v1/devices/{deviceId}/state
iot/v1/devices/{deviceId}/event
```

Do not put these into business topics:

```text
Node-RED
RS485
Modbus
S7
Ethernet
```

They are integration details.

---

## 9. Data timing

Maintain three independent policies:

```text
Acquisition Frequency
Publication Frequency
Persistence Frequency
```

Example:

```text
Node-RED acquisition = 100 ms
MQTT publication     = 250 ms
NestJS persistence   = 1 s
```

These are runtime/application policies.

Do not add database columns merely to represent these frequencies unless dynamic configuration becomes an explicit requirement.

---

## 10. Persistence

Initial storage model:

```text
machine/process data → process_data.readings JSONB
device data          → device_data.readings JSONB
```

Do not introduce `telemetry_samples` unless a future measured requirement justifies it.

Do not assume:

```text
1 MQTT message = 1 SQL INSERT
```

NestJS decides persistence policy.

---

## 11. Manual data entry

Machines may receive data from operators.

Valid path:

```text
Angular
 ↓
REST
 ↓
NestJS
 ↓
process_data
```

Manual and automatic records may coexist.

Use an explicit source indicator, e.g.:

```text
NODE_RED
MQTT_DIRECT
MANUAL
```

---

## 12. Commands

Never allow:

```text
Angular → MQTT → PLC
```

Commands must pass through NestJS.

Mandatory concerns:

- authentication;
- authorization;
- machine/device scope;
- validation;
- audit;
- idempotency;
- expiration;
- result handling.

Command identifiers:

```text
commandId
correlationId
idempotencyKey
expiresAt
```

NestJS generates `commandId`.

Expired physical commands must not execute.

---

## 13. Authentication and authorization

Use:

```text
User
Role
Permission
Scope
```

Scopes may target:

```text
Plant
Area
Machine
Device
```

The backend is authoritative.

Angular guards are UX.

Never rely on frontend-only authorization.

---

## 14. Audit

Sensitive actions must be auditable.

Examples:

- login failures;
- authorization failures;
- commands;
- alarm acknowledgement;
- configuration changes;
- administration changes;
- report actions.

Never log:

- passwords;
- access tokens in full;
- database credentials;
- MQTT secrets.

---

## 15. Reports

PDF generation belongs to NestJS.

Node-RED MUST NOT generate application PDFs.

Use an asynchronous job when generation becomes heavy.

Do not introduce a separate microservice simply to generate PDFs unless a measured requirement exists.

---

## 16. Coding rules

Use strict TypeScript.

Prefer:

- explicit types;
- dependency inversion;
- small modules;
- boundary validation;
- meaningful errors;
- structured logs;
- deterministic tests.

Avoid:

- `any` without a reason;
- giant services;
- direct SQL from controllers;
- hidden side effects;
- architecture changes hidden inside refactors;
- speculative infrastructure.

---

## 17. Repository boundaries

Preferred backend layers:

```text
Presentation
Application
Domain
Infrastructure
```

Preferred feature-oriented frontend.

Do not create a global architecture based only on:

```text
pages/
components/
services/
models/
```

---

## 18. Change protocol

Before modifying code:

1. inspect repository;
2. read relevant docs;
3. determine affected boundaries;
4. state the plan;
5. implement the smallest coherent change;
6. run relevant checks;
7. report failures honestly.

When modifying architecture, database model, security model, MQTT topics or shared contracts:

- stop;
- explain the impact;
- update documentation with the decision;
- only then implement.

Do not silently redefine the architecture.

---

## 19. Testing

For application code, run relevant:

```text
lint
typecheck
unit tests
integration tests
build
```

Do not create artificial source files merely to make an empty Sprint 0 app report a green build.

Infrastructure may be validated operationally before application tests exist.

---

## 20. Dependencies

Do not add:

```text
Redis
Kafka
NATS
RabbitMQ
TimescaleDB
microservices
```

without a demonstrated requirement.

Every new infrastructure dependency should have:

- reason;
- operational impact;
- failure mode;
- maintenance cost;
- rollback path.

---

## 21. Industrial safety

The web application is not the deterministic safety controller.

Never bypass:

- PLC interlocks;
- machine safety systems;
- emergency stops;
- validated control logic.

A command from the application is a request to the OT layer, not a replacement for PLC safety logic.
