# Local Webapp Preview

These commands use only the local development environment. They do not connect
to the production installation.

## 1. Initial preparation

Open PowerShell in the repository:

```powershell
cd "C:\Users\GAIOT-PC\Desktop\IotApp\industrial-iot-platform-sprint-0_V2"
pnpm install --frozen-lockfile
docker compose --env-file .env -f infra/compose/compose.yaml up -d --wait
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm users:init
```

`db:deploy` applies the versioned migrations without creating new ones. Use
`pnpm db:migrate` only while intentionally developing a new Prisma migration.

`users:init` creates missing initial users and delivers temporary passwords in
a private `.local` file. It never resets existing accounts. Open the generated
file locally, use your own username/password and replace the temporary password
at first login. See `user-administration.md` for account commands.

## 2. Start NestJS

Keep this first terminal open:

```powershell
cd "C:\Users\GAIOT-PC\Desktop\IotApp\industrial-iot-platform-sprint-0_V2"
pnpm dev:api
```

## 3. Start Angular

Open a second PowerShell terminal and keep it open:

```powershell
cd "C:\Users\GAIOT-PC\Desktop\IotApp\industrial-iot-platform-sprint-0_V2"
pnpm dev:web
```

## 4. Open the webapp

```text
Home         http://127.0.0.1:4200/
Login        http://127.0.0.1:4200/login
Catalog      http://127.0.0.1:4200/catalog
Areas        http://127.0.0.1:4200/catalog/areas
Machines     http://127.0.0.1:4200/catalog/machines
Devices      http://127.0.0.1:4200/catalog/devices
API health   http://127.0.0.1:3000/api/health/ready
```

Angular forwards `/api` requests to NestJS through the local development proxy.
The browser never connects directly to PostgreSQL or MQTT.

## 5. Optional checks

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health/ready
```

An unauthenticated request to `/api/catalog/overview` now returns HTTP 401.
Use the signed-in browser to inspect the catalog. Do not copy browser session
cookies into shared terminals or documentation.

## 6. Stop without deleting data

Press `Ctrl+C` in the Angular and NestJS terminals. Then run:

```powershell
cd "C:\Users\GAIOT-PC\Desktop\IotApp\industrial-iot-platform-sprint-0_V2"
docker compose --env-file .env -f infra/compose/compose.yaml stop
```

The PostgreSQL, Mosquitto and Node-RED volumes remain intact.
