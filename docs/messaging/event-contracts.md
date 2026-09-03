# Event Contracts

Every application event uses a common envelope:

```text
eventId
eventType
schemaVersion
eventTime
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

Command requests and command results are command messages, not application event
envelopes. Their canonical wire contracts are also defined in
`packages/contracts` and include the identifiers and timestamps required for
safe physical execution.
