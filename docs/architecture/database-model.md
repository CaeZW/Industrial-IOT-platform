# Database Model

## Core

```text
plants
areas
machines
devices
measurement_definitions
```

Relationships:

```text
plant 1 -> N areas
area 1 -> N machines
area 1 -> N devices
machine 1 -> N measurement_definitions
device 1 -> N measurement_definitions
```

## IAM

```text
users
roles
permissions
user_roles
role_permissions
user_scopes
sessions
login_windows
```

## Operations

```text
machine_runs
process_data
device_data
alarm_definitions
alarm_events
alarm_acknowledgements
command_requests
command_results
```

Relationships:

```text
machine -> machine_runs -> process_data
machine -> alarm_definitions -> alarm_events -> alarm_acknowledgements
machine -> command_requests -> command_results
device -> device_data
```

## Audit

```text
audit_events
```

## Reports

```text
report_jobs
```

Dynamic data is stored in JSONB.

Do not add a table for every machine-specific form.

## Relational invariants

- primary keys are application UUIDs;
- `plants.code` is globally unique and `areas.code` is unique within a Plant;
- `machines.code` and `devices.code`, when present, are globally unique because
  their values occupy global MQTT topic namespaces;
- MQTT machine/device identifiers use the corresponding stable `code`;
- `measurement_definitions` belongs to exactly one Machine or one Device,
  enforced with an exclusive-owner check constraint;
- `process_data.machine_run_id` is nullable because manual and automatic data
  can exist outside a run;
- when `machine_run_id` is present, its Machine must equal
  `process_data.machine_id`;
- `event_id`/`data_id` values used for ingestion are unique per source and
  resource so QoS 1 redelivery cannot create duplicates;
- command request `idempotency_key` is unique within the requesting principal
  and target Machine;
- persisted timestamps use `timestamptz` in UTC;
- JSONB readings preserve unknown keys and are never reconstructed only from
  measurement definitions.

## Resource scopes

`user_scopes` uses an explicit resource type (`PLANT`, `AREA`, `MACHINE` or
`DEVICE`) and resource identifier. The application service validates that the
referenced resource exists and belongs to the permitted hierarchy. `Line` is not
part of the approved domain model.

## Initial indexes

At minimum, migrations must create descending time indexes for machine and
device data, unique ingestion identifiers, active alarm lookup, command status
and expiry lookup, and audit lookup by occurrence time and user.

Detailed SQL and ORM migrations belong to Sprint 1. Sprint 0 defines these
invariants without creating an application schema prematurely.

## Sprint 1 implementation baseline

Prisma is the PostgreSQL infrastructure adapter. The initial migration creates
only `core.plants`, `core.areas`, `core.machines` and `core.devices`.

The supplied plant inventory is loaded through an idempotent seed. Legacy
integer IDs are preserved, while application relations use UUIDs. A missing or
placeholder integration code is stored as `NULL`, never as `N/A`; that record is
excluded from MQTT integration until a stable code is assigned. The supplied
`Sistema de Alarmas` record now uses the approved stable code `AL-01-M`.

Slice 3 adds `iam` and `audit` schemas. Sessions store token hashes and separate
absolute/idle timestamps. Login windows store hashed throttle keys, never raw
passwords or tokens. Roles/permissions and resource scopes remain relational.

Slice 4B adds `persistence_interval_seconds` to Machine and Device (default 300,
integer 1..86400) and `running_key` to Machine (default `en_marcha`, nonblank,
maximum 120 characters). The owner explicitly requires editing these per
resource in Angular and retaining changes across restarts. No publication or
acquisition settings are stored here. Changes and their audit commit atomically.
Inventory seeding preserves settings.

4C adds operations.device_data (JSONB, unique device/event ID, UTC event/receipt/
creation timestamps, descending device/time/id index) and one small
operations.device_ingestion_state cursor per device. The cursor stores only the
last event ID/time and last sampled receipt time; it is updated for every fresh
message without storing every JSONB historically. Device row locks serialize
sampling and deduplication, with cursor and optional history insert in one
transaction. See ../development/device-ingestion.md for exact semantics and limits.

4D adds `operations.machine_runs`, `operations.process_data` and
`operations.machine_ingestion_state`. A partial unique index permits only one
open run per machine. A composite foreign key enforces that a process reading
and its run belong to the same machine. Process event IDs are unique per machine.
The machine row lock serializes run transitions, durable heartbeat updates,
sampling and ordering cursors in one transaction. Every accepted ON refreshes
the heartbeat; only the first reading of each run and interval samples create
JSONB history. OFF creates no process sample. The internal run observation ID
supports restart/reconnection recovery without introducing a closure label.
Run duration is derived from start and finish (or latest confirmed heartbeat).
See ../development/machine-ingestion.md for recovery semantics and limitations.

4E adds run origin (AUTOMATIC/MANUAL), started_by_id/closed_by_id and
process_data.recorded_by_id referencing iam.users with restrictive deletion.
Database checks require responsible users for manual runs/readings. Existing
automatic records retain their data without fabricated actors. A manual run is
created with both timestamps, so its duration is finalized immediately; its
heartbeat field equals the supplied start only for schema compatibility.
operations.manual_operations stores user/machine/UUID-key, a request fingerprint
and response for durable idempotency. Changes, sample, receipt and audit commit
atomically under the machine row lock. MQTT cannot mutate an open manual run,
nor open a delayed automatic run before a recorded manual closure.
No separate process table per form and no additional infrastructure are introduced.

`core.machines.registration_mode` selects AUTOMATIC or MANUAL.
`core.machines.manual_form_definition` is a JSONB array describing the required
manual field keys, labels and primitive types. It is validation/presentation
metadata, not process values; submitted values remain in
`operations.process_data.readings` JSONB.
