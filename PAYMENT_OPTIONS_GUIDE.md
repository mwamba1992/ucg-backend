# Payment Options Implementation Guide

## Overview

Payment Options define how Payment Facilitators should receive funds and complete invoice settlement processes. Upon invoice validation, the i-RCS invoice response includes a `<paymentoption>` field with one of five possible values that control payment behavior.

This implementation provides complete validation logic for all payment options, automatic installment tracking, and payment enforcement.

## Payment Options

### 1. COMPLETE

**Description**: Requires a single installment greater than or equal to the invoice amount.

**Rules**:
- Only ONE payment allowed
- Payment amount must be >= invoice amount
- Overpayment is allowed

**Use Cases**:
- School fees where parent can pay for full year plus extras
- Government services where overpayment is refunded later

**Example**:
```json
{
  "referenceNumber": "SCH-0000001-ABC",
  "amount": 500000,
  "paymentOption": "COMPLETE"
}
```

**Valid Payments**:
- ✅ 500,000 TZS (exact amount)
- ✅ 600,000 TZS (overpayment allowed)

**Invalid Payments**:
- ❌ 400,000 TZS (less than invoice)
- ❌ Second payment of any amount (only one payment allowed)

---

### 2. PARTIAL

**Description**: Allows a single payment >= invoice amount OR multiple installments with the last payment >= remaining amount.

**Rules**:
- FIRST payment: Any amount accepted
- SUBSEQUENT payments: Must be >= remaining amount (final payment)
- Multiple installments allowed
- Last payment closes the invoice

**Use Cases**:
- School fees where parents pay term-by-term
- Utility bills with installment plans

**Example**:
```json
{
  "referenceNumber": "SCH-0000002-DEF",
  "amount": 900000,
  "paymentOption": "PARTIAL"
}
```

**Valid Payment Sequences**:

**Scenario A - Full Payment**:
1. ✅ 900,000 TZS → Invoice closed

**Scenario B - Two Installments**:
1. ✅ 300,000 TZS → Remaining: 600,000
2. ✅ 600,000 TZS → Invoice closed

**Scenario C - Three Installments**:
1. ✅ 200,000 TZS → Remaining: 700,000
2. ✅ 300,000 TZS → Remaining: 400,000
3. ✅ 500,000 TZS → Invoice closed (last payment >= remaining)

**Invalid Sequences**:
1. ✅ 300,000 TZS → Remaining: 600,000
2. ❌ 200,000 TZS (final payment must be >= 600,000)

---

### 3. PRECISE

**Description**: Requires a single payment exactly equal to the invoice amount.

**Rules**:
- Only ONE payment allowed
- Payment must EXACTLY match invoice amount
- No overpayment or underpayment

**Use Cases**:
- License fees with exact government rates
- Fixed service charges
- Exam fees

**Example**:
```json
{
  "referenceNumber": "LIC-0000003-GHI",
  "amount": 250000,
  "paymentOption": "PRECISE"
}
```

**Valid Payment**:
- ✅ 250,000 TZS (exactly)

**Invalid Payments**:
- ❌ 249,999 TZS (underpayment)
- ❌ 250,001 TZS (overpayment)
- ❌ Second payment of any amount (only one allowed)

---

### 4. LIMITED

**Description**: Combines PARTIAL and PRECISE. Single payment must equal invoice amount OR multiple installments with last payment exactly equal to remaining amount.

**Rules**:
- FIRST payment: Any amount <= invoice amount
- SUBSEQUENT payments: Any amount <= remaining
- FINAL payment: Must EXACTLY equal remaining amount
- No overpayment allowed at any stage

**Use Cases**:
- Government taxes with strict payment rules
- Court fines
- Regulatory fees

**Example**:
```json
{
  "referenceNumber": "TAX-0000004-JKL",
  "amount": 1200000,
  "paymentOption": "LIMITED"
}
```

**Valid Payment Sequences**:

**Scenario A - Full Payment**:
1. ✅ 1,200,000 TZS (exactly) → Invoice closed

**Scenario B - Two Installments**:
1. ✅ 500,000 TZS → Remaining: 700,000
2. ✅ 700,000 TZS (exactly) → Invoice closed

**Scenario C - Three Installments**:
1. ✅ 300,000 TZS → Remaining: 900,000
2. ✅ 400,000 TZS → Remaining: 500,000
3. ✅ 500,000 TZS (exactly) → Invoice closed

**Invalid Sequences**:

**Overpayment on first**:
1. ❌ 1,300,000 TZS (exceeds invoice)

**Underpayment on last**:
1. ✅ 700,000 TZS → Remaining: 500,000
2. ❌ 400,000 TZS (must be exactly 500,000)

**Overpayment on last**:
1. ✅ 700,000 TZS → Remaining: 500,000
2. ❌ 600,000 TZS (must be exactly 500,000)

---

### 5. PERPETUAL

**Description**: Accepts any number of installments with any amount.

**Rules**:
- NO restrictions on payment amounts
- NO restrictions on number of installments
- Payments accumulate until invoice is satisfied

**Use Cases**:
- Donations
- Flexible payment plans
- Long-term debt repayment

**Example**:
```json
{
  "referenceNumber": "DON-0000005-MNO",
  "amount": 5000000,
  "paymentOption": "PERPETUAL"
}
```

**Valid Payment Sequences** (all amounts accepted):
1. ✅ 100,000 TZS
2. ✅ 50,000 TZS
3. ✅ 200,000 TZS
4. ✅ 150,000 TZS
5. ... (any number of payments)
6. ✅ Final payment to complete

---

## API Usage

### 1. Create Reference with Payment Option

```http
POST /api/references
Content-Type: application/json

{
  "serviceProviderId": "uuid-here",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 500000,
  "description": "School fees Term 1 2025",
  "paymentOption": "PARTIAL",
  "currency": "TZS",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response**:
```json
{
  "id": "ref-uuid",
  "referenceNumber": "SCH-0000123-A7F",
  "amount": 500000,
  "paymentOption": "PARTIAL",
  "totalPaid": 0,
  "remainingAmount": 500000,
  "installmentCount": 0,
  "isFullyPaid": false,
  "status": "ACTIVE",
  "isValid": true,
  "createdAt": "2025-11-10T10:00:00Z"
}
```

### 2. Make Payment (Automatically Validated)

```http
POST /api/payments
Content-Type: application/json

{
  "referenceNumber": "SCH-0000123-A7F",
  "payerName": "John Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 200000,
  "paymentChannel": "M-Pesa"
}
```

**Success Response**:
```json
{
  "id": "payment-uuid",
  "referenceNumber": "SCH-0000123-A7F",
  "amountPaid": 200000,
  "status": "SUCCESS",
  "paidAt": "2025-11-10T11:00:00Z"
}
```

**Error Response** (if validation fails):
```json
{
  "statusCode": 400,
  "message": "Payment not allowed: PRECISE option requires payment exactly = 500000",
  "error": "Bad Request"
}
```

### 3. Get Payment Summary

```http
GET /api/payments/SCH-0000123-A7F/summary
```

**Response**:
```json
{
  "referenceNumber": "SCH-0000123-A7F",
  "invoiceAmount": 500000,
  "totalPaid": 200000,
  "remainingAmount": 300000,
  "installmentCount": 1,
  "paymentOption": "PARTIAL",
  "isFullyPaid": false,
  "status": "ACTIVE",
  "payments": [
    {
      "id": "payment-uuid-1",
      "amountPaid": 200000,
      "payerName": "John Doe",
      "paymentChannel": "M-Pesa",
      "paidAt": "2025-11-10T11:00:00Z",
      "status": "SUCCESS"
    }
  ]
}
```

### 4. Validate Reference

```http
GET /api/references/validate/SCH-0000123-A7F
```

**Response**:
```json
{
  "isValid": true,
  "referenceNumber": "SCH-0000123-A7F",
  "status": "ACTIVE",
  "amount": 500000,
  "paymentOption": "PARTIAL",
  "totalPaid": 200000,
  "remainingAmount": 300000,
  "installmentCount": 1,
  "isFullyPaid": false,
  "expiresAt": "2025-12-31T23:59:59Z",
  "daysUntilExpiry": 51,
  "reason": "Valid reference"
}
```

---

## Implementation Details

### Database Schema Changes

New fields added to `payment_references` table:

```sql
ALTER TABLE payment_references
ADD COLUMN payment_option VARCHAR(20) DEFAULT 'COMPLETE' CHECK (payment_option IN ('COMPLETE', 'PARTIAL', 'PRECISE', 'LIMITED', 'PERPETUAL')),
ADD COLUMN total_paid DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN installment_count INTEGER DEFAULT 0;
```

### Entity Methods

#### PaymentReference.canAcceptPayment()

Validates if a payment amount is acceptable according to the payment option:

```typescript
const reference = await referenceService.findByReferenceNumber('SCH-0000123-A7F');

const validation = reference.canAcceptPayment(200000);

if (!validation.allowed) {
  throw new BadRequestException(validation.reason);
}
```

**Returns**:
```typescript
{
  allowed: boolean;
  reason?: string;
}
```

#### PaymentReference.isFullyPaid()

Checks if the reference has been fully paid:

```typescript
if (reference.isFullyPaid()) {
  console.log('Invoice complete!');
}
```

#### PaymentReference.getRemainingAmount()

Gets the remaining amount to be paid:

```typescript
const remaining = reference.getRemainingAmount();
console.log(`Remaining: ${remaining} TZS`);
```

---

## Validation Logic Flow

```
┌─────────────────────┐
│  Payment Request    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Find Reference     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Check if Valid     │
│  - Not expired      │
│  - Not cancelled    │
│  - Not fully paid   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Validate Amount    │
│  Based on Payment   │
│  Option Rules       │
└──────────┬──────────┘
           │
      ┌────┴────┐
      │ Valid?  │
      └────┬────┘
      Yes  │  No
           │    └──> ❌ Reject Payment
           ▼
┌─────────────────────┐
│  Create Payment     │
│  Record             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Update Reference   │
│  - totalPaid        │
│  - installmentCount │
│  - Check if complete│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  If fully paid:     │
│  - Mark as USED     │
│  - Set usedAt       │
│  - Link transaction │
└─────────────────────┘
```

---

## Error Messages

### COMPLETE Option
- `COMPLETE option requires payment >= {amount}`
- `COMPLETE option allows only one payment`

### PARTIAL Option
- `PARTIAL option requires final payment >= {remainingAmount}`

### PRECISE Option
- `PRECISE option requires payment exactly = {amount}`
- `PRECISE option allows only one payment`

### LIMITED Option
- `LIMITED option requires payment <= {amount}`
- `LIMITED option requires payment <= {remainingAmount}`

### General
- `Reference is not valid. Status: {status}`
- `Reference has been fully paid. No further payments accepted.`
- `Invalid reference number`

---

## Testing Scenarios

### Test 1: COMPLETE Option

```bash
# Create reference
POST /api/references
{
  "amount": 100000,
  "paymentOption": "COMPLETE"
}

# Valid payment
POST /api/payments { "amountPaid": 100000 } # ✅ Success
POST /api/payments { "amountPaid": 120000 } # ✅ Overpayment OK

# Invalid payments
POST /api/payments { "amountPaid": 80000 }  # ❌ Less than required
POST /api/payments { "amountPaid": 50000 }  # ❌ Second payment not allowed
```

### Test 2: PARTIAL Option

```bash
# Create reference
POST /api/references
{
  "amount": 300000,
  "paymentOption": "PARTIAL"
}

# Valid sequence
POST /api/payments { "amountPaid": 100000 } # ✅ First installment
POST /api/payments { "amountPaid": 200000 } # ✅ Final (>= remaining)

# Invalid sequence
POST /api/payments { "amountPaid": 100000 } # ✅ First installment
POST /api/payments { "amountPaid": 100000 } # ❌ Final must be >= 200000
```

### Test 3: PRECISE Option

```bash
# Create reference
POST /api/references
{
  "amount": 50000,
  "paymentOption": "PRECISE"
}

# Valid payment
POST /api/payments { "amountPaid": 50000 }  # ✅ Exact amount

# Invalid payments
POST /api/payments { "amountPaid": 49999 }  # ❌ Not exact
POST /api/payments { "amountPaid": 50001 }  # ❌ Not exact
```

### Test 4: LIMITED Option

```bash
# Create reference
POST /api/references
{
  "amount": 400000,
  "paymentOption": "LIMITED"
}

# Valid sequence
POST /api/payments { "amountPaid": 150000 } # ✅ Partial
POST /api/payments { "amountPaid": 250000 } # ✅ Exact remaining

# Invalid sequence
POST /api/payments { "amountPaid": 150000 } # ✅ Partial
POST /api/payments { "amountPaid": 300000 } # ❌ Exceeds remaining
```

### Test 5: PERPETUAL Option

```bash
# Create reference
POST /api/references
{
  "amount": 1000000,
  "paymentOption": "PERPETUAL"
}

# All payments accepted
POST /api/payments { "amountPaid": 10000 }  # ✅
POST /api/payments { "amountPaid": 50000 }  # ✅
POST /api/payments { "amountPaid": 100000 } # ✅
# ... unlimited installments until fully paid
```

---

## Integration with i-RCS

When integrating with i-RCS (Integrated Receipt and Collection System):

### Invoice Validation Response

```xml
<invoice>
  <referenceNumber>SCH-0000123-A7F</referenceNumber>
  <invoiceAmount>500000</invoiceAmount>
  <paymentoption>PARTIAL</paymentoption>
  <currency>TZS</currency>
  <status>ACTIVE</status>
</invoice>
```

### Payment Submission

```xml
<payment>
  <referenceNumber>SCH-0000123-A7F</referenceNumber>
  <amountPaid>200000</amountPaid>
  <installmentNumber>1</installmentNumber>
  <totalPaid>200000</totalPaid>
  <remainingAmount>300000</remainingAmount>
</payment>
```

---

## Monitoring and Reporting

### Get Statistics by Payment Option

```typescript
// Query references by payment option
const partialRefs = await referenceRepository.find({
  where: { paymentOption: PaymentOption.PARTIAL }
});

// Get installment averages
const avgInstallments = await referenceRepository
  .createQueryBuilder('ref')
  .select('AVG(ref.installmentCount)', 'average')
  .where('ref.paymentOption = :option', { option: 'PARTIAL' })
  .andWhere('ref.isFullyPaid = true')
  .getRawOne();
```

---

## Files Modified

### Entities
- `src/modules/reference/entities/payment-reference.entity.ts`
  - Added `PaymentOption` enum
  - Added `paymentOption`, `totalPaid`, `installmentCount` fields
  - Added `canAcceptPayment()`, `isFullyPaid()`, `getRemainingAmount()` methods

### DTOs
- `src/modules/reference/dto/create-reference.dto.ts`
  - Added `paymentOption` field

### Services
- `src/modules/reference/reference.service.ts`
  - Updated `create()` to set default payment option
  - Updated `toResponseDto()` to include payment info

- `src/modules/payment/payment.service.ts`
  - Added payment option validation in `createPayment()`
  - Added `updateReferenceWithPayment()` method
  - Added `getPaymentSummary()` method

### Controllers
- `src/modules/payment/payment.controller.ts`
  - Added `GET /payments/:referenceNumber/summary` endpoint

---

## Best Practices

1. **Always validate payment option** before processing payment
2. **Track installments accurately** for audit trail
3. **Log all payment attempts** including rejections
4. **Send notifications** when invoice is fully paid
5. **Handle edge cases** like concurrent payments
6. **Test all payment options** thoroughly before deployment
7. **Document payment rules** clearly for service providers

---

## Summary

The payment options implementation provides:

✅ Complete validation for all 5 payment options
✅ Automatic installment tracking
✅ Real-time payment status
✅ Comprehensive error messages
✅ Full audit trail
✅ RESTful API endpoints
✅ Entity-level validation methods
✅ Support for i-RCS integration

All payment processing now enforces the correct payment option rules, ensuring compliance with i-RCS standards and preventing invalid payments.
