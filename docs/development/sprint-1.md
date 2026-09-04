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
- Angular 22 + Tailwind CSS application shell consuming only the NestJS health
  API;
- lint, strict typecheck, unit tests and production builds.

### Slice 2 — Read-only equipment catalog

- application ports and Prisma repositories for Plants, Areas, Machines and
  Devices;
- paginated, validated REST queries;
- Angular feature routes for the equipment catalog;
- integration tests against the local PostgreSQL container.

Status: implemented and validated locally.

REST endpoints:

```text
GET /api/catalog/overview
GET /api/catalog/areas?page=1&pageSize=20&search=
GET /api/catalog/machines?page=1&pageSize=20&search=&areaId=
GET /api/catalog/devices?page=1&pageSize=20&search=&areaId=
```

`pageSize` is limited to 50. Invalid pagination or `areaId` values return HTTP
400. Prisma is isolated in the catalog infrastructure repository; controllers
do not access it directly.

Angular routes:

```text
/
/catalog
/catalog/areas
/catalog/machines
/catalog/devices
```

The read-only endpoints now require an authenticated session, the corresponding
permission and authorized resource scopes. Filtering applies before pagination
and counting, including summary and area totals.

### Slice 3 — Authentication foundation

- local user and credential model;
- secure password hashing and session/token policy;
- guarded REST and WebSocket boundaries;
- audit of authentication failures.

Status: implemented and validated locally. The approved scope also includes
the supplied role/action/area matrix, all 13 active accounts, mandatory initial
password replacement, one-hour idle/eight-hour absolute sessions and audited
local user-administration commands. No administration page or physical command
endpoint is included.

See `user-administration.md` for exact commands and credential delivery, and
`../security/slice-3-authentication.md` for security decisions. Initialization is
separate from inventory seeding and never resets existing users.

REST authentication endpoints:

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/activity
POST /api/auth/password
POST /api/auth/logout
```

Angular adds `/login`, `/change-password` and `/forbidden`; existing catalog
routes are guarded. WebSocket connections require a trusted origin and a valid
session after initial password replacement. No business events are exposed yet.

### Slice 4 — Data ingestion foundation

Status: pending; explicitly outside the Slice 3 closure.

The owner subsequently expanded this slice to include administrative UI,
per-equipment persistence settings and machine-run/recovery behavior. The
approved requirements and manual-entry permission assignments are in
`slice-4-approved-scope.md`. This scope is not yet implemented.

- controlled MQTT subscriptions for Machine and Device data topics;
- shared-contract validation at the boundary;
- idempotency and JSONB persistence policy;
- scoped WebSocket publication to Angular.

## Inventory normalization

The 45 Machines and 40 Devices supplied for Sprint 1 are development seed data.
The import:

- creates 12 Areas, including `Estabilidad` as an Area separate from
  `Control de calidad`;
- assigns `Estabilidad1` through `Estabilidad12` to the `Estabilidad` Area;
- preserves the legacy integer IDs;
- normalizes mojibake, accents and repeated whitespace;
- preserves stable internal codes;
- replaces the `N/A` placeholder for `Sistema de Alarmas` with the approved
  stable code `AL-01-M`;
- does not turn PLC registers or internal sensors into application Devices.

Technical Device names are preserved as supplied until their owners approve any
spelling or naming changes.

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
pnpm test:integration
```

The production installation at `172.16.201.31` is never used by these commands.
