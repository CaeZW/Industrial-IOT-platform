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
