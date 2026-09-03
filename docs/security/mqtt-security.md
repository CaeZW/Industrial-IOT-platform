# MQTT Security

Development Docker is localhost-bound.

Before plant deployment, Mosquitto must use appropriate:

- authentication;
- ACLs;
- client identities;
- TLS when required by the deployment/network threat model;
- least privilege.

Example intent:

```text
NestJS:
  subscribe to required application data
  publish commands

Node-RED:
  publish machine/device data
  subscribe to authorized commands

Direct MQTT device:
  publish only its allowed data
```

Do not give every client unrestricted `#` access.
