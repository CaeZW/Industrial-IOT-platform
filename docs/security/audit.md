# Audit

Audit sensitive operations.

Minimum concepts:

```text
auditId
occurredAt
userId
action
resourceType
resourceId
result
reason
correlationId
metadata
```

Audit examples:

- authentication failure;
- denied authorization;
- command request;
- command result;
- configuration change;
- alarm acknowledgement;
- role/permission change;
- report action.

Never store passwords or secret material in audit metadata.
