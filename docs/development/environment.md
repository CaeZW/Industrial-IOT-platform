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
Document variable names here instead.
