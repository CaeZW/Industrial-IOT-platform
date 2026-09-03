# Security Boundaries

```text
Angular → NestJS
NestJS → PostgreSQL
NestJS ↔ MQTT
Node-RED → MQTT
```

Forbidden:

```text
Node-RED → PostgreSQL
Angular → PostgreSQL
Angular → MQTT
Angular → PLC
```

Security layers:

- authentication;
- RBAC;
- resource scopes;
- backend authorization;
- audit;
- MQTT credentials/ACLs before plant deployment;
- network segmentation;
- secrets kept outside Git.
