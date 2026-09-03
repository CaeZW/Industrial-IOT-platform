# Shared Contracts

This package contains stable transport/domain contracts shared by the application layers.

It may contain:

- MQTT event contracts;
- WebSocket event contracts;
- shared enums/types;
- versioned transport payloads.
- runtime guards for untrusted MQTT payloads;
- canonical MQTT topic builders and controlled subscriptions.

It must NOT contain:

- ORM entities;
- database repositories;
- NestJS services;
- Angular components;
- Node-RED flow implementations;
- infrastructure-specific code.

The package emits JavaScript and declaration files to `dist/`. Consumers import
the package root; they do not import files from `src/`.
