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

Images are pinned by version and digest. Updating a digest is an explicit
maintenance change that must be followed by the full Sprint 0 validation.

## Network isolation

```text
iot-messaging
  ├── docker-mosquitto
  └── docker-nodered

application-data
  └── docker-postgre
```

For development, `application-data` is a private bridge and PostgreSQL is
published exclusively on `127.0.0.1:55432` for local NestJS, migrations and
pgAdmin. The loopback binding is not reachable from the plant LAN.

`docker-nodered` and `docker-postgre` intentionally do not share a Docker network.
The future NestJS API will be the only application component attached to both networks.

Production must remove the PostgreSQL host-port mapping and mark its data network
as internal. This Compose file must not be reused unchanged for production.

Docker Compose supports explicit multi-network service isolation; services that do not
share a network cannot communicate through that Compose topology.

The fixed Compose project and container names identify the canonical local
development stack. Do not run this Compose file concurrently from copied
checkouts; use the Git repository checkout as the single owner of the stack.

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

This configuration is safe only while every published host binding remains
`127.0.0.1`. The mandatory non-local deployment checklist is documented in
`docs/security/deployment-gate.md`.

## Versioned simulator

`nodered/flows.simulator.json` is a development-only flow that publishes dynamic
machine data to `iot/v1/machines/SIM-MACHINE-01/data`. Import it into the local
Node-RED editor when validating Node-RED → MQTT communication.

The simulator is not mounted automatically and contains no industrial protocol
nodes, production addresses or PostgreSQL access.
