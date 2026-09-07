CREATE TABLE "operations"."machine_runs" (
  "id" UUID NOT NULL, "machine_id" UUID NOT NULL,
  "started_at" TIMESTAMPTZ(3) NOT NULL, "finished_at" TIMESTAMPTZ(3),
  "last_heartbeat_at" TIMESTAMPTZ(3) NOT NULL, "observer_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "machine_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "machine_runs_times_check" CHECK ("last_heartbeat_at" >= "started_at" AND ("finished_at" IS NULL OR "finished_at" >= "last_heartbeat_at")),
  CONSTRAINT "machine_runs_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "core"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "machine_runs_id_machine_id_key" ON "operations"."machine_runs"("id", "machine_id");
CREATE UNIQUE INDEX "machine_runs_one_open_per_machine" ON "operations"."machine_runs"("machine_id") WHERE "finished_at" IS NULL;
CREATE INDEX "machine_runs_machine_id_started_at_id_idx" ON "operations"."machine_runs"("machine_id", "started_at" DESC, "id" DESC);
CREATE TABLE "operations"."process_data" (
  "id" UUID NOT NULL, "machine_id" UUID NOT NULL, "machine_run_id" UUID,
  "event_id" UUID NOT NULL, "event_time" TIMESTAMPTZ(3) NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source_type" VARCHAR(20) NOT NULL CHECK ("source_type" IN ('NODE_RED', 'MQTT_DIRECT', 'MANUAL')),
  "readings" JSONB NOT NULL,
  CONSTRAINT "process_data_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "process_data_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "core"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "process_data_machine_run_id_machine_id_fkey" FOREIGN KEY ("machine_run_id", "machine_id") REFERENCES "operations"."machine_runs"("id", "machine_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "process_data_machine_id_event_id_key" ON "operations"."process_data"("machine_id", "event_id");
CREATE INDEX "process_data_machine_run_id_event_time_id_idx" ON "operations"."process_data"("machine_run_id", "event_time" DESC, "id" DESC);
CREATE INDEX "process_data_machine_id_event_time_id_idx" ON "operations"."process_data"("machine_id", "event_time" DESC, "id" DESC);
CREATE TABLE "operations"."machine_ingestion_state" (
  "machine_id" UUID NOT NULL, "last_event_id" UUID NOT NULL,
  "last_event_time" TIMESTAMPTZ(3) NOT NULL, "last_persisted_at" TIMESTAMPTZ(3),
  CONSTRAINT "machine_ingestion_state_pkey" PRIMARY KEY ("machine_id"),
  CONSTRAINT "machine_ingestion_state_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "core"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
