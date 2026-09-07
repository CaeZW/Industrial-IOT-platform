# Authorization / RBAC

Model:

```text
User
 ↓
Role
 ↓
Permission
```

Resource scope:

```text
Plant
Area
Machine
Device
```

Example:

```text
OPERATOR
 + Area: Estériles
```

A user may be allowed to view a machine without having permission to control it.

Angular guards improve UX.

NestJS guards/policies enforce the actual authorization.

Manual process entry (4E) requires ADMINISTRATOR, SUPERVISOR or MAINTENANCE
membership, process.manual.write, page.machines.view and the target machine
scope. Registering the completed control interval additionally requires
machine.run.manual.manage. machine.control does not authorize manual entry by
itself. The request supplies validated start/stop timestamps but cannot supply
the responsible user; NestJS always uses the authenticated identity.
The transaction rechecks current role grants, account state and scope, including
for idempotent retries. Operator remains read-only. Normal CSRF/session controls
apply; successful mutations and audit are atomic. No MQTT command is published.
