# Event Contracts

Every application event uses a common envelope:

```text
eventId
eventType
schemaVersion
timestamp
correlationId
source
payload
```

All transport timestamps use UTC.

Telemetry should distinguish at least:

- event time;
- received time;
- processing/persistence time where useful.

Contracts must be versionable without silently breaking consumers.
Canonical TypeScript contracts live in `packages/contracts`.
