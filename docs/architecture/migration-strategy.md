# Migration Strategy

## Objective

Migrate the existing production data into the new application without data loss and without a big-bang cutover.

## Legacy mapping

```text
maquinas       -> machines / devices by business meaning
control_horas  -> machine_runs
maquina_data   -> process_data
ambientes_th   -> devices + device_data
alarmas_info   -> alarm_definitions
alarmas_log    -> alarm_events
users          -> iam.users
login_info     -> audit_events
```

Preserve legacy IDs in the new schema where useful.

## Stages

1. Create and validate the new schema.
2. Import historical data without deleting source data.
3. Validate row counts and representative values.
4. Start the new MQTT ingestion path.
5. Validate realtime and persistence.
6. Compare legacy/new results during a parallel period.
7. Establish rollback.
8. Only then stop legacy SQL writes from Node-RED.

The production DB must remain untouched by the new application until the cutover is explicitly approved.
