CREATE SCHEMA IF NOT EXISTS "operations";
CREATE TABLE "operations"."device_data" (
  "id" UUID NOT NULL, "device_id" UUID NOT NULL, "event_id" UUID NOT NULL,
  "event_time" TIMESTAMPTZ(3) NOT NULL, "received_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source_type" VARCHAR(20) NOT NULL CHECK ("source_type" IN ('NODE_RED','MQTT_DIRECT')),
  "readings" JSONB NOT NULL,
  CONSTRAINT "device_data_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_data_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "core"."devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "device_data_device_id_event_id_key" ON "operations"."device_data"("device_id","event_id");
CREATE INDEX "device_data_device_id_event_time_id_idx" ON "operations"."device_data"("device_id","event_time" DESC,"id" DESC);
CREATE TABLE "operations"."device_ingestion_state" (
  "device_id" UUID NOT NULL, "last_event_id" UUID NOT NULL,
  "last_event_time" TIMESTAMPTZ(3) NOT NULL, "last_persisted_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "device_ingestion_state_pkey" PRIMARY KEY ("device_id"),
  CONSTRAINT "device_ingestion_state_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "core"."devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
