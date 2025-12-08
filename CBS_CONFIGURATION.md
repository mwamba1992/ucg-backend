# CBS Transfer Configuration

## Current Configuration

### Commission Rate: **0%** (No Commission)
- Currently hardcoded to `0` in the payment service
- Full payment amount is transferred to service provider
- Can be made configurable in future

### CBS Transfer: **DISABLED by default**
- Controlled by environment variable `CBS_TRANSFER_ENABLED`
- Set to `false` by default
- Must be explicitly enabled when ready

## Environment Variables

```env
# CBS (Core Banking System) Configuration
CBS_API_URL=http://your-cbs-api-url
CBS_TRANSFER_ENABLED=false          # Set to 'true' to enable CBS transfers
UCG_GL_ACCOUNT=1-09-001-10-1200-1200108
```

## Current Behavior

### When `CBS_TRANSFER_ENABLED=false` (Default)
```
Payment Received → Validated → Saved → Notifications → Success
                                ↓
                        CBS transfer SKIPPED
```

Log message: `CBS transfer is disabled - skipping`

### When `CBS_TRANSFER_ENABLED=true`
```
Payment Received → Validated → Saved → CBS Transfer (0% commission) → Notifications → Success
                                              ↓
                                    Full amount transferred to SP
```

## Payment Example (0% Commission)

**Payment Amount**: 50,000 TZS

**Calculation**:
- Gross Amount: 50,000 TZS
- Commission Rate: **0%**
- Commission: 0 TZS
- **Net Amount to SP**: **50,000 TZS** (Full amount)

**CBS Transfer**:
```json
{
  "reference": "TST-0000001-ABC",
  "creditAccount": "2120050000196",
  "debitAccount": "1-09-001-10-1200-1200108",
  "currency": "TZS",
  "amount": 50000,  // Full amount, no commission
  "description": "Payment settlement for TST-0000001-ABC - ABC School",
  "type": "GL_TO_DEPOSIT"
}
```

## How to Enable CBS Transfer

### Step 1: Configure CBS API URL
```bash
# Edit .env
CBS_API_URL=http://your-actual-cbs-endpoint
```

### Step 2: Enable CBS Transfers
```bash
# Edit .env
CBS_TRANSFER_ENABLED=true
```

### Step 3: Set UCG GL Account (Optional)
```bash
# Edit .env - already has default value
UCG_GL_ACCOUNT=1-09-001-10-1200-1200108
```

### Step 4: Restart Application
```bash
npm run start:dev
```

## Service Provider Requirements

For CBS transfer to execute, Service Provider must have:
1. ✅ **Settings configured** (table: `service_provider_settings`)
2. ✅ **Primary bank account** with account number (table: `service_provider_bank_accounts`)
   - `isPrimary = true`
   - `isActive = true`

If either is missing, transfer is skipped with warning log.

## Future: Making Commission Configurable

Currently commission is hardcoded to 0%. To make it configurable:

### Option 1: Use Service Provider Settings
```typescript
// In payment.service.ts, replace line 155:
const commissionRate = Number(settings.commissionRate) || 0;
```

### Option 2: Use Environment Variable
```typescript
// In payment.service.ts, replace line 155:
const commissionRate = Number(process.env.DEFAULT_COMMISSION_RATE) || 0;
```

### Option 3: Use Database Configuration Table
Create a `system_settings` table:
```sql
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  description TEXT
);

INSERT INTO system_settings (key, value, description)
VALUES ('commission_rate', '2.5', 'Default commission rate percentage');
```

Then query in code:
```typescript
const commissionRate = await this.getSystemSetting('commission_rate') || 0;
```

## Testing

### Test with CBS Disabled (Current Default)
```bash
# Make payment
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "referenceNumber": "TST-0000001-ABC",
    "amountPaid": 50000,
    "payerName": "Test User",
    "payerPhone": "0759123081"
  }'

# Check logs - should see:
# "CBS transfer is disabled - skipping"
```

### Test with CBS Enabled
```bash
# 1. Enable in .env
CBS_TRANSFER_ENABLED=true
CBS_API_URL=http://your-cbs-url

# 2. Restart app
npm run start:dev

# 3. Make payment (same as above)

# 4. Check logs - should see:
# "Initiating CBS transfer: Amount: 50000 (Gross: 50000, Commission: 0, Rate: 0%)"
# "CBS transfer successful for payment xxx: TST-0000001-ABC"

# 5. Check database
SELECT * FROM cbs_transfers WHERE reference = 'TST-0000001-ABC';
```

## Log Messages

### CBS Disabled
```
CBS transfer is disabled - skipping
```

### CBS Enabled - Success
```
Initiating CBS transfer: Amount: 50000 (Gross: 50000, Commission: 0, Rate: 0%) from 1-09-001-10-1200-1200108 to 2120050000196
CBS transfer successful for payment abc-123: TST-0000001-ABC
```

### CBS Enabled - No Settings
```
Service provider xyz has no settings configured - skipping CBS transfer
```

### CBS Enabled - No Bank Account
```
Service provider ABC School has no active primary bank account - skipping CBS transfer
```

### CBS Enabled - Transfer Failed
```
CBS transfer failed for payment abc-123: Connection timeout
```

## Migration Path

### Phase 1: Testing (Current)
- ✅ CBS transfer **disabled**
- ✅ Commission rate: **0%**
- Test all payment flows without CBS

### Phase 2: Enable CBS with 0% Commission
- Set `CBS_TRANSFER_ENABLED=true`
- Keep commission at 0%
- Monitor transfer success rates
- Verify amounts are correct

### Phase 3: Enable Commission (Future)
- Update code to use configurable commission
- Set commission rate (e.g., 2.5%)
- Test commission calculations
- Deploy to production

## Troubleshooting

### Issue: Transfers Not Executing

**Check**:
1. Is `CBS_TRANSFER_ENABLED=true`?
   ```bash
   grep CBS_TRANSFER_ENABLED .env
   ```

2. Is CBS API URL configured?
   ```bash
   grep CBS_API_URL .env
   ```

3. Does SP have settings and bank account?
   ```sql
   SELECT sp.business_name,
          CASE WHEN settings.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_settings,
          CASE WHEN ba.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_bank_account
   FROM service_providers sp
   LEFT JOIN service_provider_settings settings ON sp.id = settings.service_provider_id
   LEFT JOIN service_provider_bank_accounts ba ON sp.id = ba.service_provider_id AND ba.is_primary = true AND ba.is_active = true
   WHERE sp.id = 'sp-uuid';
   ```

4. Check application logs
   ```bash
   tail -f server.log | grep CBS
   ```

### Issue: Wrong Transfer Amounts

**Check**:
1. Commission rate in code (currently 0)
2. Payment amount in database
3. CBS transfer amount in `cbs_transfers` table
   ```sql
   SELECT
     p.amount_paid as payment_amount,
     t.amount as transfer_amount,
     (p.amount_paid - t.amount) as commission
   FROM payments p
   LEFT JOIN cbs_transfers t ON p.id = t.payment_id
   WHERE p.reference_number = 'TST-0000001-ABC';
   ```

## Summary

✅ **CBS Transfer**: Configurable (disabled by default)
✅ **Commission Rate**: 0% (hardcoded for now)
✅ **Full Amount Transfer**: Service providers receive 100% of payment
✅ **Safe to Test**: Disabled by default, enable when ready
✅ **Easy to Configure**: Single environment variable toggle

---

**Last Updated**: December 3, 2025
**Commission Rate**: 0%
**Default State**: Disabled
**To Enable**: Set `CBS_TRANSFER_ENABLED=true` in .env
