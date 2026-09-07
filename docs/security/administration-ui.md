# Administration UI — 4A / 4B

Approved: Angular administration over authenticated NestJS REST; CLI retained
for recovery. IAM administration requires ADMINISTRATOR membership plus the
operation permission (user.manage or role.manage). Granting one permission to
another role does not delegate global identity administration. Equipment
configuration requires configuration.write and the target resource scope.

Reuse UsersService and transactional audit/revocation. HTTP audit identifies
the authenticated user and request context, never an actor supplied in a body.
Keep CSRF checks, no-store responses, mandatory initial password change and
last-active-administrator protection. Temporary credentials are delivered only
after successful provisioning/reset, shown transiently and never stored in the
browser. Existing passwords/hashes are never returned. The UI confirms access
changes and resets. Role definitions remain the existing approved roles.

Persist persistence_interval_seconds directly on Machine and Device, default
300, constrained to integer 1..86400. Machine also has running_key, default
en_marcha, a nonempty top-level JSON key of at most 120 characters. Dots are
literal key characters, not a nested path. These are explicit approved runtime
settings; no acquisition/publication columns are introduced. Audited changes
do not alter Node-RED, MQTT or physical machine behavior. Ingestion will consume
them in the subsequent slice. Inventory reseeding must preserve these settings.

Migration is additive and preserves equipment and users. Rollback the UI/API
feature without dropping the settings or audit data. No new infrastructure.
