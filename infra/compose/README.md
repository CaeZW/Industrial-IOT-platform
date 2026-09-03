# Isolated Docker Infrastructure

This Compose stack creates a completely independent development/test environment.
It does not replace, connect to, stop, or reconfigure the existing plant services.

## Existing plant infrastructure — untouched

```text
Node-RED    http://172.16.201.31:1880/
PostgreSQL  172.16.201.31:5432
Mosquitto   172.16.201.31:1883
```

## New Docker infrastructure

```text
Node-RED         http://localhost:51880
PostgreSQL       localhost:55432
MQTT             localhost:51883
MQTT WebSocket   localhost:59001
```

Container names:

```text
docker-nodered
docker-postgre
docker-mosquitto
```

## Network isolation

```text
iot-messaging
  ├── docker-mosquitto
  └── docker-nodered

application-data
  └── docker-postgre
```

`docker-nodered` and `docker-postgre` intentionally do not share a Docker network.
The future NestJS API will be the only application component attached to both networks.

Docker Compose supports explicit multi-network service isolation; services that do not
share a network cannot communicate through that Compose topology. citeturn384567search0turn384567search1

## Start

```bash
docker compose -f infra/compose/compose.yaml up -d
```

## Inspect

```bash
docker compose -f infra/compose/compose.yaml ps
docker compose -f infra/compose/compose.yaml logs -f
```

## Stop

```bash
docker compose -f infra/compose/compose.yaml down
```

## Delete local Docker data

```bash
docker compose -f infra/compose/compose.yaml down -v
```

This removes only volumes belonging to this Compose project.

## Development security note

The Sprint 0 Mosquitto configuration allows anonymous local connections for development convenience.
Production configuration must use authentication, ACLs and appropriate TLS.
