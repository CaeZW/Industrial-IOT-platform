# Sprint 1 Slice 4 — Approved scope

Status: approved requirements; implementation and acceptance checks pending.
This document does not mark Sprint 1 complete.

## Administrative UI

The owner replaces terminal-only routine administration with an Angular and
Tailwind administrative feature. Existing local commands remain recovery tools.
The initial UI manages existing roles and their permissions, user creation,
activation/deactivation, role and resource-scope assignments, password resets,
and persistence intervals per Machine and per Device.

NestJS must authorize every administration request using the authenticated
principal, with user.manage, role.manage or configuration.write as appropriate.
The UI is not an authorization boundary. Resource configuration also checks
resource scope. Client-supplied actor identifiers are never trusted.
Administrative mutations retain CSRF protection and transactional audit with
the actual authenticated actor. Security changes revoke affected sessions.
Preserve the last active administrator and the protected administrator recovery
policy. Expose neither stored password hashes nor existing passwords.

Creation/reset delivers a generated temporary password only in the successful
response, with no-store caching and no logging or browser persistence. Require
replacement at first login. Losing the response requires another explicit reset,
not a password retrieval endpoint. Confirm destructive access changes in the UI.

No UI for creating role/permission definitions, configurable password policy, or adjustable
session expiration is implied by this scope. Explicit manual-entry permissions
are required as described below. Existing one-hour idle and
eight-hour absolute session limits remain unchanged.

## Dynamic data and persistence

- Node-RED controls publication frequency and sends complete JSON snapshots,
  including unchanged values, zero and false. Preserve unknown JSON keys.
- Ignore unknown equipment without creating equipment, runs or process data
  and without broadcasting it. Validate the envelope and bounded JSON shape;
  measurement definitions are not required.
- Every accepted fresh reading updates the authorized dashboard independently
  of historical persistence. Duplicate or older messages must not regress state.
- Machine readings persist only while the configured running signal is true.
  Save the first reading of a run immediately, then at the configured interval.
  OFF closes the run but is not stored as a process reading.
- Devices have no machine run. Save their first valid reading, then at their
  individually configured interval.
- Default interval is 300 seconds for every Machine and Device. UI changes
  must survive API restart; persist validated per-resource settings in PostgreSQL
  through Prisma. Acquisition/publication remain Node-RED responsibilities.
- A machine's running key is configurable, default en_marcha, with strict
  boolean values. Existing arranque flows can use that key explicitly.
- Missing/invalid running signals must not be interpreted as OFF or extend
  confirmed running time.

## Machine runs and recovery

Persist the open run's heartbeat on each fresh valid running reading, independently
of the five-minute JSONB interval. A duplicate must not advance the heartbeat.
Heartbeat updates are updates to the run, not extra historical reading rows.
Node-RED must not label cached PLC values as freshly acquired data.

After restart, wait for fresh equipment data. ON continues an existing open run;
OFF closes it using the last persisted heartbeat as the definitive recorded
finish time, per the owner's accounting rule. Do not add an interruption closure
label. That accounting timestamp cannot establish the physical stop time during
an unobserved gap; ON likewise cannot prove uninterrupted operation during it.
No data means unknown state, not an inferred physical stop.

Persist ordinary start/stop transitions immediately and link process readings
to their run. Enforce at most one open run per machine and atomic run/readings
changes. Recovery must work from PostgreSQL, not only process memory.

## Manual entry and reports

Manual machines use authenticated Angular forms through NestJS REST, storing
JSONB with source MANUAL, responsible user and run association. Manual saves are
immediate, not interval sampled; manual runs do not expire for lack of MQTT.
The owner approved ADMINISTRATOR, SUPERVISOR and MAINTENANCE for manual reading
entry and manual run start/close, restricted to their authorized machines.
OPERATOR remains read-only; other roles receive no implicit manual-write access.
Use explicit backend-enforced permissions for manual data entry and manual run
management, independently of machine.control. These operations record business
data; they never issue physical machine commands. Audit the responsible user.

Reports consume persisted runs/readings. Machine-specific report templates and
PDF rendering are subsequent work, not implicitly completed by ingestion.

## Delivery and verification

1. Implement protected user/role administration and its Angular feature.
2. Implement durable per-equipment settings and administrative editing.
3. Implement ingestion, runs, recovery and authorized realtime views.
4. Implement the manual-entry flow with the approved role assignments and scopes.

Check direct unauthorized HTTP calls, scope restrictions, last-administrator
protection, credential non-disclosure, session revocation, audit and settings
survival across restart. Test ON/OFF, short runs, duplicate/out-of-order messages,
unknown equipment, new JSON keys, five-minute policies, devices without runs,
and recovery from stored heartbeats. Use only local simulation and local DB.
Do not reset user accounts, touch production, or leave preview servers running.
