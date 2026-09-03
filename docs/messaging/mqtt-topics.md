# MQTT Topics v1

## Machines

```text
iot/v1/machines/{machineId}/data
iot/v1/machines/{machineId}/state
iot/v1/machines/{machineId}/event
iot/v1/machines/{machineId}/command
iot/v1/machines/{machineId}/command/result
```

## Devices

```text
iot/v1/devices/{deviceId}/data
iot/v1/devices/{deviceId}/state
iot/v1/devices/{deviceId}/event
```

Controlled ingestion subscriptions:

```text
iot/v1/machines/+/data
iot/v1/devices/+/data
```

No unrestricted `#` subscription.
