ALTER TABLE "core"."machines"
  ADD COLUMN "persistence_interval_seconds" INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN "running_key" VARCHAR(120) NOT NULL DEFAULT 'en_marcha',
  ADD CONSTRAINT "machines_persistence_interval_check" CHECK ("persistence_interval_seconds" BETWEEN 1 AND 86400),
  ADD CONSTRAINT "machines_running_key_check" CHECK (length(trim("running_key")) > 0);

ALTER TABLE "core"."devices"
  ADD COLUMN "persistence_interval_seconds" INTEGER NOT NULL DEFAULT 300,
  ADD CONSTRAINT "devices_persistence_interval_check" CHECK ("persistence_interval_seconds" BETWEEN 1 AND 86400);
