-- ============================================================================
-- LIVE schema top-up  —  multi service provider access (one login, many SPs)
-- ----------------------------------------------------------------------------
-- Fully IDEMPOTENT and ADDITIVE. Creates one new table; touches no existing
-- data. Existing SP users keep logging in to their SP exactly as before.
-- Mirrors migration 1764900000000-CreateUserServiceProviders.
--
-- Use this INSTEAD of `npm run migration:run` on LIVE (no migrations table).
--
--   psql -h 192.168.1.97 -U postgres -d ucg_db -v ON_ERROR_STOP=1 -f scripts/live-user-service-providers.sql
--
-- Run this BEFORE deploying the app version that includes multi-SP support:
-- SP login reads this table, so SP logins fail until it exists.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "user_service_providers" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  "serviceProviderId" UUID NOT NULL,
  "role" VARCHAR(50),
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "createdBy" UUID,
  CONSTRAINT "PK_user_service_providers" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_user_service_provider" UNIQUE ("userId", "serviceProviderId"),
  CONSTRAINT "FK_user_service_providers_user" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_user_service_providers_sp" FOREIGN KEY ("serviceProviderId")
    REFERENCES "service_providers"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_user_service_providers_userId" ON "user_service_providers" ("userId");
CREATE INDEX IF NOT EXISTS "IDX_user_service_providers_serviceProviderId" ON "user_service_providers" ("serviceProviderId");
