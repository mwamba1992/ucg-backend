# FSP Code Migration Fix

## Problem
The `fspCode` column was added to the `payments` table as NOT NULL without a default value, causing issues when existing payment records had null values.

## Solution
Added a default value of `'UNKNOWN'` to the `fspCode` column in both the entity definition and migration.

## Changes Made

### 1. Payment Entity (src/modules/payment/entities/payment.entity.ts:52)
```typescript
@Column({ type: 'varchar', length: 50, default: 'UNKNOWN' })
@Index()
fspCode: string;
```

### 2. Migration (src/database/migrations/1736182000000-AddFspCodeToPayments.ts)
The migration already had the correct logic:
- Adds column with DEFAULT 'UNKNOWN'
- Updates existing records based on payment channel
- Creates index for performance

## How It Works

When the migration runs:
1. Adds `fspCode` column with default value 'UNKNOWN'
2. Updates existing payments to set fspCode based on paymentChannel:
   - 'VODACOM' for M-Pesa/Vodacom payments
   - 'TIGO' for TigoPesa payments
   - 'AIRTEL' for Airtel Money
   - 'HALOTEL' for HaloPesa
   - 'BANK' for bank payments
   - 'UNKNOWN' for any others

3. Creates an index on fspCode for faster queries

## FSP Code Values

The following FSP codes are used in payment creation:

| Service | FSP Code | Location |
|---------|----------|----------|
| M-Pesa (Vodacom) | VODACOM | mpesa.service.ts:333 |
| TigoPesa | TIGO | tigopesa.service.ts:284 |
| Payment Queue | From message | payment.consumer.ts:39 |
| Default | UNKNOWN | Migration default |

## Running Migrations

To apply these changes:

```bash
# Run migrations
npm run migration:run

# Or if using the application (with synchronize: true in development)
npm run start:dev
```

## Database Requirements

Ensure your database user has the correct permissions:
- CREATE TABLE
- ALTER TABLE
- CREATE INDEX
- INSERT/UPDATE/DELETE

## Verification

After migration, verify:

```sql
-- Check the column exists with default
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'payments' AND column_name = 'fspCode';

-- Check existing data
SELECT fspCode, COUNT(*)
FROM payments
GROUP BY fspCode;

-- Check index exists
SELECT indexname
FROM pg_indexes
WHERE tablename = 'payments' AND indexname LIKE '%fspCode%';
```
