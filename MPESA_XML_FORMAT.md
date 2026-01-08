# M-Pesa C2B XML Format Documentation

## Overview

The M-Pesa integration uses the **mpesaBroker** XML namespace format for all communication.

**Namespace:** `http://inforwise.co.tz/broker/`
**Version:** `2.0`

---

## 1. Payment Notification (Incoming from M-Pesa)

M-Pesa sends this XML payload when a customer makes a payment.

### XML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <request>
    <serviceProvider>
      <spId>400205</spId>
      <spPassword>24NGiZuATISn=+widndaULALANVLJIYn99CCNbxs76?m</spPassword>
      <timestamp>20190221124032</timestamp>
    </serviceProvider>
    <transaction>
      <amount>18000.0</amount>
      <commandID>Pay Bill</commandID>
      <initiator>255758027779</initiator>
      <originatorConversationID>025d7efd-58bc-b06b-2aab91cde3b1</originatorConversationID>
      <recipient>400205</recipient>
      <mpesaReceipt>5BL716QNJBB</mpesaReceipt>
      <transactionDate>2019-02-21 12:40:27</transactionDate>
      <accountReference>255758027779</accountReference>
      <transactionID>1251899741111</transactionID>
      <conversationID>025d7efd-58bc-b06b-2aab91cde3b1</conversationID>
    </transaction>
  </request>
</mpesaBroker>
```

### Field Descriptions

#### serviceProvider Section
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **spId** | String | Service provider business number | `400205` |
| **spPassword** | String | SHA-256 + Base64 encrypted password | `24NGiZuATISn=+widndaULALANVLJIYn99CCNbxs76?m` |
| **timestamp** | String | Format: `YYYYMMDDHHmmss` | `20190221124032` |

#### transaction Section
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **amount** | Decimal | Payment amount | `18000.0` |
| **commandID** | String | Transaction type | `Pay Bill` |
| **initiator** | String | Customer phone number | `255758027779` |
| **originatorConversationID** | String | M-Pesa conversation ID | `025d7efd-58bc-b06b-2aab91cde3b1` |
| **recipient** | String | Same as spId | `400205` |
| **mpesaReceipt** | String | M-Pesa receipt number (unique) | `5BL716QNJBB` |
| **transactionDate** | String | Transaction date/time | `2019-02-21 12:40:27` |
| **accountReference** | String | UCG reference number | `UCG-0000001-A1B` |
| **transactionID** | String | M-Pesa transaction ID | `1251899741111` |
| **conversationID** | String | Conversation ID | `025d7efd-58bc-b06b-2aab91cde3b1` |

---

## 2. Sync Response (Immediate Response to M-Pesa)

UCG sends this response immediately (< 2 seconds) to acknowledge receipt.

### XML Structure

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

### Field Descriptions

| Field | Type | Value | Description |
|-------|------|-------|-------------|
| **conversationID** | String | Echo from request | Same as received |
| **originatorConversationID** | String | Echo from request | Same as received |
| **transactionID** | String | Echo from request | Same as received |
| **responseCode** | String | `0` | Always "0" for success |
| **responseDesc** | String | `Received` | Always "Received" |
| **serviceStatus** | String | `Success` | Always "Success" |

---

## 3. Callback (Async Result to M-Pesa)

UCG sends this callback after processing the payment.

### Success Callback

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <request>
    <serviceProvider>
      <spId>400205</spId>
      <spPassword>A8B3F2D1E5C7A9B4F6D8E2C5A7B9D4F1E3C8A5B7D9F2E4C6A8B1D3F5E7C9A2B4</spPassword>
      <timestamp>20190221124055</timestamp>
    </serviceProvider>
    <transaction>
      <resultType>Completed</resultType>
      <resultCode>0</resultCode>
      <resultDesc>Payment processed successfully</resultDesc>
      <mpesaReceipt>5BL716QNJBB</mpesaReceipt>
      <transactionDate>2019-02-21 12:40:55</transactionDate>
      <originatorConversationID>025d7efd-58bc-b06b-2aab91cde3b1</originatorConversationID>
      <conversationID>025d7efd-58bc-b06b-2aab91cde3b1</conversationID>
      <transactionID>1251899741111</transactionID>
      <initiator>ibm_in</initiator>
      <initiatorPassword>B9C4F1E3D5A7C2B8F6D1E9C3A5B7D4F2E8C1A6B9D5F3E7C2A4B8D1F6E9C3A5B7</initiatorPassword>
    </transaction>
  </request>
</mpesaBroker>
```

### Failure Callback

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <request>
    <serviceProvider>
      <spId>400205</spId>
      <spPassword>A8B3F2D1E5C7A9B4F6D8E2C5A7B9D4F1E3C8A5B7D9F2E4C6A8B1D3F5E7C9A2B4</spPassword>
      <timestamp>20190221124055</timestamp>
    </serviceProvider>
    <transaction>
      <resultType>Failed</resultType>
      <resultCode>999</resultCode>
      <resultDesc>Reference not found</resultDesc>
      <mpesaReceipt>5BL716QNJBB</mpesaReceipt>
      <transactionDate>2019-02-21 12:40:55</transactionDate>
      <originatorConversationID>025d7efd-58bc-b06b-2aab91cde3b1</originatorConversationID>
      <conversationID>025d7efd-58bc-b06b-2aab91cde3b1</conversationID>
      <transactionID>1251899741111</transactionID>
      <initiator>ibm_in</initiator>
      <initiatorPassword>B9C4F1E3D5A7C2B8F6D1E9C3A5B7D4F2E8C1A6B9D5F3E7C2A4B8D1F6E9C3A5B7</initiatorPassword>
    </transaction>
  </request>
</mpesaBroker>
```

### Callback Field Descriptions

#### serviceProvider Section (Callback)
| Field | Type | Description |
|-------|------|-------------|
| **spId** | String | Your business number |
| **spPassword** | String | NEW encrypted password (current timestamp) |
| **timestamp** | String | Current timestamp when sending callback |

#### transaction Section (Callback)
| Field | Type | Description | Values |
|-------|------|-------------|--------|
| **resultType** | String | Result type | `Completed` or `Failed` |
| **resultCode** | String | Result code | `0` (success) or `999` (failure) |
| **resultDesc** | String | Result description | Custom message |
| **mpesaReceipt** | String | Echo from notification | Same as received |
| **transactionDate** | String | Current date/time | New timestamp |
| **originatorConversationID** | String | Echo from notification | Same as received |
| **conversationID** | String | Echo from notification | Same as received |
| **transactionID** | String | Echo from notification | Same as received |
| **initiator** | String | Your initiator | e.g., `ibm_in` |
| **initiatorPassword** | String | Encrypted initiator password | SHA-256 + Base64 |

---

## Password Encryption

### Algorithm: SHA-256 + Base64

```typescript
// Formula
const plainText = spId + password + timestamp;
const hash = SHA256(plainText);
const encrypted = Base64.encode(hash);
```

### Example

```typescript
// Input
spId = "400205"
password = "mySecretPassword"
timestamp = "20190221124032"

// Combined
plainText = "400205mySecretPassword20190221124032"

// SHA-256 hash (hex)
hash = "d48f1b59e837..." (64 characters)

// Base64 encode
encrypted = "1I8bWeg3..." (44 characters)
```

### Implementation (TypeScript)

```typescript
import * as crypto from 'crypto';

function encryptPassword(spId: string, password: string, timestamp: string): string {
  const combined = `${spId}${password}${timestamp}`;
  const hash = crypto.createHash('sha256').update(combined).digest();
  return hash.toString('base64');
}

// Usage
const encrypted = encryptPassword('400205', 'myPassword', '20190221124032');
```

---

## Timestamp Format

### Format: `YYYYMMDDHHmmss`

| Component | Description | Example |
|-----------|-------------|---------|
| YYYY | 4-digit year | 2019 |
| MM | 2-digit month | 02 |
| DD | 2-digit day | 21 |
| HH | 2-digit hour (24h) | 12 |
| mm | 2-digit minute | 40 |
| ss | 2-digit second | 32 |

**Example:** `20190221124032` = February 21, 2019 at 12:40:32

### TypeScript Helper

```typescript
function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hour}${minute}${second}`;
}

// Example: "20250116143022"
```

---

## Result Codes

| Code | Description | Callback Type |
|------|-------------|---------------|
| **0** | Success | Completed |
| **999** | General Failure | Failed |

---

## Testing

### Test Script

Run the provided test script:

```bash
./test-mpesa-xml.sh
```

### Manual Test with curl

```bash
curl -X POST http://localhost:8000/api/v1/vodacom/transaction \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<mpesaBroker xmlns="http://inforwise.co.tz/broker/" version="2.0">
  <request>
    <serviceProvider>
      <spId>400205</spId>
      <spPassword>24NGiZuATISn=+widndaULALANVLJIYn99CCNbxs76?m</spPassword>
      <timestamp>20190221124032</timestamp>
    </serviceProvider>
    <transaction>
      <amount>18000.0</amount>
      <commandID>Pay Bill</commandID>
      <initiator>255758027779</initiator>
      <originatorConversationID>025d7efd-58bc-b06b-2aab91cde3b1</originatorConversationID>
      <recipient>400205</recipient>
      <mpesaReceipt>5BL716QNJBB</mpesaReceipt>
      <transactionDate>2019-02-21 12:40:27</transactionDate>
      <accountReference>UCG-0000001-A1B</accountReference>
      <transactionID>1251899741111</transactionID>
      <conversationID>025d7efd-58bc-b06b-2aab91cde3b1</conversationID>
    </transaction>
  </request>
</mpesaBroker>'
```

---

## Implementation Notes

### Parser Configuration

The XML parser is configured to handle the `mpesaBroker` namespace:

```typescript
const parser = new xml2js.Parser({ explicitArray: false });
const result = await parser.parseStringPromise(xmlBody);

const mpesaBroker = result.mpesaBroker;
const request = mpesaBroker.request;
const serviceProvider = request.serviceProvider;
const transaction = request.transaction;
```

### Builder Configuration

The XML builder includes namespace and version attributes:

```typescript
const builder = new xml2js.Builder({
  rootName: 'mpesaBroker',
  xmldec: { version: '1.0', encoding: 'UTF-8' },
  headless: false,
});

const xml = builder.buildObject({
  $: {
    xmlns: 'http://inforwise.co.tz/broker/',
    version: '2.0',
  },
  response: { /* response data */ }
});
```

---

## File Locations

| File | Description |
|------|-------------|
| `src/modules/mpesa/mpesa.service.ts` | XML parsing and building |
| `src/modules/mpesa/mpesa.controller.ts` | Webhook endpoint |
| `src/modules/mpesa/dto/mpesa-notification.dto.ts` | Data structures |
| `src/modules/mpesa/utils/mpesa-encryption.util.ts` | Password encryption |
| `test-mpesa-xml.sh` | Test script |

---

## Summary

✅ **Namespace:** `http://inforwise.co.tz/broker/`
✅ **Version:** `2.0`
✅ **Root Element:** `<mpesaBroker>`
✅ **Structure:** `serviceProvider` + `transaction` sections
✅ **Encryption:** SHA-256 + Base64
✅ **Timestamp:** `YYYYMMDDHHmmss` format
✅ **Response Time:** < 2 seconds

---

**Last Updated:** January 16, 2026
**Status:** ✅ Implementation Complete
**XML Format:** mpesaBroker v2.0
