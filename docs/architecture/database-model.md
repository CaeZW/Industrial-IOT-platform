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
