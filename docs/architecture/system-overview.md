# System Overview

```text
Angular
  |
  | REST / WebSocket
  v
NestJS
  | \
  |  \ MQTT
  |   \
  v    v
PostgreSQL  Mosquitto
              |
              v
           Node-RED
              |
       Industrial equipment
```

Direct MQTT devices are also supported.

Boundaries:

```text
Node-RED -X-> PostgreSQL
Angular -X-> PostgreSQL
Angular -X-> MQTT
Angular -X-> PLC
```

NestJS is the controlled bridge between application and infrastructure.
