# Shared Contracts

This package contains stable transport/domain contracts shared by the application layers.

It may contain:

- MQTT event contracts;
- WebSocket event contracts;
- shared enums/types;
- versioned transport payloads.

It must NOT contain:

- ORM entities;
- database repositories;
- NestJS services;
- Angular components;
- Node-RED flow implementations;
- infrastructure-specific code.
