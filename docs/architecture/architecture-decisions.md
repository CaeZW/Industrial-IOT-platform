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
