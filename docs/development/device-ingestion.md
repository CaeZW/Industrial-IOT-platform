# 4C — Device ingestion

Status: implemented and validated locally. Machine ingestion is implemented in
4D; see `machine-ingestion.md` for its separate run and recovery behavior.

Scope: devices only, local simulation, dynamic JSONB, interval sampling and
authorized realtime. No machine runs, commands, manual forms or production OT.

Subscribe only to iot/v1/devices/+/data (QoS 1, non-retained). Require canonical
schemaVersion 1.0, immutable UUID eventId, UTC eventTime, matching source.deviceId
and topic integration code. One logical publisher per device emits strictly
increasing eventTime values. Unknown/inactive devices are ignored. Unknown JSON
keys, zero, false, null and nested JSON are preserved. Limit 256 KiB and 32 nesting
levels; reject retained messages and timestamps over 30 seconds in the future.

operations.device_data stores historical readings, source, event ID, event time,
receipt time and creation time. Unique (device_id,event_id), descending time index.
operations.device_ingestion_state is one small cursor per device, not a telemetry
history: last event ID/time and last sampled receipt time. Serialize on the device
row in PostgreSQL. Reject duplicate/latest IDs, previously sampled IDs and events
at or below the time watermark. Canonical retries keep the same ID and timestamp.
Commit watermark and optional history row atomically. Every fresh accepted message
updates the cursor, but only the first and first fresh message at/after the
configured interval insert JSONB history. No synthetic repeated samples when no
messages arrive. Changes to intervals apply on the next message, measured from
the last persisted receipt time. Sampling and dedup survive process restart.

Realtime sends every fresh accepted reading, including ones not historically
sampled. Revalidate session, device-view permission and current device scope for
every recipient; do not renew user inactivity. REST provides scoped detail and
bounded, paginated historical readings. Live snapshots are memory-only, bounded
to 1000 devices. After API restart, the fallback is explicitly a historical sample,
not a claim of current connectivity. Client disconnects show disconnected state.

The consumer has a bounded queue of 64 messages. Overflow and failures are logged
without payloads/secrets. Database failure prevents confirmed ingestion/emission.
This local baseline does not promise lossless delivery through outages: MQTT's
current clean session, process memory and QoS acknowledgment are not a durable
application queue. Do not connect production until outage requirements and MQTT
authentication/ACL/TLS deployment gates have been addressed.

Simulator uses a dedicated SIM-DEVICE-01 record in Estabilidad, marked as simulated,
never one of the 40 real inventory devices. Provisioning is an explicit local
NestJS/Prisma CLI action; publishing is MQTT-only. Default publication every two
seconds, history every five minutes unless changed individually in Administration.
An optional duplicate mode republishes the exact same message for verification.
Simulator creation is separate from the real inventory seed and does not change
its baseline 40 devices. No production access and no new infrastructure.

## Preview (PowerShell, repository root)

Apply migrations on another checkout before starting the API:

```powershell
pnpm db:generate
pnpm db:deploy
pnpm simulate:device:init
```

The init command is idempotent and does not reset the simulator's interval.
It prints its direct Angular link. Its record is in Estabilidad and is visible
to users with the corresponding scope and device-view permission. Local totals
become 41 devices (40 supplied devices plus one clearly labeled simulation).

Run each long-lived command in its own terminal:

```powershell
pnpm dev:api
```

```powershell
pnpm dev:web
```

```powershell
pnpm simulate:device -- --duplicates
```

Do not start a second API/web instance if one is already running. Restart the
existing API after schema changes. Open Catalog → Devices → SIMULADO →
Ver lecturas e histórico. Stop the simulator with Ctrl+C. A bounded smoke test:

```powershell
pnpm simulate:device -- --duplicates --count=3
```

Every two seconds the simulator sends a new reading and, with --duplicates,
an identical QoS 1 repeat. The first reading is historical; the default next
sample is the first fresh reading at least 300 seconds after the previous one.
For a faster visual check, change only SIM-DEVICE-01 to 0.1 minutes (6 seconds)
in Administration → Configuración de equipos, then restore 5 minutes afterwards.
Machine intervals are not consumed yet.

GET /api/devices/:id/data returns metadata and the latest known reading with
LIVE/HISTORY/NONE provenance. GET /api/devices/:id/history?page=1 returns 20
historical samples and hasMore. The namespace /realtime emits device.reading.
HTTP and socket paths enforce current device permission and resource scope.
The UI refreshes snapshots after reconnect and does not use polling as the
primary realtime transport. Displayed times use the browser timezone; storage
is UTC. It shows elapsed receipt age rather than inferring physical device state.

## Checks

pnpm test includes payload-boundary and Angular live-view tests.
pnpm test:integration additionally exercises real local MQTT, PostgreSQL, REST
and Socket.IO, sampling boundaries, concurrent duplicates, restart, resource
denials and scope changes after handshake. The 4C test creates an isolated
local database named iot_4c_test_<random suffix>, applies existing SQL migrations,
and drops only that database at completion. The local test database user needs
CREATE DATABASE permission. Other tests retain their existing local fixtures.
No user-owned server is stopped, and test listeners use ephemeral ports.

Only one API ingestion instance is supported by this baseline. Database locking
prevents duplicate storage across processes, but live caches/socket delivery are
process-local; this is not a multi-instance realtime deployment design.
