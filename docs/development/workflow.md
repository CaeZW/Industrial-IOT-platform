# Development Workflow

## Before coding

1. Read `PROJECT_CONTEXT.md`.
2. Read `AGENTS.md`.
3. Read relevant architecture/security/messaging documents.
4. Inspect the repository.
5. Plan the smallest coherent change.

## After coding

Run the checks relevant to the change:

```text
lint
typecheck
test
build
```

Do not run or add unrelated tooling merely for ceremony.

## Git

Use small commits with a clear purpose.

Do not commit:

- secrets;
- local `.env`;
- production data;
- generated artifacts.
