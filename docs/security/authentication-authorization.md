# Authentication & Authorization

## Authentication

Preferred order:

1. Existing OIDC/SSO identity provider if available.
2. Local authentication only if required.

Protected by default.

## Authorization

```text
User → Role → Permission → Resource Scope
```

Example page permissions:

```text
page.dashboard.view
page.machines.view
page.devices.view
page.alarms.view
page.historian.view
page.production.view
page.reports.view
page.configuration.view
page.configuration.edit
```

Action permissions:

```text
machine.control
alarm.acknowledge
report.create
configuration.write
user.manage
role.manage
audit.read
```

Scopes:

```text
plant
area
line
machine
device
```

Frontend guards control navigation/UX. Backend authorization is the security control.
