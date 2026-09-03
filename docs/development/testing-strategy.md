# Testing Strategy

## Sprint 0

Infrastructure is validated operationally:

- containers;
- ports;
- networks;
- PostgreSQL;
- MQTT publish/subscribe;
- Node-RED;
- Node-RED ↔ MQTT;
- persistence;
- network isolation.

## Application sprints

Tests increase with real code:

```text
Unit
Integration
REST
MQTT
WebSocket
Authorization
Database
Reports
E2E
```

Critical scenarios include:

- MQTT disconnect;
- PostgreSQL outage;
- duplicate event;
- stale data;
- out-of-order event;
- WebSocket reconnect;
- expired command;
- duplicate command;
- unauthorized command.
