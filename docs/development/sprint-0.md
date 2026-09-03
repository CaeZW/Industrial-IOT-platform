# Sprint 0 — Foundation

## Scope

Sprint 0 creates the engineering foundation only.

### Included

- Repository
- Monorepo
- Architecture docs
- Context prompt
- AGENTS.md
- CI
- Docker Compose local infrastructure
- Shared contracts package

### Explicitly excluded

- real authentication implementation;
- RBAC implementation;
- real Angular features;
- PLC drivers;
- production Node-RED flows;
- telemetry ingestion logic;
- historian persistence logic;
- physical command execution;
- production PDF generation.

## Acceptance criteria

1. Repository is installable with Node 24 LTS and pnpm 11.
2. Workspace layout exists for `apps/api`, `apps/web` and `packages/contracts`.
3. Architecture decisions are documented.
4. AI agent rules are persistent in `AGENTS.md`.
5. CI executes installation, lint, typecheck, test and build scripts.
6. Local PostgreSQL/MQTT/Node-RED are reproducible with Docker Compose.
7. Shared event contracts compile independently.
8. No application layer bypasses the approved architecture.

## Placeholder application policy

`apps/api` and `apps/web` reserve their workspace locations during Sprint 0.
They intentionally contain no synthetic TypeScript source, build, lint or test
scripts. NestJS and Angular will create their authoritative configuration and
source files in Sprint 1.

Sprint 0 quality gates execute against repository invariants and the real shared
contracts package. They must not report fake application tests or builds.

## Completion status

Sprint 0 repository and local-infrastructure acceptance is complete. The
repeatable validation covers:

- frozen-lockfile installation;
- ESLint and strict TypeScript checks;
- repository-invariant and shared-contract tests;
- emitted shared-contract artifacts;
- dependency vulnerability audit;
- Docker service health and persistent-volume attachment;
- MQTT broker and Node-RED publish/subscribe communication;
- Node-RED administrator authentication;
- runtime network isolation and active-flow production-reference checks.

The CI workflow repeats repository checks and starts the isolated Compose stack
for operational validation. It never connects to plant infrastructure.
