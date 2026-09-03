# MQTT Conventions

- UTF-8 payloads;
- JSON application payloads initially;
- UTC timestamps;
- explicit schema version;
- unique eventId for events;
- correlationId for distributed operations;
- commandId for commands;
- expiration for physical commands;
- controlled QoS/retain choices per message type;
- explicit client identities;
- authenticated clients before plant deployment.

Do not use retained messages for command requests unless a specific control
case proves the semantics are safe.

## Initial delivery matrix

| Message | QoS | Retained | Duplicate handling |
| --- | ---: | --- | --- |
| data | 1 | no | deduplicate by `eventId` |
| state | 1 | yes | newest valid `eventTime` wins |
| event | 1 | no | deduplicate by `eventId` |
| command | 1 | no | deduplicate by `commandId` and `idempotencyKey` |
| command/result | 1 | no | deduplicate by `commandId` and status transition |

QoS 1 intentionally permits duplicate delivery. NestJS must be idempotent.
Retained state is accepted only when its `eventTime` is not stale under the
configured state policy. Commands are never retained.

Direct MQTT devices should publish a retained `OFFLINE` device-state message as
their Last Will. Machines integrated through Node-RED use explicit gateway state
publication and backend freshness timeouts.

The initial application payload limit is 256 KiB. It is a runtime boundary, not
a database column, and may be adjusted only after measuring real payloads.
