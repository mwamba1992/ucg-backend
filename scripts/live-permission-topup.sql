-- ============================================================================
-- LIVE schema top-up  —  permission system + SP reference-query columns
-- ----------------------------------------------------------------------------
-- Fully IDEMPOTENT. Safe to run once (or more) on LIVE (192.168.1.97 / ucg_db).
-- Creates ONLY new tables/columns; never drops or rewrites existing data.
--
-- Use this INSTEAD of `npm run migration:run` on LIVE, because LIVE has no
-- migrations table and the early migrations (CreateUserTable, create_tables)
-- are not idempotent — a full migration:run would fail on already-existing
-- tables. This script mirrors exactly the 3 migrations LIVE actually needs.
--
--   psql -h 192.168.1.97 -U postgres -d ucg_db -v ON_ERROR_STOP=1 -f scripts/live-permission-topup.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Permission catalog -------------------------------------------------------
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "code" VARCHAR(100) NOT NULL,
  "description" VARCHAR(255),
  "module" VARCHAR(50),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_permissions" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_permissions_code" UNIQUE ("code")
);
CREATE INDEX IF NOT EXISTS "IDX_permissions_code" ON "permissions" ("code");
CREATE INDEX IF NOT EXISTS "IDX_permissions_module" ON "permissions" ("module");

-- Role -> permission mapping
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "role" VARCHAR(50) NOT NULL,
  "permissionId" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_role_permissions" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_role_permission" UNIQUE ("role", "permissionId"),
  CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permissionId")
    REFERENCES "permissions" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_role_permissions_role" ON "role_permissions" ("role");
CREATE INDEX IF NOT EXISTS "IDX_role_permissions_permissionId" ON "role_permissions" ("permissionId");

-- 2) Roles table + relax users.role (enum -> varchar), guarded ---------------
CREATE TABLE IF NOT EXISTS "roles" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "name" VARCHAR(50) NOT NULL,
  "label" VARCHAR(100) NOT NULL,
  "description" VARCHAR(255),
  "userType" VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_roles_name" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "IDX_roles_name" ON "roles" ("name");

-- Only convert if users.role is still the Postgres enum type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "users" ALTER COLUMN "role" TYPE VARCHAR(50) USING "role"::text;
    ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
    DROP TYPE "users_role_enum";
  END IF;
EXCEPTION WHEN dependent_objects_still_exist THEN
  NULL; -- another column still uses the enum; leave it
END $$;

-- 3) SP reference-query columns ----------------------------------------------
ALTER TABLE "service_providers" ADD COLUMN IF NOT EXISTS "spReferencePrefix" VARCHAR(10);
ALTER TABLE "service_providers" ADD COLUMN IF NOT EXISTS "referenceQueryUrl" TEXT;
ALTER TABLE "service_providers" ADD COLUMN IF NOT EXISTS "outboundApiKey" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UQ_service_providers_spReferencePrefix'
  ) THEN
    ALTER TABLE "service_providers"
      ADD CONSTRAINT "UQ_service_providers_spReferencePrefix" UNIQUE ("spReferencePrefix");
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "IDX_service_providers_spReferencePrefix"
  ON "service_providers" ("spReferencePrefix");

-- Done. Next: run the seeds on the LIVE app server:
--   npm run seed:roles
--   npm run seed:permissions
