# Payment API - FSP Code Update

## Overview

The Payment API has been updated to include the **Financial Service Provider Code (fspCode)** in the payment payload. This allows tracking which FSP (Mobile Network Operator or Bank) processed each payment.

---

## Changes Summary

### ✅ What Changed

1. **Payment DTO** - Added `fspCode` as a required field
2. **Payment Entity** - Added `fspCode` column with index
3. **Database Migration** - Created migration to add the column
4. **Payment Service** - Updated to handle and return `fspCode`

---

## API Changes

### Create Payment Endpoint

**Endpoint:** `POST /api/v1/payments`

### Old Payload (Before)
```json
{
  "referenceNumber": "TAN-0000001-B18",
  "payerName": "John Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 50000,
  "currency": "TZS",
  "paymentChannel": "Mobile Money",
  "transactionId": "MP123456789",
  "description": "School fees payment"
}
```

### New Payload (After) ✨
```json
{
  "referenceNumber": "TAN-0000001-B18",
  "payerName": "John Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 50000,
  "currency": "TZS",
  "paymentChannel": "Mobile Money",
  "fspCode": "VODACOM",           // ← NEW REQUIRED FIELD
  "transactionId": "MP123456789",
  "description": "School fees payment"
}
```

---

## FSP Code Values

### Mobile Network Operators (MNOs)

| FSP Name | FSP Code | Description |
|----------|----------|-------------|
| Vodacom (M-Pesa) | `VODACOM` | M-Pesa Mobile Money |
| Tigo (TigoPesa) | `TIGO` | TigoPesa Mobile Money |
| Airtel Money | `AIRTEL` | Airtel Mobile Money |
| Halotel (HaloPesa) | `HALOTEL` | HaloPesa Mobile Money |
| Zantel (EzyPesa) | `ZANTEL` | EzyPesa Mobile Money |

### Banks

| Bank Name | FSP Code | Description |
|-----------|----------|-------------|
| CRDB Bank | `CRDB` | CRDB Bank PLC |
| NMB Bank | `NMB` | National Microfinance Bank |
| NBC Bank | `NBC` | National Bank of Commerce |
| Stanbic Bank | `STANBIC` | Stanbic Bank Tanzania |
| Equity Bank | `EQUITY` | Equity Bank Tanzania |
| DTB Bank | `DTB` | Diamond Trust Bank |
| Standard Chartered | `STANDARD_CHARTERED` | Standard Chartered Bank |
| Exim Bank | `EXIM` | Exim Bank Tanzania |
| TPB Bank | `TPB` | Tanzania Postal Bank |
| AMANA Bank | `AMANA` | Amana Bank |

### Special Cases

| Code | Usage |
|------|-------|
| `BANK` | Generic bank payment (when specific bank unknown) |
| `CASH` | Cash payment at counter |
| `UNKNOWN` | Unknown payment source |

---

## Examples

### Example 1: M-Pesa Payment

```json
{
  "referenceNumber": "TAN-0000001-B18",
  "payerName": "Jane Smith",
  "payerPhone": "+255754123456",
  "amountPaid": 100000,
  "currency": "TZS",
  "paymentChannel": "Mobile Money",
  "fspCode": "VODACOM",
  "transactionId": "MP987654321",
  "description": "Tuition fee payment"
}
```

### Example 2: TigoPesa Payment

```json
{
  "referenceNumber": "MWA-0000050-C4D",
  "payerName": "James Brown",
  "payerPhone": "+255655987654",
  "amountPaid": 75000,
  "currency": "TZS",
  "paymentChannel": "Mobile Money",
  "fspCode": "TIGO",
  "transactionId": "TP456789123",
  "description": "School uniform payment"
}
```

### Example 3: Bank Transfer

```json
{
  "referenceNumber": "DAR-0000100-E2F",
  "payerName": "Sarah Wilson",
  "payerPhone": "+255712345678",
  "amountPaid": 500000,
  "currency": "TZS",
  "paymentChannel": "Bank Transfer",
  "fspCode": "CRDB",
  "transactionId": "BT20250106001",
  "description": "Annual school fees"
}
```

### Example 4: Cash Payment

```json
{
  "referenceNumber": "TAN-0000005-A1B",
  "payerName": "Michael Johnson",
  "payerPhone": "+255787654321",
  "amountPaid": 30000,
  "currency": "TZS",
  "paymentChannel": "Cash",
  "fspCode": "CASH",
  "transactionId": null,
  "description": "Book fee payment"
}
```

---

## Response Structure

### Success Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "referenceNumber": "TAN-0000001-B18",
  "payerName": "John Doe",
  "payerPhone": "+255712345678",
  "amountPaid": "50000.00",
  "status": "SUCCESS",
  "currency": "TZS",
  "paymentChannel": "Mobile Money",
  "fspCode": "VODACOM",           // ← Returned in response
  "paidAt": "2025-01-06T14:30:00.000Z",
  "updatedAt": "2025-01-06T14:30:00.000Z"
}
```

---

## Payment Summary Response

The payment summary endpoint now includes `fspCode`:

**Endpoint:** `GET /api/v1/payments/:referenceNumber/summary`

**Response:**
```json
{
  "referenceNumber": "TAN-0000001-B18",
  "invoiceAmount": "150000.00",
  "totalPaid": "50000.00",
  "remainingAmount": "100000.00",
  "installmentCount": 1,
  "paymentOption": "INSTALLMENT",
  "isFullyPaid": false,
  "status": "ACTIVE",
  "payments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "amountPaid": "50000.00",
      "payerName": "John Doe",
      "paymentChannel": "Mobile Money",
      "fspCode": "VODACOM",        // ← Now included
      "paidAt": "2025-01-06T14:30:00.000Z",
      "status": "SUCCESS"
    }
  ]
}
```

---

## Database Changes

### Migration File
`src/database/migrations/1736182000000-AddFspCodeToPayments.ts`

### SQL Changes

```sql
-- Add fspCode column
ALTER TABLE "payments"
ADD COLUMN "fspCode" VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN';

-- Create index for faster queries
CREATE INDEX "IDX_payments_fspCode" ON "payments" ("fspCode");

-- Update existing records (attempt to guess from payment channel)
UPDATE "payments"
SET "fspCode" = CASE
  WHEN "paymentChannel" ILIKE '%vodacom%' OR "paymentChannel" ILIKE '%mpesa%' THEN 'VODACOM'
  WHEN "paymentChannel" ILIKE '%tigo%' THEN 'TIGO'
  WHEN "paymentChannel" ILIKE '%airtel%' THEN 'AIRTEL'
  WHEN "paymentChannel" ILIKE '%halopesa%' THEN 'HALOTEL'
  WHEN "paymentChannel" ILIKE '%bank%' THEN 'BANK'
  ELSE 'UNKNOWN'
END
WHERE "fspCode" = 'UNKNOWN';
```

---

## Frontend Integration

### TypeScript Interface

```typescript
interface CreatePaymentDto {
  referenceNumber: string;
  payerName: string;
  payerPhone: string;
  amountPaid: number;
  currency?: string;
  paymentChannel: string;
  fspCode: string;              // ← Add this
  transactionId?: string;
  description?: string;
}

interface Payment {
  id: string;
  referenceNumber: string;
  payerName: string;
  payerPhone: string;
  amountPaid: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REVERSED';
  currency: string;
  paymentChannel: string;
  fspCode: string;              // ← Add this
  paidAt: Date;
  updatedAt: Date;
}
```

### React Example - Payment Form

```tsx
import { useState } from 'react';
import axios from 'axios';

function PaymentForm() {
  const [formData, setFormData] = useState({
    referenceNumber: '',
    payerName: '',
    payerPhone: '',
    amountPaid: 0,
    paymentChannel: 'Mobile Money',
    fspCode: 'VODACOM',         // ← New field
    transactionId: '',
  });

  const fspOptions = [
    { value: 'VODACOM', label: 'Vodacom (M-Pesa)' },
    { value: 'TIGO', label: 'Tigo (TigoPesa)' },
    { value: 'AIRTEL', label: 'Airtel Money' },
    { value: 'HALOTEL', label: 'HaloPesa' },
    { value: 'CRDB', label: 'CRDB Bank' },
    { value: 'NMB', label: 'NMB Bank' },
    { value: 'NBC', label: 'NBC Bank' },
    { value: 'CASH', label: 'Cash Payment' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.post('/api/v1/payments', formData);
      console.log('Payment successful:', response.data);
      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Reference Number"
        value={formData.referenceNumber}
        onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Payer Name"
        value={formData.payerName}
        onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
        required
      />

      <input
        type="tel"
        placeholder="Phone Number"
        value={formData.payerPhone}
        onChange={(e) => setFormData({ ...formData, payerPhone: e.target.value })}
        required
      />

      <input
        type="number"
        placeholder="Amount"
        value={formData.amountPaid}
        onChange={(e) => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
        required
      />

      {/* FSP Code Dropdown */}
      <select
        value={formData.fspCode}
        onChange={(e) => setFormData({ ...formData, fspCode: e.target.value })}
        required
      >
        <option value="">Select Payment Provider</option>
        {fspOptions.map((fsp) => (
          <option key={fsp.value} value={fsp.value}>
            {fsp.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Transaction ID (optional)"
        value={formData.transactionId}
        onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
      />

      <button type="submit">Submit Payment</button>
    </form>
  );
}
```

---

## Analytics & Reporting

With `fspCode`, you can now:

### 1. Track Payments by FSP

```sql
SELECT
  "fspCode",
  COUNT(*) as payment_count,
  SUM("amountPaid") as total_amount
FROM payments
WHERE "status" = 'SUCCESS'
GROUP BY "fspCode"
ORDER BY total_amount DESC;
```

### 2. FSP Performance Analysis

```sql
SELECT
  "fspCode",
  "paymentChannel",
  COUNT(*) as transactions,
  AVG("amountPaid") as avg_amount,
  MIN("amountPaid") as min_amount,
  MAX("amountPaid") as max_amount
FROM payments
WHERE "paidAt" >= NOW() - INTERVAL '30 days'
GROUP BY "fspCode", "paymentChannel";
```

### 3. Daily FSP Revenue

```sql
SELECT
  DATE("paidAt") as payment_date,
  "fspCode",
  COUNT(*) as transactions,
  SUM("amountPaid") as daily_revenue
FROM payments
WHERE "status" = 'SUCCESS'
GROUP BY DATE("paidAt"), "fspCode"
ORDER BY payment_date DESC, daily_revenue DESC;
```

---

## Migration Steps

### 1. Run the Migration

```bash
npm run migration:run
```

This will:
- Add the `fspCode` column to the `payments` table
- Create an index on `fspCode`
- Update existing payments with best-guess FSP codes

### 2. Update Frontend

Update your payment forms to include the FSP code dropdown.

### 3. Update API Clients

Update any external systems that post payments to include `fspCode`.

---

## Validation Rules

| Field | Type | Required | Max Length | Validation |
|-------|------|----------|------------|------------|
| `fspCode` | string | ✅ Yes | 50 chars | Must not be empty |

---

## Error Responses

### Missing fspCode

```json
{
  "statusCode": 400,
  "message": [
    "fspCode should not be empty",
    "fspCode must be a string",
    "fspCode must be shorter than or equal to 50 characters"
  ],
  "error": "Bad Request"
}
```

---

## Testing

### Test Case 1: Valid Payment with FSP Code

```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "referenceNumber": "TAN-0000001-B18",
    "payerName": "Test User",
    "payerPhone": "+255712345678",
    "amountPaid": 10000,
    "paymentChannel": "Mobile Money",
    "fspCode": "VODACOM",
    "transactionId": "TEST123"
  }'
```

### Test Case 2: Missing FSP Code (Should Fail)

```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "referenceNumber": "TAN-0000001-B18",
    "payerName": "Test User",
    "payerPhone": "+255712345678",
    "amountPaid": 10000,
    "paymentChannel": "Mobile Money"
  }'
```

---

## Backward Compatibility

### For Existing Payments

Existing payments in the database will be updated with a best-guess `fspCode` based on their `paymentChannel` value during migration.

### For API Clients

⚠️ **Breaking Change**: All API clients must now include `fspCode` in payment requests.

---

## Support

For questions or issues:
- Check the migration file: `src/database/migrations/1736182000000-AddFspCodeToPayments.ts`
- Check the DTO: `src/modules/payment/dto/payment.dto.ts`
- Check the entity: `src/modules/payment/entities/payment.entity.ts`

---

## Rollback

To rollback this change:

```bash
npm run migration:revert
```

This will:
- Remove the `fspCode` column
- Drop the index
- Revert to the previous schema
