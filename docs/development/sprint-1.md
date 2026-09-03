# Sprint 1 — Application Foundation

## Goal

Create an executable modular-monolith foundation for NestJS and Angular without
implementing speculative business features.

## Delivery slices

### Slice 1 — Executable foundation

- NestJS 11 application with validated local configuration;
- Prisma 7.10 PostgreSQL adapter;
- initial `Plant`, `Area`, `Machine` and `Device` schema;
- idempotent seed for the supplied legacy inventory;
- liveness and dependency-readiness endpoints;
- MQTT connection adapter without business ingestion logic;
- WebSocket transport foundation without business event exposure;
- Angular 22 application shell consuming only the NestJS health API;
- lint, strict typecheck, unit tests and production builds.

### Slice 2 — Read-only equipment catalog

- application ports and Prisma repositories for Plants, Areas, Machines and
  Devices;
- paginated, validated REST queries;
- Angular feature routes for the equipment catalog;
- integration tests against the local PostgreSQL container.

### Slice 3 — Authentication foundation

- local user and credential model;
- secure password hashing and session/token policy;
- guarded REST and WebSocket boundaries;
- audit of authentication failures.

### Slice 4 — Data ingestion foundation

- controlled MQTT subscriptions for Machine and Device data topics;
- shared-contract validation at the boundary;
- idempotency and JSONB persistence policy;
- scoped WebSocket publication to Angular.

## Inventory normalization

The 45 Machines and 40 Devices supplied for Sprint 1 are development seed data.
The import:

- preserves the legacy integer IDs;
- normalizes mojibake, accents and repeated whitespace;
- preserves stable internal codes;
- maps `N/A` to a missing code instead of treating it as an MQTT identifier;
- does not turn PLC registers or internal sensors into application Devices.

`Sistema de Alarmas` requires an approved stable integration code before it can
publish or receive application MQTT messages.

## Commands

Generate the Prisma client:

```bash
pnpm db:generate
```

Apply development migrations:

```bash
pnpm db:migrate
```

Load or refresh the idempotent local inventory:

```bash
pnpm db:seed
```

Run the applications in separate terminals:

```bash
pnpm dev:api
pnpm dev:web
```

## Acceptance checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The production installation at `172.16.201.31` is never used by these commands.
