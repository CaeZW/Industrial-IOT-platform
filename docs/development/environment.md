# Local Environment

Current `.env` is local-only.

Typical settings:

```text
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_HOST
POSTGRES_PORT

MQTT_HOST
MQTT_PORT
MQTT_WS_PORT
MQTT_USERNAME
MQTT_PASSWORD

NODERED_HOST
NODERED_PORT
NODERED_USERNAME
NODERED_PASSWORD_HASH

API_HOST
API_PORT

WEB_HOST
WEB_PORT
AUTH_WEB_ORIGIN (optional; defaults to http://WEB_HOST:WEB_PORT)

TZ
```

Do not commit `.env`.

The project intentionally does not maintain `.env.example` in Sprint 0.

`MQTT_USERNAME` and `MQTT_PASSWORD` are reserved for the authenticated broker
configuration required before plant deployment. The Sprint 0 broker is
anonymous only on loopback; the variables do not imply that local authentication
is active. See `docs/security/deployment-gate.md`.
Document variable names here instead.

Prisma and NestJS construct the local PostgreSQL connection from these existing
`POSTGRES_*` values. No separate `DATABASE_URL` is required.

`AUTH_WEB_ORIGIN` is the exact browser origin, without a trailing slash. Local
development supports the configured port on localhost/127.0.0.1. Non-loopback
origins require HTTPS; cookie Secure follows that origin. The existing
deployment security gate remains mandatory. No JWT signing secret is needed:
sessions use opaque random tokens with digests stored in PostgreSQL.
