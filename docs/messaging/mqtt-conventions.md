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
