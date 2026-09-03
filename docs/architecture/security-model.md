# Security Model

## Authentication

User-based authentication. Local authentication is the initial target; OIDC/SSO can be added later if required.

Passwords must be stored as secure password hashes.

## Authorization

```text
User
 |
 +--> Role --> Permission
 |
 +--> Resource Scope
```

Scopes:

```text
Plant
Area
Machine
Device
```

The backend is authoritative. Frontend guards are UX controls only.

## Audit

Audit sensitive operations such as login failures, authorization failures, commands, configuration changes, alarm acknowledgement, administration and relevant reports.

## MQTT security

The local development broker may be simplified for localhost testing. Before deployment beyond the isolated workstation, configure authentication, ACLs and TLS as appropriate.
