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
