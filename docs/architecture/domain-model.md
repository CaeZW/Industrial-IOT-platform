# Domain Model

Primary hierarchy:

```text
Plant
└── Area
    ├── Machines
    └── Devices
```

Machine = operational equipment.

Device = independently monitored/data-producing device.

Do not model every physical sensor/register as an application Device.

Machine-specific internal values are represented as JSONB process data.

Optional `measurement_definitions` gives machine/device variables readable names,
units, report labels and optional validation.

Examples:

```text
Bramcor
  AI01 → Temperatura ingreso
  AI02 → Presión
```

```text
ESP32_Client01
  temperatura → Temperatura ambiente
  humedad → Humedad ambiente
```
