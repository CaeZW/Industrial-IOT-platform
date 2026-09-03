# MQTT Topics v1

Base namespace:

```text
iot/v1/
```

## Machines

```text
iot/v1/machines/{machineId}/data
iot/v1/machines/{machineId}/state
iot/v1/machines/{machineId}/event
iot/v1/machines/{machineId}/command
iot/v1/machines/{machineId}/command/result
```

Example:

```text
iot/v1/machines/MQ-24-46/data
```

## Devices

```text
iot/v1/devices/{deviceId}/data
iot/v1/devices/{deviceId}/state
iot/v1/devices/{deviceId}/event
```

Example:

```text
iot/v1/devices/ESP32_Client01/data
```

## Semantics

`data` = measurements/process values.

`state` = current state.

`event` = discrete event.

`command` = instruction from NestJS toward a machine.

`command/result` = execution result.

## Ingestion

NestJS may use controlled wildcards:

```text
iot/v1/machines/+/data
iot/v1/devices/+/data
```

Only the centralized ingestion adapter gets this broad subscription. Do not use unrestricted `#` subscriptions.

## Topic independence

Do not include `nodered`, `rs485`, `modbus`, `s7` or `ethernet` in business topic names.
