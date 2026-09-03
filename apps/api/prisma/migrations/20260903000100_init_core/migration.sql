CREATE SCHEMA IF NOT EXISTS "core";

CREATE TABLE "core"."plants" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."areas" (
    "id" UUID NOT NULL,
    "plant_id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."machines" (
    "id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "code" VARCHAR(120),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "machine_type" VARCHAR(100),
    "legacy_machine_id" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "core"."devices" (
    "id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "code" VARCHAR(120),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "device_type" VARCHAR(100),
    "legacy_device_id" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plants_code_key" ON "core"."plants"("code");
CREATE INDEX "areas_plant_id_idx" ON "core"."areas"("plant_id");
CREATE UNIQUE INDEX "areas_plant_id_code_key" ON "core"."areas"("plant_id", "code");
CREATE UNIQUE INDEX "machines_code_key" ON "core"."machines"("code");
CREATE UNIQUE INDEX "machines_legacy_machine_id_key" ON "core"."machines"("legacy_machine_id");
CREATE INDEX "machines_area_id_idx" ON "core"."machines"("area_id");
CREATE UNIQUE INDEX "devices_code_key" ON "core"."devices"("code");
CREATE UNIQUE INDEX "devices_legacy_device_id_key" ON "core"."devices"("legacy_device_id");
CREATE INDEX "devices_area_id_idx" ON "core"."devices"("area_id");

ALTER TABLE "core"."areas"
ADD CONSTRAINT "areas_plant_id_fkey"
FOREIGN KEY ("plant_id") REFERENCES "core"."plants"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."machines"
ADD CONSTRAINT "machines_area_id_fkey"
FOREIGN KEY ("area_id") REFERENCES "core"."areas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "core"."devices"
ADD CONSTRAINT "devices_area_id_fkey"
FOREIGN KEY ("area_id") REFERENCES "core"."areas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
