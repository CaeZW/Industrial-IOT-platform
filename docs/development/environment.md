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

TZ
```

Do not commit `.env`.

The project intentionally does not maintain `.env.example` in Sprint 0.

`MQTT_USERNAME` and `MQTT_PASSWORD` are reserved for the authenticated broker
configuration required before plant deployment. The Sprint 0 broker is
anonymous only on loopback; the variables do not imply that local authentication
is active. See `docs/security/deployment-gate.md`.
Document variable names here instead.
