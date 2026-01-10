# M-Pesa Payment Testing Guide

## Overview
This guide explains how to test M-Pesa payments in the UCG Backend system.

## Test Reference Available
- **Reference Number**: `TA5-0000001-97D`
- **Amount**: TZS 50,000.00
- **Customer**: John Doe (+255712345678)
- **Status**: ACTIVE
- **Payment Paid**: TZS 0.00

## M-Pesa Payment Flow

### 1. **Webhook Receives Notification** (Public Endpoint)
- **Endpoint**: `POST /api/v1/vodacom/transaction`
- **Content-Type**: `application/xml`
- **Public**: No authentication required (called by M-Pesa servers)

### 2. **Processing Steps**
1. Parse XML notification
2. Validate notification format
3. Verify M-Pesa password (encrypted)
4. Check for duplicate transaction
5. Create transaction record in `mpesa_transactions`
6. Queue for async processing (RabbitMQ)
7. Return sync response to M-Pesa (< 2 seconds)

### 3. **Async Processing** (Background)
1. Validate reference number exists
2. Check payment amount is allowed
3. Create payment record in `payments` table with `fspCode: 'VODACOM'`
4. Execute CBS transfer (GL → Deposit account)
5. Update transaction status
6. Send callback to M-Pesa

## Quick Test

### Option 1: Using Test Script
```bash
./test-mpesa-payment.sh
```

### Option 2: Using cURL
```bash
curl -X POST http://localhost:8000/api/v1/vodacom/transaction \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<request>
  <spId>888000</spId>
  <spPassword>test_password</spPassword>
  <timeStamp>20260106150000</timeStamp>
  <amount>50000</amount>
  <commandID>CustomerPayBillOnline</commandID>
  <initiator>255712345678</initiator>
  <originatorConversationID>ORG_20260106_001</originatorConversationID>
  <recipient>888000</recipient>
  <serviceReceipt>RBK12345TEST001</serviceReceipt>
  <serviceDate>20260106150000</serviceDate>
  <accountReference>TA5-0000001-97D</accountReference>
  <transactionID>MPESA-TEST-001</transactionID>
  <conversationID>AG_20260106_001</conversationID>
</request>'
```

## Expected Response

### Success Response (200 OK)
```xml
<?xml version="1.0"?>
<response>
  <conversationID>AG_20260106_001</conversationID>
  <originatorConversationID>ORG_20260106_001</originatorConversationID>
  <transactionID>MPESA-TEST-001</transactionID>
  <responseCode>0</responseCode>
  <responseDesc>Received</responseDesc>
  <serviceStatus>Success</serviceStatus>
</response>
```

## Verification Queries

After sending the payment, verify processing:

### 1. Check M-Pesa Transaction
```sql
SELECT
  "mpesaReceipt",
  "referenceNumber",
  amount,
  status,
  "paymentId",
  "cbsTransferId",
  "createdAt"
FROM mpesa_transactions
WHERE "mpesaReceipt" = 'RBK12345TEST001'
ORDER BY "createdAt" DESC;
```

### 2. Check Payment Created
```sql
SELECT
  id,
  "referenceNumber",
  "payerName",
  "amountPaid",
  "fspCode",
  status,
  "paidAt"
FROM payments
WHERE "transactionId" = 'RBK12345TEST001';
```

### 3. Check Reference Updated
```sql
SELECT
  "referenceNumber",
  amount,
  "totalPaid",
  status,
  "installmentCount"
FROM payment_references
WHERE "referenceNumber" = 'TA5-0000001-97D';
```

### 4. Check CBS Transfer
```sql
SELECT
  id,
  reference,
  "debitAccount",
  "creditAccount",
  amount,
  status,
  "cbsReference"
FROM cbs_transfers
WHERE reference = 'TA5-0000001-97D'
ORDER BY "createdAt" DESC
LIMIT 1;
```

## M-Pesa Management Endpoints

All management endpoints require authentication (JWT token).

### Get All Transactions
```bash
curl -X GET "http://localhost:8000/api/v1/mpesa/transactions?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Specific Transaction
```bash
curl -X GET "http://localhost:8000/api/v1/mpesa/transactions/RBK12345TEST001" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Retry Failed Transaction
```bash
curl -X POST "http://localhost:8000/api/v1/mpesa/transactions/RBK12345TEST001/retry" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get M-Pesa Statistics
```bash
curl -X GET "http://localhost:8000/api/v1/mpesa/statistics?startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get M-Pesa Configuration
```bash
curl -X GET "http://localhost:8000/api/v1/mpesa/config" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Configuration Required

### Environment Variables (.env)
```env
# M-Pesa Configuration
MPESA_SP_ID=888000
MPESA_SP_PASSWORD=your_sp_password
MPESA_INITIATOR=ibm_in
MPESA_INITIATOR_PASSWORD=your_initiator_password
MPESA_CALLBACK_URL=https://your-callback-url.com/mpesa/callback

# CBS Configuration
UCG_GL_ACCOUNT=1000000001
CBS_API_URL=http://your-cbs-api.com
```

### M-Pesa Config in Database
The system will auto-create M-Pesa config from environment variables on first use, or you can manually insert:

```sql
INSERT INTO mpesa_config (
  "spId",
  "spPassword",
  initiator,
  "initiatorPassword",
  "callbackUrl",
  "isActive"
) VALUES (
  '888000',
  'your_sp_password',
  'ibm_in',
  'your_initiator_password',
  'https://your-callback-url.com/mpesa/callback',
  true
);
```

## Troubleshooting

### Password Verification Fails
- Check that `MPESA_SP_PASSWORD` matches the password from M-Pesa
- Verify timestamp is recent (within 5 minutes)
- Check encryption implementation in `MpesaEncryption` utility

### Reference Not Found
- Verify reference exists: `SELECT * FROM payment_references WHERE "referenceNumber" = 'XXX-XXXXXXX-XXX'`
- Check reference status is 'ACTIVE'
- Ensure reference hasn't expired

### Payment Not Created
- Check RabbitMQ is running: `brew services list | grep rabbitmq`
- Check consumer is processing: Look for logs in `npm run start:dev`
- Check mpesa_transactions table for status

### CBS Transfer Fails
- Verify CBS_API_URL is correct
- Check service provider has a primary bank account
- Check GL account number is valid

## Test Scenarios

### 1. **Full Payment (COMPLETE option)**
- Amount = Reference amount
- Should mark reference as FULLY_PAID

### 2. **Partial Payment (PARTIAL option)**
- Amount < Reference amount
- Should update totalPaid
- Reference stays ACTIVE

### 3. **Installment Payment (INSTALLMENT option)**
- Multiple payments of minPaymentAmount
- Each payment increments installmentCount

### 4. **Overpayment**
- Amount > (Reference amount - totalPaid)
- Should be rejected with appropriate error

### 5. **Duplicate Detection**
- Send same mpesaReceipt twice
- Second attempt should be logged but not processed

## Notes

⚠️ **Important**:
- The webhook must respond within 2 seconds to M-Pesa
- Actual processing happens asynchronously
- Password verification uses encryption (implement MpesaEncryption utility)
- In production, this endpoint will be called by M-Pesa servers only

📝 **TODO**:
- Implement actual password verification (currently accepting all)
- Add proper M-Pesa encryption/decryption
- Set up callback mechanism to M-Pesa
- Configure SSL certificates for production webhook
