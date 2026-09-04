-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "iam";

-- CreateEnum
CREATE TYPE "iam"."ScopeType" AS ENUM ('PLANT', 'AREA', 'MACHINE', 'DEVICE');

-- CreateTable
CREATE TABLE "iam"."users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(254),
    "password_hash" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "security_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."roles" (
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "iam"."permissions" (
    "code" VARCHAR(100) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "iam"."user_roles" (
    "user_id" UUID NOT NULL,
    "role_code" VARCHAR(64) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_code")
);

-- CreateTable
CREATE TABLE "iam"."role_permissions" (
    "role_code" VARCHAR(64) NOT NULL,
    "permission_code" VARCHAR(100) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_code","permission_code")
);

-- CreateTable
CREATE TABLE "iam"."user_scopes" (
    "user_id" UUID NOT NULL,
    "type" "iam"."ScopeType" NOT NULL,
    "resource_id" UUID NOT NULL,

    CONSTRAINT "user_scopes_pkey" PRIMARY KEY ("user_id","type","resource_id")
);

-- CreateTable
CREATE TABLE "iam"."sessions" (
    "token_hash" VARCHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "security_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_activity_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("token_hash")
);

-- CreateTable
CREATE TABLE "iam"."login_windows" (
    "key" VARCHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "login_windows_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit"."audit_events" (
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "actor" VARCHAR(160) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(64) NOT NULL,
    "resource_id" VARCHAR(100),
    "result" VARCHAR(32) NOT NULL,
    "reason" VARCHAR(160) NOT NULL,
    "source_ip" VARCHAR(64),
    "user_agent" VARCHAR(300),
    "correlation_id" UUID NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "iam"."users"("username");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "iam"."sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "iam"."sessions"("expires_at");

-- CreateIndex
CREATE INDEX "login_windows_expires_at_idx" ON "iam"."login_windows"("expires_at");

-- CreateIndex
CREATE INDEX "audit_events_occurred_at_idx" ON "audit"."audit_events"("occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_user_id_occurred_at_idx" ON "audit"."audit_events"("user_id", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "iam"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."user_roles" ADD CONSTRAINT "user_roles_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "iam"."roles"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."role_permissions" ADD CONSTRAINT "role_permissions_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "iam"."roles"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."role_permissions" ADD CONSTRAINT "role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "iam"."permissions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."user_scopes" ADD CONSTRAINT "user_scopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
