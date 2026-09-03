# Docker Commands

## Start

```bash
docker compose --env-file .env -f infra/compose/compose.yaml up -d
```

## Stop

```bash
docker compose --env-file .env -f infra/compose/compose.yaml stop
```

## Down

```bash
docker compose --env-file .env -f infra/compose/compose.yaml down
```

## Down and delete volumes

```bash
docker compose --env-file .env -f infra/compose/compose.yaml down -v
```

## Status

```bash
docker compose --env-file .env -f infra/compose/compose.yaml ps
```

## Logs

```bash
docker compose --env-file .env -f infra/compose/compose.yaml logs -f
docker logs -f docker-postgre
docker logs -f docker-mosquitto
docker logs -f docker-nodered
```

## Inspect networks

```bash
docker network inspect industrial-iot-platform_iot-messaging
docker network inspect industrial-iot-platform_application-data
```

## Automated Sprint 0 validation

Validate an already-running stack:

```bash
pnpm infra:validate
```

Start the local stack, wait for healthchecks and validate isolation:

```bash
pnpm infra:validate:start
```

The validator checks loopback bindings, service health and that Node-RED and
PostgreSQL do not share a Docker network. It never connects to production.

## Stats

```bash
docker stats docker-postgre docker-mosquitto docker-nodered
```
