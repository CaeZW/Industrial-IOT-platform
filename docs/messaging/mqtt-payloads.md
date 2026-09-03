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
  "idempotencyKey": "operator-request-001",
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
  "completedAt": "2026-09-03T12:00:02Z",
  "result": {}
}
```

The machine/device identifier is carried by the topic. Command payloads do not
repeat the machine identifier, preventing disagreement between topic and body.
