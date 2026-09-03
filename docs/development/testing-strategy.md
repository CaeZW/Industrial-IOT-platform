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

## Sprint 1 database integration

Database integration tests run separately after PostgreSQL is healthy,
migrations are deployed and development seed data is loaded:

```bash
pnpm test:integration
```

The default unit-test command remains independent of Docker so failures keep a
clear boundary between application logic and local infrastructure.
