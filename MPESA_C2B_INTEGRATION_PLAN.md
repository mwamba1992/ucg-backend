# M-Pesa C2B Integration with CBS Transfer

## Overview

This integration enables customers to pay via M-Pesa and automatically settle funds to service provider accounts via CBS.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     M-PESA C2B INTEGRATION                       │
└─────────────────────────────────────────────────────────────────┘

1. Customer pays M-Pesa (Pay Bill to 400205)
   - Account Reference: MW1-0000123-789 (UCG payment reference)

2. M-Pesa → UCG API (XML Notification)
   POST /api/v1/mpesa/c2b/payment

3. UCG API → M-Pesa (Immediate Response)
   - responseCode: 0
   - responseDesc: "Received"
   - serviceStatus: "Success"

4. UCG Processing:
   a) Validate reference exists
   b) Check duplicate (mpesaReceipt)
   c) Validate amount matches
   d) Create Payment record
   e) Trigger CBS Transfer (GL_TO_DEPOSIT)

5. CBS Transfer:
   - Debit: UCG GL Account
   - Credit: Service Provider Deposit Account
   - Amount: Payment - Commission

6. UCG → M-Pesa (Callback)
   POST to M-Pesa callback URL
   - resultCode: 0 (success) or 999 (failure)
   - resultType: "Completed" or "Failed"

7. M-Pesa → UCG (Callback Acknowledgment)
   - serviceStatus: "Confirming" or "Cancelling"
```

## Database Schema

### 1. M-Pesa Transactions Table

```sql
CREATE TABLE mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- M-Pesa Fields
  mpesa_receipt VARCHAR(20) UNIQUE NOT NULL,  -- e.g., 5BL716QNJBB
  conversation_id VARCHAR(100) NOT NULL,
  originator_conversation_id VARCHAR(100),
  transaction_id VARCHAR(50),

  -- Payment Details
  payment_id UUID REFERENCES payments(id),
  reference_number VARCHAR(20) NOT NULL,      -- UCG reference
  amount DECIMAL(15,2) NOT NULL,
  customer_phone VARCHAR(15) NOT NULL,        -- initiator
  customer_name VARCHAR(200),

  -- Status
  status VARCHAR(20) NOT NULL,  -- RECEIVED, PROCESSING, COMPLETED, FAILED
  result_code VARCHAR(10),      -- 0 for success, 999 for failure
  result_description TEXT,

  -- M-Pesa Metadata
  command_id VARCHAR(50),       -- "Pay Bill"
  transaction_date TIMESTAMP,

  -- CBS Integration
  cbs_transfer_id UUID REFERENCES cbs_transfers(id),
  cbs_status VARCHAR(20),       -- PENDING, SUCCESS, FAILED

  -- Callbacks
  callback_sent BOOLEAN DEFAULT FALSE,
  callback_sent_at TIMESTAMP,
  callback_response JSONB,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,

  -- Indexes
  INDEX idx_mpesa_receipt (mpesa_receipt),
  INDEX idx_reference_number (reference_number),
  INDEX idx_status (status),
  INDEX idx_transaction_date (transaction_date)
);
```

### 2. M-Pesa Configuration Table

```sql
CREATE TABLE mpesa_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sp_id VARCHAR(20) NOT NULL,           -- Business number (400205)
  sp_password VARCHAR(100) NOT NULL,    -- Plain password for encryption
  initiator VARCHAR(50),
  initiator_password VARCHAR(100),
  callback_url TEXT,                    -- M-Pesa callback URL
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Components

### 1. M-Pesa Module Structure

```
src/modules/mpesa/
├── mpesa.module.ts
├── mpesa.controller.ts
├── mpesa.service.ts
├── entities/
│   ├── mpesa-transaction.entity.ts
│   └── mpesa-config.entity.ts
├── dto/
│   ├── mpesa-c2b-notification.dto.ts
│   ├── mpesa-callback.dto.ts
│   └── mpesa-response.dto.ts
├── utils/
│   └── mpesa-encryption.util.ts
└── interfaces/
    └── mpesa-notification.interface.ts
```

### 2. Key Features

#### Password Encryption (SHA-256 + Base64)
```typescript
// utils/mpesa-encryption.util.ts
import * as crypto from 'crypto';

export class MpesaEncryption {
  static encryptPassword(spId: string, password: string, timestamp: string): string {
    const combined = `${spId}${password}${timestamp}`;
    const hash = crypto.createHash('sha256').update(combined).digest();
    return Buffer.from(hash).toString('base64');
  }

  static generateTimestamp(): string {
    const now = new Date();
    return now.toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14); // YYYYMMDDHHmmss
  }
}
```

#### Duplicate Detection
```typescript
async checkDuplicate(mpesaReceipt: string): Promise<boolean> {
  const existing = await this.mpesaTransactionRepo.findOne({
    where: { mpesaReceipt }
  });

  return !!existing;
}
```

#### Reference Validation
```typescript
async validateReference(referenceNumber: string, amount: number): Promise<{
  valid: boolean;
  reference?: PaymentReference;
  reason?: string;
}> {
  const reference = await this.referenceService.findByReferenceNumber(referenceNumber);

  if (!reference) {
    return { valid: false, reason: 'Invalid reference number' };
  }

  if (reference.status === 'EXPIRED') {
    return { valid: false, reason: 'Reference expired' };
  }

  if (reference.status === 'USED') {
    return { valid: false, reason: 'Reference already used' };
  }

  if (Number(reference.totalAmount) !== Number(amount)) {
    return {
      valid: false,
      reason: `Amount mismatch. Expected: ${reference.totalAmount}, Got: ${amount}`
    };
  }

  return { valid: true, reference };
}
```

## Integration Points

### 1. Payment Service Integration

```typescript
// In PaymentService, add M-Pesa payment method

async createMpesaPayment(
  mpesaTransaction: MpesaTransaction,
  reference: PaymentReference
): Promise<Payment> {
  const payment = this.paymentRepo.create({
    referenceNumber: reference.referenceNumber,
    payerName: mpesaTransaction.customerName || 'M-Pesa Customer',
    payerPhone: mpesaTransaction.customerPhone,
    amountPaid: mpesaTransaction.amount,
    status: PaymentStatus.PENDING,
    currency: 'TZS',
    paymentChannel: 'M-PESA',
  });

  return await this.paymentRepo.save(payment);
}
```

### 2. CBS Transfer Integration

```typescript
// In MpesaService, trigger CBS transfer after payment

async processMpesaPayment(mpesaTransaction: MpesaTransaction) {
  try {
    // 1. Create payment
    const payment = await this.paymentService.createMpesaPayment(
      mpesaTransaction,
      reference
    );

    // 2. Get SP settings for commission
    const spSettings = await this.serviceProviderService.getSettings(
      reference.serviceProviderId
    );

    // 3. Build CBS transfer
    const transferDto = this.cbsService.buildSettlementTransfer(
      reference.referenceNumber,
      spSettings.depositAccount,      // Credit: SP deposit
      this.configService.get('UCG_GL_ACCOUNT'),  // Debit: UCG GL
      payment.amountPaid,
      spSettings.commissionRate,
      'TZS'
    );

    // 4. Execute CBS transfer
    const transferResult = await this.cbsService.executeTransfer(
      transferDto,
      payment.id
    );

    // 5. Update records
    if (transferResult.success) {
      payment.status = PaymentStatus.SUCCESS;
      mpesaTransaction.status = 'COMPLETED';
      mpesaTransaction.cbsTransferId = transferResult.transferId;
      mpesaTransaction.cbsStatus = 'SUCCESS';
    } else {
      payment.status = PaymentStatus.FAILED;
      mpesaTransaction.status = 'FAILED';
      mpesaTransaction.resultDescription = transferResult.error;
    }

    await this.paymentRepo.save(payment);
    await this.mpesaTransactionRepo.save(mpesaTransaction);

    return {
      success: transferResult.success,
      payment,
      transfer: transferResult
    };

  } catch (error) {
    this.logger.error('M-Pesa payment processing failed', error);
    throw error;
  }
}
```

## API Endpoints

### 1. Webhook Endpoint (Public - M-Pesa calls this)

```typescript
POST /api/v1/mpesa/c2b/payment
Content-Type: application/xml

// Receives M-Pesa notification
// Returns immediate sync response
```

### 2. Callback Endpoint (Internal - We call M-Pesa)

```typescript
// Internal method to send callback to M-Pesa
async sendCallbackToMpesa(
  mpesaTransaction: MpesaTransaction,
  success: boolean
)
```

### 3. Management Endpoints (Protected)

```typescript
GET /api/v1/mpesa/transactions           // List all M-Pesa transactions
GET /api/v1/mpesa/transactions/:id       // Get transaction details
POST /api/v1/mpesa/transactions/:id/retry  // Retry failed transaction
GET /api/v1/mpesa/config                 // Get M-Pesa configuration
PUT /api/v1/mpesa/config                 // Update M-Pesa configuration
```

## Error Handling

### Common Failure Scenarios

1. **Invalid Reference**
   - Result Code: 999
   - Result Desc: "Invalid reference number"

2. **Amount Mismatch**
   - Result Code: 999
   - Result Desc: "Amount mismatch. Expected: X, Got: Y"

3. **Duplicate Transaction**
   - Return existing transaction status
   - Don't create new payment

4. **CBS Transfer Failed**
   - Result Code: 999
   - Result Desc: "CBS transfer failed: {error}"
   - Mark for retry

5. **Reference Already Used**
   - Result Code: 999
   - Result Desc: "Reference already paid"

## Testing Strategy

### 1. Unit Tests
- Password encryption
- Duplicate detection
- Amount validation
- Reference validation

### 2. Integration Tests
- XML parsing
- Payment creation
- CBS transfer
- Callback sending

### 3. E2E Tests
- Full flow from M-Pesa notification to CBS settlement
- Duplicate handling
- Error scenarios

## Configuration

### Environment Variables

```bash
# M-Pesa Configuration
MPESA_SP_ID=400205
MPESA_SP_PASSWORD=your-plain-password
MPESA_INITIATOR=ibm_in
MPESA_INITIATOR_PASSWORD=initiator-password
MPESA_CALLBACK_URL=http://mpesa-callback-url
MPESA_WEBHOOK_URL=http://your-api/api/v1/mpesa/c2b/payment

# CBS Configuration
UCG_GL_ACCOUNT=1000000001  # UCG main GL account
```

## Security Considerations

1. **Webhook Authentication**
   - Verify spId and spPassword in incoming requests
   - Validate timestamp (reject old requests)

2. **IP Whitelisting**
   - Only accept requests from M-Pesa IPs

3. **Duplicate Prevention**
   - Always check mpesaReceipt before processing

4. **Idempotency**
   - Safe to receive same notification multiple times

## Monitoring & Alerts

1. **Failed Transactions**
   - Alert when transaction fails
   - Retry mechanism for CBS transfers

2. **Callback Failures**
   - Log when callback to M-Pesa fails
   - Retry callback sending

3. **Amount Mismatches**
   - Alert when customer pays wrong amount

4. **Performance Metrics**
   - Track processing time
   - Monitor CBS transfer success rate

## Next Steps

1. Create M-Pesa module structure
2. Implement entities and DTOs
3. Build webhook controller
4. Implement service logic
5. Integrate with CBS service
6. Add callback mechanism
7. Create admin endpoints
8. Write tests
9. Deploy to staging
10. Test with M-Pesa sandbox

---

**Status:** Planning Complete
**Ready for Implementation:** Yes
**Estimated Time:** 2-3 days
