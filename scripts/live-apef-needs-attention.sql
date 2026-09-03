-- ============================================================================
-- LIVE schema top-up  —  APEF NEEDS_ATTENTION payment status
-- ----------------------------------------------------------------------------
-- Fully IDEMPOTENT. Safe to run once (or more) on LIVE (192.168.1.97 / ucg_db).
-- Adds ONE enum value; never drops, rewrites or reclassifies existing rows.
--
-- Required before deploying the APEF retry cap: retryPendingNotifications now
-- parks a payment in NEEDS_ATTENTION once it has exhausted its notification
-- attempts, and Postgres rejects the write if the enum lacks the label.
--
-- Run this BEFORE restarting the backend. Do NOT use `npm run migration:run`
-- on LIVE - see scripts/live-permission-topup.sql for why.
--
--   psql -h 192.168.1.97 -U postgres -d ucg_db -v ON_ERROR_STOP=1 \
--        -f scripts/live-apef-needs-attention.sql
-- ============================================================================

ALTER TYPE "apef_payments_status_enum" ADD VALUE IF NOT EXISTS 'NEEDS_ATTENTION';

-- Verify (expect NEEDS_ATTENTION in the list)
SELECT string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS apef_payment_statuses
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'apef_payments_status_enum';
