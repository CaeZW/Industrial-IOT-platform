# Deployment Security Gate

Sprint 0 infrastructure is for isolated localhost development only. It must not
be reused as a plant deployment configuration.

Before binding a service to a non-loopback interface or connecting to plant
equipment, all of the following are mandatory:

- create separate MQTT identities for NestJS, Node-RED and each direct device;
- disable anonymous MQTT access;
- apply least-privilege MQTT ACLs without unrestricted `#` access;
- enable TLS when required by the network threat model;
- use a PostgreSQL migration role separate from the least-privilege API role;
- replace development credentials and verify that no secret is present in Git;
- protect Node-RED administration and disable unused HTTP endpoints;
- validate firewall rules and network segmentation;
- test expiry, idempotency and authorization of commands with simulators;
- approve the controlled integration and rollback plan;
- verify that no development component points to `172.16.201.31`.

Failure of any item blocks deployment or physical-device integration.
