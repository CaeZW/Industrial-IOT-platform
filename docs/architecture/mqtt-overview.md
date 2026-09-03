# MQTT Overview

Namespace:

```text
iot/v1/
```

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

The topic represents the business object, not the physical transport.

Do not include Node-RED, RS485, Modbus, S7 or Ethernet in business topic names.

NestJS telemetry ingestion may use controlled wildcards:

```text
iot/v1/machines/+/data
iot/v1/devices/+/data
```

Do not use unrestricted `#`.
