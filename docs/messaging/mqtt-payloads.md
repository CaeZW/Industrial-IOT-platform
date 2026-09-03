# MQTT Payloads

## Data

```json
{
  "eventId": "UUID",
  "eventType": "machine.data",
  "schemaVersion": "1.0",
  "eventTime": "2026-09-03T12:00:00Z",
  "correlationId": "UUID",
  "source": {
    "service": "nodered",
    "machineId": "MQ-24-46"
  },
  "payload": {
    "AI01": 23.74,
    "AI02": 0.52,
    "arranque": true
  }
}
```

Unknown keys are preserved.

## Command

```json
{
  "commandId": "UUID",
  "correlationId": "UUID",
  "commandType": "machine.start",
  "createdAt": "2026-09-03T12:00:00Z",
  "expiresAt": "2026-09-03T12:00:30Z",
  "parameters": {}
}
```

## Command result

```json
{
  "commandId": "UUID",
  "correlationId": "UUID",
  "status": "COMPLETED",
  "result": {}
}
```
