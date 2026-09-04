# Sprint 1 Slice 3 — Authentication decisions

Approved scope: local authentication, authorization of the existing catalog,
WebSocket connection protection, audit and local user administration. No OT
commands, telemetry ingestion, reports or administration UI are introduced.

## Credentials and sessions

- Username (case-normalized) and password; email is optional contact data.
- All 13 supplied accounts start active. Temporary passwords are unique random
  values; first login permits only session management/password replacement.
- Use Node's stable scrypt implementation (N=131072, r=8, p=1), random salts and
  constant-time comparison. Passwords contain 8–128 characters; no truncation.
  The owner changed the minimum to 8. `auth.policy.ts` is authoritative: DTOs,
  password services and messages use its constants. Session responses include
  `passwordPolicy` so Angular uses the same limits instead of fixed HTML values.
- Opaque random session tokens are transported in HttpOnly, SameSite=Strict
  cookies, never localStorage. Only SHA-256 token digests are stored in PostgreSQL.
- Server-enforced one-hour idle and eight-hour absolute expiration. Only the
  explicit activity endpoint refreshes idle time, never reads or socket traffic.
  Angular sends activity only after trusted pointer/key/scroll interactions,
  coalesced to avoid a request for every interaction.
- Expired sessions cannot be revived. Password replacement rotates the session;
  resets, disablement and authorization changes revoke existing sessions.
- Unsafe HTTP requests require a configured trusted Origin and custom request
  header. WebSocket handshakes require trusted Origin and a valid session.
- Cookie Secure is mandatory outside localhost. Deployment also requires TLS
  and the existing deployment gate; this slice does not authorize LAN exposure.
- Login attempts are bounded by persistent username and source-IP windows.
  Failure messages do not disclose whether an account exists or is disabled.

## Authorization

User → Role → Permission plus explicit Plant/Area/Machine/Device scopes remains
the approved model. No scope means no access. Filtering happens in SQL before
pagination/counting; overview and area counts follow the same authorization.

Initial roles: ADMINISTRATOR, SUPERVISOR, MAINTENANCE, OPERATOR, QUALITY_CONTROL,
PRODUCTION, RESEARCH_DEVELOPMENT (I&D), VALIDATION. The supplied action matrix
applies; OPERATOR initially receives catalog-view permissions only. Roles that
can control machines do not gain an executable control endpoint in this slice.

Administrator, Supervisor, Maintenance and Operator initially cover the plant.
The other roles receive the supplied eleven explicit areas excluding
Mantenimiento, including the new Estabilidad area. New areas are not silently
granted to explicitly area-scoped users. A user with a single-machine/device
scope may see its parent area/plant labels, but not its siblings or their counts.

## Administration and audit

Commands run through NestJS application services and Prisma infrastructure.
Their trust boundary is the local OS account with database administrative
configuration, not a public HTTP administration endpoint. Record the OS actor,
target, action, result, time and correlation identifier. API events record
the authenticated user where known; never record request bodies or credentials.

Initial passwords are delivered once in a gitignored `.local` file restricted
to the current OS user (Windows ACL / POSIX 0600). Do not print its contents in
logs or commit it. The administrator distributes passwords privately and removes
the file after delivery. Re-running initialization never resets existing users,
passwords, activation state, role grants or scopes. Later edits use explicit
audited commands; inventory seeding is separate from identity provisioning.

## References

- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Socket.IO middleware](https://socket.io/docs/v4/middlewares/)
