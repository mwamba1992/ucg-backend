# CBS Integration Guide - Fund Transfer on Payment

## Overview

The UCG backend now automatically triggers CBS (Core Banking System) fund transfers when payments are received. This ensures that service providers receive their funds (minus commission) immediately after a customer makes a payment.

## Architecture

```
Customer Payment → UCG Payment Processing → CBS Transfer → Service Provider Account
                        ↓
                  Commission Deduction
```

## Payment Flow with CBS Integration

### 1. Payment Received
```
POST /api/v1/payments
{
  "referenceNumber": "TST-0000001-A1B",
  "amountPaid": 50000,
  "payerName": "John Doe",
  "payerPhone": "0759123081",
  "paymentChannel": "M-PESA"
}
```

### 2. Automatic CBS Transfer
After payment is validated and saved:
1. **Calculate Commission**: `commission = amount × commissionRate`
2. **Calculate Net Amount**: `netAmount = amount - commission`
3. **Execute CBS Transfer**:
   ```json
   {
     "reference": "TST-0000001-A1B",
     "creditAccount": "2120050000196",    // SP's bank account
     "debitAccount": "1-09-001-10-1200-1200108",  // UCG GL account
     "currency": "TZS",
     "amount": 48750,  // Net amount after commission
     "description": "Payment settlement for TST-0000001-A1B - ABC School",
     "type": "GL_TO_DEPOSIT"
   }
   ```

### 3. CBS Response
```json
{
  "statusDescription": "Transfer was successful",
  "statusCode": "6200",
  "response": {
    "message": "Success",
    "amount": 48750,
    "reference": "TST-0000001-A1B"
  }
}
```

## Database Schema

### CBS Transfer Entity

```sql
CREATE TABLE cbs_transfers (
    id UUID PRIMARY KEY,
    payment_id UUID REFERENCES payments(id),
    reference VARCHAR(50),
    credit_account VARCHAR(50),
    debit_account VARCHAR(50),
    currency VARCHAR(10),
    amount DECIMAL(15,2),
    description TEXT,
    type VARCHAR(50), -- GL_TO_DEPOSIT, DEPOSIT_TO_GL, etc.
    status VARCHAR(20), -- PENDING, SUCCESS, FAILED, REVERSED
    cbs_response_code TEXT,
    cbs_response_message TEXT,
    cbs_response JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_cbs_transfers_reference ON cbs_transfers(reference);
CREATE INDEX idx_cbs_transfers_payment_id ON cbs_transfers(payment_id);
CREATE INDEX idx_cbs_transfers_status ON cbs_transfers(status);
```

## Configuration

### Environment Variables

Add to `.env`:

```env
# CBS (Core Banking System) Configuration
CBS_API_URL=http://your-cbs-api-url
UCG_GL_ACCOUNT=1-09-001-10-1200-1200108
```

### Service Provider Settings

Each service provider must have:
1. **Commission Rate**: Set in `service_provider_settings.commissionRate`
2. **Primary Bank Account**: Set in `service_provider_bank_accounts` with `isPrimary = true`

## CBS Module Structure

```
src/modules/cbs/
├── dto/
│   └── transfer.dto.ts           # Transfer DTOs
├── entities/
│   └── cbs-transfer.entity.ts    # Transfer entity
├── cbs.service.ts                # CBS integration service
└── cbs.module.ts                 # Module definition
```

## Key Features

### 1. Automatic Settlement
- Transfers are executed **immediately** after payment processing
- **Non-blocking**: Failed transfers don't fail the payment
- Transfers are logged and can be retried

### 2. Commission Calculation
```typescript
// Example: 2.5% commission on 50,000 TZS
grossAmount = 50,000
commissionRate = 2.5
commission = 50,000 × 2.5 / 100 = 1,250
netAmount = 50,000 - 1,250 = 48,750
```

### 3. Transfer Tracking
Every transfer is recorded in the `cbs_transfers` table:
- Linked to payment via `payment_id`
- Full CBS response stored
- Status tracking (PENDING → SUCCESS/FAILED)
- Retry capability

### 4. Error Handling
- Failed transfers are logged but don't fail the payment
- Transfer records show error messages
- Transfers can be retried using `retryTransfer()` method

## API Usage

### CBSService Methods

#### 1. Execute Transfer
```typescript
const result = await cbsService.executeTransfer({
  reference: 'TST-0000001-A1B',
  creditAccount: '2120050000196',
  debitAccount: '1-09-001-10-1200-1200108',
  currency: 'TZS',
  amount: 48750,
  description: 'Payment settlement',
  type: TransferType.GL_TO_DEPOSIT,
}, paymentId);

if (result.success) {
  console.log(`Transfer successful: ${result.cbsReference}`);
} else {
  console.error(`Transfer failed: ${result.error}`);
}
```

#### 2. Retry Failed Transfer
```typescript
const result = await cbsService.retryTransfer(transferId);
```

#### 3. Get Transfer by Payment
```typescript
const transfers = await cbsService.getTransfersByPayment(paymentId);
```

#### 4. Get Failed Transfers
```typescript
const failedTransfers = await cbsService.getFailedTransfers(100);
// Retry failed transfers
for (const transfer of failedTransfers) {
  await cbsService.retryTransfer(transfer.id);
}
```

## Transfer Types

```typescript
enum TransferType {
  GL_TO_DEPOSIT = 'GL_TO_DEPOSIT',       // UCG GL → SP Deposit
  DEPOSIT_TO_GL = 'DEPOSIT_TO_GL',       // SP Deposit → UCG GL (refunds)
  GL_TO_GL = 'GL_TO_GL',                 // GL → GL (internal)
  DEPOSIT_TO_DEPOSIT = 'DEPOSIT_TO_DEPOSIT', // Deposit → Deposit
}
```

## Example Scenarios

### Scenario 1: Standard Payment

**Payment**: 100,000 TZS
**Commission Rate**: 2.5%
**Commission**: 2,500 TZS
**Net to SP**: 97,500 TZS

**CBS Transfer**:
```json
{
  "reference": "ABC-0000123-XYZ",
  "creditAccount": "2120050000196",
  "debitAccount": "1-09-001-10-1200-1200108",
  "amount": 97500,
  "type": "GL_TO_DEPOSIT"
}
```

### Scenario 2: Partial Payment

**Payment 1**: 50,000 TZS (of 100,000)
**Commission**: 1,250 TZS
**Transfer**: 48,750 TZS

**Payment 2**: 50,000 TZS (remaining)
**Commission**: 1,250 TZS
**Transfer**: 48,750 TZS

Total to SP: 97,500 TZS

### Scenario 3: Failed Transfer

If CBS transfer fails:
1. Payment is still recorded as SUCCESS
2. Transfer is recorded as FAILED
3. Error message is logged
4. Transfer can be retried later

## Monitoring & Maintenance

### 1. Check Transfer Status

```sql
-- Get all failed transfers
SELECT * FROM cbs_transfers
WHERE status = 'FAILED'
ORDER BY created_at DESC;

-- Get transfers for a payment
SELECT * FROM cbs_transfers
WHERE payment_id = 'payment-uuid';

-- Get transfer statistics
SELECT
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM cbs_transfers
GROUP BY status;
```

### 2. Retry Failed Transfers

```typescript
// Scheduled job to retry failed transfers
@Cron('0 */30 * * * *') // Every 30 minutes
async retryFailedTransfers() {
  const failed = await this.cbsService.getFailedTransfers(50);

  for (const transfer of failed) {
    if (transfer.retryCount < 3) { // Max 3 retries
      await this.cbsService.retryTransfer(transfer.id);
    }
  }
}
```

### 3. Monitor Transfer Success Rate

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM cbs_transfers
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Testing

### 1. Test with Mock CBS

Create a mock CBS endpoint for testing:

```javascript
// mock-cbs-server.js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/G2D', (req, res) => {
  console.log('CBS Transfer Request:', req.body);

  // Simulate successful transfer
  res.json({
    statusCode: '6200',
    statusDescription: 'Transfer was successful',
    response: {
      message: 'Success',
      amount: req.body.amount,
      reference: req.body.reference
    }
  });
});

app.listen(3002, () => {
  console.log('Mock CBS server running on port 3002');
});
```

Update `.env`:
```
CBS_API_URL=http://localhost:3002
```

### 2. Test Payment with Transfer

```bash
# 1. Create a service provider with commission rate
POST /api/v1/service-providers
{
  "businessName": "Test School",
  "settings": {
    "commissionRate": 2.5
  },
  "bankAccounts": [{
    "accountNumber": "2120050000196",
    "isPrimary": true
  }]
}

# 2. Create payment reference
POST /api/v1/references
{
  "serviceProviderId": "sp-uuid",
  "customerName": "John Doe",
  "amount": 50000
}

# 3. Process payment (triggers CBS transfer)
POST /api/v1/payments
{
  "referenceNumber": "TST-0000001-A1B",
  "amountPaid": 50000,
  "payerName": "John Doe",
  "payerPhone": "0759123081"
}

# 4. Check CBS transfer
SELECT * FROM cbs_transfers WHERE payment_id = 'payment-uuid';
```

## Troubleshooting

### Issue: Transfer Not Executing

**Check**:
1. Is `CBS_API_URL` configured?
2. Does SP have primary bank account?
3. Does SP have settings with commission rate?
4. Check application logs for errors

```bash
tail -f server.log | grep CBS
```

### Issue: Transfer Failing

**Check**:
1. CBS API is reachable
2. Account numbers are valid
3. Sufficient funds in UCG GL account
4. Check `cbs_transfers.error_message`

```sql
SELECT error_message, cbs_response_message
FROM cbs_transfers
WHERE status = 'FAILED'
ORDER BY created_at DESC
LIMIT 10;
```

### Issue: Incorrect Amounts

**Check**:
1. Commission rate in SP settings
2. Calculation logs in application
3. CBS transfer amount vs payment amount

```sql
SELECT
  p.amount_paid,
  t.amount as transfer_amount,
  (p.amount_paid - t.amount) as commission
FROM payments p
JOIN cbs_transfers t ON p.id = t.payment_id
WHERE p.id = 'payment-uuid';
```

## Best Practices

1. **Always set commission rate** for service providers
2. **Monitor failed transfers** and retry regularly
3. **Log all CBS responses** for audit trail
4. **Set alerts** for high failure rates (> 5%)
5. **Reconcile daily** - compare payments vs transfers
6. **Test thoroughly** before production deployment

## Future Enhancements

1. **Batch Transfers**: Group multiple payments for settlement
2. **Scheduled Settlements**: Transfer at specific times instead of immediately
3. **Reversal Support**: Automatic reversal for failed payments
4. **Multi-Currency**: Support for USD, EUR, etc.
5. **Settlement Reports**: Generate daily/monthly settlement reports
6. **Webhook Notifications**: Notify SPs when funds are transferred

---

**Last Updated**: December 3, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
