# M-Pesa Test Credentials for Tester

## Configuration

- **Server URL**: `http://192.168.1.94:3000`
- **Endpoint**: `/api/v1/vodacom/transaction`
- **Method**: POST
- **Content-Type**: `application/xml`

## M-Pesa Credentials

- **SP ID**: `888000`
- **Plain Password**: `test_password`
- **Timestamp**: `20260108120000`
- **Encrypted Password**: `Zt48QUJ1noCfaWeVPD8VxctlbG8QiSJDSx36wzjWtww=`

### Password Encryption Formula

```
Encrypted Password = Base64(SHA256(spId + plainPassword + timestamp))
Encrypted Password = Base64(SHA256("888000" + "test_password" + "20260108120000"))
Encrypted Password = Zt48QUJ1noCfaWeVPD8VxctlbG8QiSJDSx36wzjWtww=
```

## Test Reference

- **Reference Number**: `TA5-0000001-97D`
- **Amount**: `50000.0` (TZS 50,000)
- **Expected Payer**: `255712345678`

## Complete XML Payload (CORRECT FORMAT)

**IMPORTANT**: M-Pesa uses a **nested XML structure** with:
- Root element: `<mpesaBroker>`
- Child element: `<request>`
- Two sections: `<serviceProvider>` and `<transaction>`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <request>
    <serviceProvider>
      <spId>888000</spId>
      <spPassword>Zt48QUJ1noCfaWeVPD8VxctlbG8QiSJDSx36wzjWtww=</spPassword>
      <timestamp>20260108120000</timestamp>
    </serviceProvider>
    <transaction>
      <amount>50000.0</amount>
      <commandID>Pay Bill</commandID>
      <initiator>255712345678</initiator>
      <originatorConversationID>025d7efd-58bc-b06b-2aab91cde3b1</originatorConversationID>
      <recipient>888000</recipient>
      <mpesaReceipt>5BL716QNJBB</mpesaReceipt>
      <transactionDate>2026-01-08 12:00:00</transactionDate>
      <accountReference>TA5-0000001-97D</accountReference>
      <transactionID>1251899741111</transactionID>
      <conversationID>025d7efd-58bc-b06b-2aab91cde3b1</conversationID>
    </transaction>
  </request>
</mpesaBroker>
```

## CURL Command

```bash
curl -X POST http://192.168.1.94:3000/api/v1/vodacom/transaction \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <request>
    <serviceProvider>
      <spId>888000</spId>
      <spPassword>Zt48QUJ1noCfaWeVPD8VxctlbG8QiSJDSx36wzjWtww=</spPassword>
      <timestamp>20260108120000</timestamp>
    </serviceProvider>
    <transaction>
      <amount>50000.0</amount>
      <commandID>Pay Bill</commandID>
      <initiator>255712345678</initiator>
      <originatorConversationID>025d7efd-58bc-b06b-2aab91cde3b1</originatorConversationID>
      <recipient>888000</recipient>
      <mpesaReceipt>5BL716QNJBB</mpesaReceipt>
      <transactionDate>2026-01-08 12:00:00</transactionDate>
      <accountReference>TA5-0000001-97D</accountReference>
      <transactionID>1251899741111</transactionID>
      <conversationID>025d7efd-58bc-b06b-2aab91cde3b1</conversationID>
    </transaction>
  </request>
</mpesaBroker>'
```

## Expected Response

**HTTP Status**: 200 OK

**Response Body** (XML):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <response>
    <conversationID>025d7efd-58bc-b06b-2aab91cde3b1</conversationID>
    <originatorConversationID>025d7efd-58bc-b06b-2aab91cde3b1</originatorConversationID>
    <transactionID>1251899741111</transactionID>
    <responseCode>0</responseCode>
    <responseDesc>Received</responseDesc>
    <serviceStatus>Success</serviceStatus>
  </response>
</mpesaBroker>
```

## Verification After Test

### 1. Check M-Pesa Transaction Created

```sql
SELECT * FROM mpesa_transactions
WHERE "mpesaReceipt" = '5BL716QNJBB';
```

**Expected**: One record with:
- `status`: 'RECEIVED'
- `amount`: 50000
- `referenceNumber`: 'TA5-0000001-97D'

### 2. Check Payment Created (after async processing)

```sql
SELECT * FROM payments
WHERE "transactionId" = '5BL716QNJBB';
```

**Expected**: One payment record with:
- `amountPaid`: 50000
- `paymentChannel`: 'M-Pesa'
- `fspCode`: 'VODACOM'
- `status`: 'SUCCESS'

### 3. Check Reference Updated

```sql
SELECT "referenceNumber", amount, "totalPaid", status
FROM payment_references
WHERE "referenceNumber" = 'TA5-0000001-97D';
```

**Expected**:
- `totalPaid`: Should increase by 50000
- `status`: Should change to 'PAID' (if totalPaid >= amount)

## Important Notes

### ⚠️ CRITICAL XML Structure

The XML **MUST** follow this exact nested structure:
```
<mpesaBroker>
  └─ <request>
      ├─ <serviceProvider>
      │   ├─ <spId>
      │   ├─ <spPassword>
      │   └─ <timestamp>
      └─ <transaction>
          ├─ <amount>
          ├─ <commandID>
          ├─ <initiator>
          ├─ <mpesaReceipt>
          ├─ <transactionDate>
          ├─ <accountReference>
          └─ ... (other fields)
```

### ⚠️ Password and Timestamp Must Match

- Timestamp in `<timestamp>`: `20260108120000`
- Encrypted password calculated with same timestamp: `Zt48QUJ1noCfaWeVPD8VxctlbG8QiSJDSx36wzjWtww=`
- **If you change the timestamp, you MUST recalculate the password!**

### ⚠️ Transaction IDs

For subsequent tests, change these to avoid duplicates:
- `mpesaReceipt` (M-Pesa receipt number) - **Must be unique**
- `transactionID`
- `conversationID`
- `originatorConversationID`

### ⚠️ Field Name Differences

**Note the field name differences**:
- Incoming webhook uses: `<timestamp>` (lowercase)
- Incoming webhook uses: `<mpesaReceipt>` (not serviceReceipt)
- Date format: `YYYY-MM-DD HH:mm:ss` (e.g., `2026-01-08 12:00:00`)

## Generate New Password (If Needed)

If you need to test with a different timestamp, use this command to generate the encrypted password:

```bash
node -e "
const crypto = require('crypto');
const spId = '888000';
const password = 'test_password';
const timestamp = '20260108120000'; // Change this

const combined = spId + password + timestamp;
const hash = crypto.createHash('sha256').update(combined).digest();
const encrypted = Buffer.from(hash).toString('base64');

console.log('Encrypted Password:', encrypted);
"
```

Or use the automated test script:
```bash
chmod +x test-mpesa-payment.sh
./test-mpesa-payment.sh
```

## Test Scenarios

### Scenario 1: First Payment (Partial)
- Amount: 50000.0
- Reference total: Check database for reference amount
- Expected: Payment SUCCESS, reference still ACTIVE (if not fully paid)

### Scenario 2: Duplicate Payment
- Use same `mpesaReceipt` twice
- Expected: Second request returns success but no duplicate payment created

### Scenario 3: Wrong Password
- Change `spPassword` to invalid value
- Expected: HTTP 400 Bad Request - "Invalid password"

### Scenario 4: Invalid Reference
- Change `accountReference` to non-existent value (e.g., "INVALID-REF-123")
- Expected: Payment webhook succeeds, but async processing fails (reference not found)

### Scenario 5: Wrong XML Structure
- Use flat XML (without nested structure)
- Expected: HTTP 400 Bad Request - "Invalid XML format"

## Postman Collection Setup

If using Postman:

1. **Method**: POST
2. **URL**: `http://192.168.1.94:3000/api/v1/vodacom/transaction`
3. **Headers**:
   - `Content-Type`: `application/xml`
4. **Body** (raw, XML): Paste the XML payload above

## Troubleshooting

### Error: "Invalid XML format"
- Check XML structure matches nested format above
- Ensure `<mpesaBroker>`, `<request>`, `<serviceProvider>`, and `<transaction>` elements are present

### Error: "Invalid password"
- Verify encrypted password was generated with same timestamp as `<timestamp>` field
- Recalculate password if you changed the timestamp

### Error: "Reference not found"
- Verify reference `TA5-0000001-97D` exists in database
- Check reference status is ACTIVE

### Response time > 2 seconds
- Check server logs for delays
- Verify RabbitMQ is running
- Check database connectivity

## Contact for Issues

If tests fail:
1. Check server logs: `npm run start:dev` output
2. Verify database config: `SELECT * FROM mpesa_config WHERE "spId" = '888000';`
3. Check RabbitMQ is running: Server should show "RabbitMQ Consumers: Active"
4. Verify reference exists: `SELECT * FROM payment_references WHERE "referenceNumber" = 'TA5-0000001-97D';`
