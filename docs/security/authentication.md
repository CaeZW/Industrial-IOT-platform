# Authentication

Initial application authentication supports local users.

User record contains a password hash, never plaintext password.

Future OIDC/SSO can be introduced without changing the business permission model.

Authentication failures are auditable.

Access tokens/session identifiers must not be logged in full.
