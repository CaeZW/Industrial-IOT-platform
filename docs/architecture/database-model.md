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
- `machines.code` and `devices.code` are globally unique because their values
  occupy global MQTT topic namespaces;
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
