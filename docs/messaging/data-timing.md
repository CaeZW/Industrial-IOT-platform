# Data Timing

Three independent policies:

```text
Acquisition
Publication
Persistence
```

Example:

```text
PLC read by Node-RED: 100ms
MQTT publication:      250ms
PostgreSQL persistence: 1s
```

Normal telemetry may be buffered/batched.

Critical events/alarms may require immediate publication and persistence.

The exact policy is an application/runtime concern.
