# Data Flow

## Machine automatic

```text
PLC
 ↓
Node-RED
 ↓
MQTT
 ↓
NestJS
 ↓
process_data
 ↓
WebSocket
 ↓
Angular
```

## Device direct MQTT

```text
Device
 ↓
MQTT
 ↓
NestJS
 ↓
device_data
 ↓
WebSocket
 ↓
Angular
```

## Manual

```text
Operator
 ↓
Angular form
 ↓
REST
 ↓
NestJS
 ↓
process_data
```

## Command

```text
Angular
 ↓
REST
 ↓
NestJS
 ↓
Auth + RBAC + Scope + Validation + Audit
 ↓
MQTT
 ↓
Node-RED
 ↓
PLC
 ↓
MQTT result
 ↓
NestJS
 ↓
WebSocket
 ↓
Angular
```

## Timing

```text
Acquisition → Node-RED
Publication → MQTT policy
Persistence → NestJS policy
```
