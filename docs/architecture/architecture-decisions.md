# Architecture Decisions

## ADR-001 — Industrial IoT Platform

The product is broader than SCADA.

## ADR-002 — NestJS + Angular

Backend: NestJS + TypeScript.
Frontend: Angular + TypeScript.

## ADR-003 — Node-RED as OT Gateway

Node-RED owns industrial protocol integration and acquisition/publication.

## ADR-004 — NestJS owns PostgreSQL

Node-RED has no direct database access.

## ADR-005 — MQTT as integration bus

MQTT connects Node-RED/direct MQTT devices with NestJS.

## ADR-006 — Machine and Device are different business entities

Machine = operational equipment.
Device = independently monitored/data-producing device.
Internal PLC registers and sensors are not application Devices.

## ADR-007 — JSONB process/device data

Dynamic machine/device structures are preserved in JSONB.

## ADR-008 — Measurement definitions are optional metadata

They provide readable labels, units, validation and form/report metadata. They do not gate ingestion.

## ADR-009 — No telemetry_samples initially

Machine data uses `process_data`; device data uses `device_data`.

## ADR-010 — Modular monolith

Do not begin with microservices.

## ADR-011 — Separate acquisition/publication/persistence timing

These are independent runtime policies.

## ADR-012 — Production isolation

The existing plant infrastructure stays untouched during development.

## ADR-013 — Canonical event time

MQTT application event envelopes use `eventTime` in UTC. Receive and persistence
times are separate backend concerns.

## ADR-014 — Stable MQTT identifiers

Machine/device topic identifiers use their unique, stable integration `code`,
not display names or database primary keys.

## ADR-015 — QoS 1 requires idempotency

Data, state, events and commands initially use QoS 1. Consumers deduplicate
events and commands by their canonical identifiers. Commands are never retained.

## ADR-016 — Development PostgreSQL loopback access

The development Compose stack publishes PostgreSQL only on
`127.0.0.1:55432`. This supports local NestJS processes, migrations and pgAdmin
without exposing the database to the LAN.

Node-RED remains isolated because it is not attached to `application-data`.
Production removes the PostgreSQL host port and uses an internal data network.

## ADR-017 — Prisma as the PostgreSQL infrastructure adapter

Sprint 1 uses Prisma 7.10 as the only ORM/data-access adapter in NestJS.
Prisma belongs to the infrastructure layer: controllers and application use
cases must not import the generated client directly. This preserves the option
to use explicit repository ports and focused SQL where a measured query requires
it, without introducing another ORM or data-access library.

The Prisma connection URL is assembled from the existing local `POSTGRES_*`
variables. The project does not duplicate the database password in a committed
file or require a second secret variable.

## ADR-018 — Minimal Sprint 1 core schema and legacy inventory

The first migration implements only the approved hierarchy:

```text
Plant
└── Area
    ├── Machine
    └── Device
```

Application identifiers are UUIDs. Legacy integer identifiers are retained in
dedicated unique columns for traceability and idempotent imports. Display text
is normalized to UTF-8 and repeated whitespace is removed during the seed.

Integration `code` remains globally unique for Machines and Devices. It may be
null only for a legacy record that has no valid code yet. Such a record cannot
participate in MQTT topics until an explicit stable code is assigned.

The approved integration code for legacy Machine 18, `Sistema de Alarmas`, is
`AL-01-M`.

## ADR-019 — Estabilidad is an independent Area

`Estabilidad` is modeled as a first-class Area under `Alcos El Alto`, separate
from `Control de calidad`. The 12 independently monitored temperature and
humidity Devices named `Estabilidad1` through `Estabilidad12` belong to this
new Area.

`Control de calidad` remains in the area catalog even when it has no seeded
Devices. This is an inventory relationship correction and does not introduce a
new entity or change the approved Plant → Area → Machine/Device hierarchy.

## ADR-020 — Local authentication and PostgreSQL sessions

Sprint 1 Slice 3 adds the already planned IAM and audit models, plus opaque
revocable sessions and persistent login-attempt windows in the existing
PostgreSQL instance. No Redis, identity service or additional container is
required. Details and approved policies: `../security/slice-3-authentication.md`.
Prisma remains infrastructure; HTTP controllers and CLI delegate to application
services. Initial credentials are delivered locally outside Git, not baked into
the seed. Revoke sessions on security changes. Rollback disables application
access and returns to localhost-only development; do not drop IAM/audit data.

## ADR-021 — Web administration and durable equipment settings

Owner-approved 4A/4B add protected Angular administration through NestJS, reusing
existing IAM application services and Prisma. HTTP actor attribution, CSRF,
permission enforcement, resource scopes and transactional audit apply. CLI
remains available for recovery. Durable per-resource intervals are now an
explicit requirement, default 300 seconds; Machine also stores its running key.
No MQTT ingestion or new infrastructure is introduced in this delivery.
Details: `../security/administration-ui.md` and
`../development/administration-ui.md`.
