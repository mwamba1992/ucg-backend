# UCG - Integration Points Specification

## TABLE OF CONTENTS
1. [External APIs We Consume (Kutoka Kwao)](#1-external-apis-we-consume)
2. [Our APIs for Validation (Kutoka Kwetu)](#2-our-apis-for-validation)
3. [Integration Architecture](#3-integration-architecture)
4. [Security & Authentication](#4-security--authentication)
5. [Error Handling](#5-error-handling)

---

## 1. EXTERNAL APIs WE CONSUME (Kutoka Kwao)

### 1.1 Mobile Network Operators (MNO) APIs

#### A. VODACOM M-PESA API

**Purpose**: Process M-Pesa payments from Vodacom customers

**Base URL**:
```
Production: https://api.vodacom.co.tz/mpesa/v1
Sandbox: https://sandbox.vodacom.co.tz/mpesa/v1
```

**Authentication**:
```yaml
Type: OAuth 2.0
Token Endpoint: /oauth/token
Grant Type: client_credentials
Credentials:
  - API Key: Provided by Vodacom
  - API Secret: Provided by Vodacom
Token Expiry: 1 hour
```

**1.1.1 Initiate Payment (C2B - Customer to Business)**

```http
POST /payments/c2b/initiate
Host: api.vodacom.co.tz
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Payload**:
```json
{
  "businessShortCode": "174379",
  "amount": 50000,
  "phoneNumber": "255712345678",
  "accountReference": "MWA-0001234-A7B",
  "transactionDesc": "School fees payment",
  "callbackUrl": "https://api.ucg.mhb.co.tz/callbacks/vodacom",
  "transactionId": "UCG-TXN-20251106-001"
}
```

**Success Response (200)**:
```json
{
  "conversationId": "AG_20251106_00001234567890",
  "originatorConversationId": "UCG-TXN-20251106-001",
  "responseCode": "0",
  "responseDescription": "Accept the service request successfully.",
  "requestId": "REQ123456"
}
```

**1.1.2 Payment Callback (from Vodacom)**

**Webhook Endpoint** (We provide):
```http
POST /api/v1/callbacks/vodacom
```

**Callback Payload**:
```json
{
  "resultType": 0,
  "resultCode": "0",
  "resultDesc": "The service request is processed successfully.",
  "conversationId": "AG_20251106_00001234567890",
  "transactionId": "PLG123456",
  "originatorConversationId": "UCG-TXN-20251106-001",
  "accountReference": "MWA-0001234-A7B",
  "amount": 50000,
  "transactionDate": "20251106103045",
  "phoneNumber": "255712345678",
  "mpesaReceiptNumber": "PLG123456",
  "balance": null
}
```

**1.1.3 Query Transaction Status**

```http
GET /payments/query/{conversationId}
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "conversationId": "AG_20251106_00001234567890",
  "status": "SUCCESS",
  "amount": 50000,
  "mpesaReceiptNumber": "PLG123456",
  "transactionDate": "2025-11-06T10:30:45Z"
}
```

---

#### B. AIRTEL MONEY API

**Base URL**:
```
Production: https://api.airtel.co.tz/merchant/v2
Sandbox: https://sandbox.airtel.co.tz/merchant/v2
```

**Authentication**:
```yaml
Type: API Key + Signature
Header: X-API-Key
Signature: HMAC-SHA256(payload + timestamp + api_secret)
```

**1.1.4 Push Payment Request**

```http
POST /payments/push
Host: api.airtel.co.tz
X-API-Key: {api_key}
X-Signature: {hmac_signature}
X-Timestamp: {unix_timestamp}
Content-Type: application/json
```

**Request Payload**:
```json
{
  "reference": "UCG-TXN-20251106-002",
  "subscriber": {
    "country": "TZ",
    "currency": "TZS",
    "msisdn": "255723456789"
  },
  "transaction": {
    "amount": 50000,
    "id": "MWA-0001234-A7B",
    "type": "PAYMENT"
  }
}
```

**Success Response (200)**:
```json
{
  "status": {
    "code": "200",
    "message": "SUCCESS",
    "result_code": "ESB000010",
    "response_code": "DP00800001006",
    "success": true
  },
  "data": {
    "transaction": {
      "airtel_money_id": "CI202511061030123456",
      "id": "MWA-0001234-A7B",
      "status": "TS"
    }
  }
}
```

**1.1.5 Airtel Callback** (We provide):
```http
POST /api/v1/callbacks/airtel
```

---

#### C. TIGO PESA API

**Base URL**:
```
Production: https://api.tigo.co.tz/v1
Sandbox: https://sandbox-api.tigo.co.tz/v1
```

**Authentication**:
```yaml
Type: Bearer Token
Token Endpoint: /oauth/generate/accesstoken
Grant Type: password
Credentials:
  - Username: Provided by Tigo
  - Password: Provided by Tigo
  - API Key: Provided by Tigo
```

**1.1.6 Request Payment**

```http
POST /payments/request
Host: api.tigo.co.tz
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Payload**:
```json
{
  "MasterMerchant": {
    "account": "5900",
    "pin": "1234",
    "id": "UCGMHB"
  },
  "Subscriber": {
    "account": "255734567890",
    "countryCode": "255",
    "country": "TZA",
    "firstName": "John",
    "lastName": "Doe"
  },
  "redirectUri": "https://api.ucg.mhb.co.tz/callbacks/tigo",
  "callbackUri": "https://api.ucg.mhb.co.tz/callbacks/tigo",
  "language": "eng",
  "terminalId": "UCG001",
  "originPayment": {
    "amount": "50000",
    "currencyCode": "TZS",
    "tax": "0",
    "fee": "0"
  },
  "LocalPayment": {
    "amount": "50000",
    "currencyCode": "TZS"
  },
  "transactionRefId": "UCG-TXN-20251106-003",
  "referenceId": "MWA-0001234-A7B"
}
```

---

#### D. HALOTEL PESA API

**Base URL**:
```
Production: https://api.halotel.co.tz/payment/v1
Sandbox: https://sandbox.halotel.co.tz/payment/v1
```

**Authentication**:
```yaml
Type: Basic Auth + API Key
Header: Authorization: Basic base64(username:password)
Header: X-API-Key: {api_key}
```

---

#### E. TTCL M-PESA API

**Base URL**:
```
Production: https://api.ttcl.co.tz/mpesa/v1
Sandbox: https://sandbox.ttcl.co.tz/mpesa/v1
```

**(Similar to Vodacom M-Pesa API)**

---

### 1.2 Bank Integration - TIPS (Tanzania Instant Payment System)

**Purpose**: Inter-bank transfers, bank account payments

**Base URL**:
```
Production: https://tips.bot.go.tz/api/v1
Test: https://test.tips.bot.go.tz/api/v1
```

**Authentication**:
```yaml
Type: Mutual TLS (mTLS) + Digital Certificate
Protocol: ISO 8583
Connectivity: Leased Line / Dedicated VPN
Certificate: X.509 from Bank of Tanzania
```

**1.2.1 Credit Transfer Request**

```xml
POST /creditTransfer
Host: tips.bot.go.tz
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>UCG-20251106-001</MsgId>
      <CreDtTm>2025-11-06T10:30:45</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>INDA</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>MWA-0001234-A7B</InstrId>
        <EndToEndId>UCG-TXN-20251106-001</EndToEndId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="TZS">50000.00</IntrBkSttlmAmt>
      <Dbtr>
        <Nm>John Doe</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>255712345678</Id>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <CdtrAcct>
        <Id>
          <Othr>
            <Id>0150123456789</Id>
          </Othr>
        </Id>
      </CdtrAcct>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>
```

**Response**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10">
  <FIToFIPmtStsRpt>
    <GrpHdr>
      <MsgId>TIPS-20251106-123456</MsgId>
      <CreDtTm>2025-11-06T10:30:50</CreDtTm>
    </GrpHdr>
    <TxInfAndSts>
      <StsId>TIPS-20251106-123456</StsId>
      <OrgnlInstrId>MWA-0001234-A7B</OrgnlInstrId>
      <TxSts>ACSC</TxSts>
    </TxInfAndSts>
  </FIToFIPmtStsRpt>
</Document>
```

---

### 1.3 KYC Verification APIs

#### A. NIDA (National Identification Authority)

**Purpose**: Verify customer identity using NIDA number

**Base URL**:
```
Production: https://ors.nida.go.tz/api/v1
Test: https://test.ors.nida.go.tz/api/v1
```

**Authentication**:
```yaml
Type: API Key + IP Whitelisting
Header: X-API-Key
```

**1.3.1 Verify Identity**

```http
POST /verify
Host: ors.nida.go.tz
X-API-Key: {api_key}
Content-Type: application/json
```

**Request**:
```json
{
  "nidaNumber": "19900101-12345-67890-12",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01"
}
```

**Response**:
```json
{
  "status": "SUCCESS",
  "verified": true,
  "data": {
    "nidaNumber": "19900101-12345-67890-12",
    "firstName": "JOHN",
    "middleName": "MICHAEL",
    "lastName": "DOE",
    "dateOfBirth": "1990-01-01",
    "gender": "M",
    "nationality": "TANZANIAN",
    "photo": "base64_encoded_photo",
    "signature": "base64_encoded_signature"
  },
  "matchScore": 100
}
```

---

#### B. BRELA (Business Registration and Licensing Agency)

**Purpose**: Verify business registration

**Base URL**:
```
Production: https://api.brela.go.tz/v1
```

**1.3.2 Verify Business Registration**

```http
GET /business/verify/{registrationNumber}
X-API-Key: {api_key}
```

**Response**:
```json
{
  "status": "ACTIVE",
  "registrationNumber": "BN123456789",
  "businessName": "MWANGA PRIMARY SCHOOL",
  "businessType": "LIMITED_COMPANY",
  "registrationDate": "2015-06-15",
  "directors": [
    {
      "name": "John Doe",
      "idNumber": "19900101-12345-67890-12"
    }
  ],
  "address": {
    "region": "Dar es Salaam",
    "district": "Kinondoni"
  }
}
```

---

#### C. TRA (Tanzania Revenue Authority)

**Purpose**: Verify TIN (Tax Identification Number)

**Base URL**:
```
Production: https://api.tra.go.tz/verification/v1
```

**1.3.3 Verify TIN**

```http
POST /tin/verify
X-API-Key: {api_key}
Content-Type: application/json
```

**Request**:
```json
{
  "tin": "123-456-789",
  "businessName": "MWANGA PRIMARY SCHOOL"
}
```

**Response**:
```json
{
  "verified": true,
  "tin": "123-456-789",
  "taxpayerName": "MWANGA PRIMARY SCHOOL",
  "businessType": "SCHOOL",
  "status": "ACTIVE",
  "registrationDate": "2015-07-01",
  "taxOffice": "KINONDONI"
}
```

---

### 1.4 MHB Core Banking System (CBS)

**Purpose**: Settlement to service provider accounts

**Base URL**:
```
Internal: https://cbs.internal.mhb.co.tz/api
```

**Authentication**:
```yaml
Type: VPN + Certificate-based
Protocol: SOAP / REST
Connectivity: Internal VPN Tunnel
```

**1.4.1 Post Settlement Transaction**

```http
POST /settlements/post
Host: cbs.internal.mhb.co.tz
Authorization: Bearer {internal_token}
Content-Type: application/json
```

**Request**:
```json
{
  "settlementId": "STL-20251106-001",
  "serviceProviderId": "MWA",
  "debitAccount": "9999999999",
  "creditAccount": "0150123456789",
  "amount": 48500.00,
  "currency": "TZS",
  "narration": "Settlement for MWA-0001234-A7B",
  "reference": "MWA-0001234-A7B",
  "transactionDate": "2025-11-06",
  "commission": 1500.00,
  "metadata": {
    "transactionCount": 1,
    "settlementPeriod": "2025-11-05 to 2025-11-06"
  }
}
```

**Response**:
```json
{
  "status": "SUCCESS",
  "settlementId": "STL-20251106-001",
  "cbsReferenceNumber": "CBS-20251106-123456",
  "postingDate": "2025-11-06T10:35:00Z",
  "debitAccount": "9999999999",
  "creditAccount": "0150123456789",
  "amount": 48500.00,
  "balance": 125000.00
}
```

---

## 2. OUR APIs FOR VALIDATION (Kutoka Kwetu)

### 2.1 Payment Reference Validation API

**Purpose**: Allow customers/SPs to validate payment references before payment

**Base URL**:
```
Production: https://api.ucg.mhb.co.tz/api/v1
UAT: https://api-uat.ucg.mhb.co.tz/api/v1
```

**Authentication**:
```yaml
Public Endpoints: API Key only
Private Endpoints: JWT Bearer Token

API Key Format: ucg_{64_character_hex}
Rate Limit: 100 requests/minute per API key
```

---

#### 2.1.1 Validate Payment Reference (PUBLIC)

**Endpoint**:
```http
GET /references/validate/{referenceNumber}
Host: api.ucg.mhb.co.tz
X-API-Key: {api_key}
```

**Example Request**:
```bash
curl -X GET \
  'https://api.ucg.mhb.co.tz/api/v1/references/validate/MWA-0001234-A7B' \
  -H 'X-API-Key: ucg_1234567890abcdef...'
```

**Success Response (200)**:
```json
{
  "isValid": true,
  "referenceNumber": "MWA-0001234-A7B",
  "reference": {
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "currency": "TZS",
    "description": "School fees for Term 1",
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "serviceProvider": {
      "name": "Mwanga Primary School",
      "code": "MWA",
      "phone": "+255712000001"
    },
    "metadata": {
      "studentId": "STD001",
      "class": "Form 1"
    }
  }
}
```

**Invalid Reference Response (200)**:
```json
{
  "isValid": false,
  "referenceNumber": "MWA-0001234-A7B",
  "reason": "Reference has expired"
}
```

**Error Responses**:
```json
// 400 - Invalid format
{
  "statusCode": 400,
  "message": "Invalid reference format",
  "error": "Bad Request"
}

// 404 - Not found
{
  "statusCode": 404,
  "message": "Reference not found",
  "error": "Not Found"
}

// 429 - Rate limit exceeded
{
  "statusCode": 429,
  "message": "Too many requests",
  "retryAfter": 60
}
```

---

#### 2.1.2 Get Reference Details by Number (PUBLIC)

```http
GET /references/number/{referenceNumber}
X-API-Key: {api_key}
```

**Response (200)**:
```json
{
  "id": "ref-uuid",
  "referenceNumber": "MWA-0001234-A7B",
  "serviceProviderId": "sp-uuid",
  "serviceProviderName": "Mwanga Primary School",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000,
  "currency": "TZS",
  "description": "School fees for Term 1",
  "status": "ACTIVE",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "isValid": true,
  "isExpired": false,
  "createdAt": "2025-11-06T10:00:00.000Z"
}
```

---

#### 2.1.3 Bulk Validate References (PUBLIC)

```http
POST /references/validate/bulk
X-API-Key: {api_key}
Content-Type: application/json
```

**Request**:
```json
{
  "references": [
    "MWA-0001234-A7B",
    "MWA-0001235-B8C",
    "MWA-0001236-C9D"
  ]
}
```

**Response (200)**:
```json
{
  "results": [
    {
      "referenceNumber": "MWA-0001234-A7B",
      "isValid": true,
      "amount": 50000
    },
    {
      "referenceNumber": "MWA-0001235-B8C",
      "isValid": false,
      "reason": "Already used"
    },
    {
      "referenceNumber": "MWA-0001236-C9D",
      "isValid": true,
      "amount": 45000
    }
  ],
  "summary": {
    "total": 3,
    "valid": 2,
    "invalid": 1
  }
}
```

---

### 2.2 Service Provider Lookup API (PUBLIC)

#### 2.2.1 Get Service Provider by Code

```http
GET /service-providers/code/{spCode}
X-API-Key: {api_key}
```

**Response (200)**:
```json
{
  "id": "sp-uuid",
  "spCode": "MWA",
  "businessName": "Mwanga Primary School",
  "businessType": "SCHOOL",
  "phoneNumber": "+255712000001",
  "email": "info@mwangaschool.co.tz",
  "region": "Dar es Salaam",
  "district": "Kinondoni",
  "isActive": true
}
```

---

### 2.3 Transaction Callback APIs (PRIVATE - From MNOs)

**Purpose**: Receive payment confirmation callbacks from MNOs

**Security**:
```yaml
Authentication: IP Whitelisting + Signature Verification
Expected Source IPs:
  - Vodacom: 196.13.xxx.xxx
  - Airtel: 196.12.xxx.xxx
  - Tigo: 196.11.xxx.xxx
Signature: HMAC-SHA256
```

---

#### 2.3.1 Vodacom M-Pesa Callback

```http
POST /api/v1/callbacks/vodacom
Content-Type: application/json
X-Signature: {hmac_signature}
```

**Expected Payload**:
```json
{
  "resultType": 0,
  "resultCode": "0",
  "resultDesc": "The service request is processed successfully.",
  "conversationId": "AG_20251106_00001234567890",
  "transactionId": "PLG123456",
  "originatorConversationId": "UCG-TXN-20251106-001",
  "accountReference": "MWA-0001234-A7B",
  "amount": 50000,
  "transactionDate": "20251106103045",
  "phoneNumber": "255712345678",
  "mpesaReceiptNumber": "PLG123456"
}
```

**Our Response**:
```json
{
  "resultCode": "0",
  "resultDesc": "Callback received successfully"
}
```

**What We Do**:
1. Verify signature
2. Validate reference exists
3. Update transaction status to SUCCESS/FAILED
4. Mark reference as USED if SUCCESS
5. Notify service provider
6. Queue for settlement
7. Send customer confirmation

---

#### 2.3.2 Airtel Money Callback

```http
POST /api/v1/callbacks/airtel
X-API-Key: {shared_secret}
X-Timestamp: {unix_timestamp}
Content-Type: application/json
```

---

#### 2.3.3 Tigo Pesa Callback

```http
POST /api/v1/callbacks/tigo
X-API-Key: {shared_secret}
Content-Type: application/json
```

---

### 2.4 Webhook Notifications (From Us to Service Providers)

**Purpose**: Notify SPs of payment events in real-time

#### 2.4.1 Payment Success Webhook

**We POST to SP's webhookUrl**:
```http
POST {sp_webhook_url}
X-UCG-Signature: {hmac_signature}
X-UCG-Event: payment.success
Content-Type: application/json
```

**Payload**:
```json
{
  "event": "payment.success",
  "timestamp": "2025-11-06T10:35:00.000Z",
  "data": {
    "transactionId": "txn-uuid",
    "referenceNumber": "MWA-0001234-A7B",
    "amount": 50000,
    "currency": "TZS",
    "channel": "VODACOM",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "externalReference": "PLG123456",
    "transactionDate": "2025-11-06T10:30:45.000Z",
    "metadata": {
      "studentId": "STD001"
    }
  }
}
```

**Expected Response from SP**:
```json
{
  "received": true
}
```

**Events We Send**:
- `payment.success` - Payment successful
- `payment.failed` - Payment failed
- `payment.reversed` - Payment reversed
- `settlement.completed` - Settlement processed
- `reference.expired` - Reference expired

---

### 2.5 API Authentication & Authorization

#### 2.5.1 Obtain API Key (Service Providers)

**After SP approval, we generate**:
```
API Key: ucg_a1b2c3d4e5f6...
Format: ucg_{64_char_hex}
Validity: Permanent (until regenerated)
```

**Usage**:
```http
X-API-Key: ucg_a1b2c3d4e5f6...
```

**Rate Limits**:
- Standard: 100 req/min
- Premium: 1000 req/min

---

#### 2.5.2 JWT Authentication (Web/Mobile Apps)

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@mwangaschool.co.tz",
  "password": "SecurePassword123"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "user": {
    "id": "user-uuid",
    "email": "admin@mwangaschool.co.tz",
    "role": "SP_ADMIN",
    "serviceProviderId": "sp-uuid"
  }
}
```

**Usage**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 3. INTEGRATION ARCHITECTURE

### 3.1 Integration Flow Diagram

```
┌─────────────┐
│  Customer   │
└──────┬──────┘
       │ 1. Initiates payment with reference
       ▼
┌─────────────────────────────────┐
│     Mobile Network Operator      │
│   (Vodacom/Airtel/Tigo/etc.)   │
└──────────┬──────────────────────┘
           │ 2. Payment request
           ▼
    ┌──────────────┐
    │   UCG API    │◄─── 3. Validate reference
    │              │
    │  - Validate  │
    │  - Route     │
    │  - Process   │
    └──────┬───────┘
           │ 4. Callback with result
           ▼
    ┌──────────────┐
    │ Update Status│
    │ Mark as USED │
    └──────┬───────┘
           │
           ├──────────────┬─────────────────┐
           │              │                 │
           ▼              ▼                 ▼
    ┌──────────┐  ┌──────────┐     ┌──────────┐
    │  Notify  │  │Settlement│     │   MHB    │
    │    SP    │  │  Queue   │     │   CBS    │
    └──────────┘  └──────────┘     └──────────┘
```

### 3.2 Data Flow for Payment Transaction

```
Step 1: Customer Validation
  Customer → UCG API → Validate Reference → Return details

Step 2: Payment Initiation
  Customer → MNO → Debit Account
             MNO → UCG API → Create Transaction

Step 3: Processing
  UCG API → Validate Reference (again)
          → Check duplicate
          → Update transaction status

Step 4: Callback Processing
  MNO → UCG Callback API → Verify signature
                         → Update transaction
                         → Mark reference as USED
                         → Queue for settlement

Step 5: Notifications
  UCG → Service Provider Webhook
      → Customer SMS/Email

Step 6: Settlement (Daily/Weekly/Monthly)
  UCG → Calculate net amount
      → Post to MHB CBS
      → Update settlement records
      → Notify SP
```

---

## 4. SECURITY & AUTHENTICATION

### 4.1 API Key Management

```yaml
Generation:
  Format: ucg_{64_char_random_hex}
  Storage: Encrypted in database
  Transmission: HTTPS only

Rotation:
  Frequency: On-demand or annually
  Process: Generate new, grace period 30 days

Revocation:
  Immediate on compromise
  Notification: Email + Portal alert
```

### 4.2 Signature Verification

**For MNO Callbacks**:
```python
# Pseudo-code
def verify_signature(payload, signature, secret):
    calculated = hmac_sha256(payload + timestamp, secret)
    return compare_digest(calculated, signature)
```

**For Our Webhooks to SPs**:
```javascript
// Service Provider verifies our signature
const crypto = require('crypto');
const hmac = crypto.createHmac('sha256', webhookSecret);
hmac.update(JSON.stringify(payload));
const calculatedSignature = hmac.digest('hex');
const isValid = calculatedSignature === receivedSignature;
```

### 4.3 IP Whitelisting

```yaml
MNO Callback IPs (Whitelist):
  Vodacom:
    - 196.13.10.0/24
    - 196.13.11.0/24
  Airtel:
    - 196.12.20.0/24
  Tigo:
    - 196.11.30.0/24

Our Outbound IPs (SPs whitelist):
  - 41.93.xxx.xxx
  - 41.93.yyy.yyy
```

---

## 5. ERROR HANDLING

### 5.1 Standard Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-11-06T10:30:45.000Z",
  "path": "/api/v1/references/validate/ABC",
  "details": [
    {
      "field": "referenceNumber",
      "message": "Invalid reference format"
    }
  ]
}
```

### 5.2 HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input/format |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate/conflict |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | Upstream error |
| 503 | Service Unavailable | Maintenance/overload |

### 5.3 Retry Logic

```yaml
For Failed Callbacks:
  Max Retries: 5
  Backoff: Exponential (1s, 2s, 4s, 8s, 16s)
  Timeout: 30 seconds per attempt
  Dead Letter Queue: After 5 failures

For Outbound API Calls:
  Max Retries: 3
  Backoff: Linear (2s, 4s, 6s)
  Circuit Breaker: Open after 5 consecutive failures
  Fallback: Queue for manual processing
```

---

## 6. MONITORING & LOGS

### 6.1 What We Log

```yaml
Inbound API Calls:
  - Timestamp
  - Endpoint
  - Method
  - Source IP
  - API Key (hashed)
  - Response time
  - Status code

Outbound API Calls:
  - Timestamp
  - Destination
  - Request payload (sanitized)
  - Response
  - Duration
  - Retry attempts

Callbacks:
  - Full payload (sanitized)
  - Signature verification result
  - Processing result
  - Notifications sent
```

### 6.2 Alerts

```yaml
Critical Alerts:
  - MNO API down (> 5 minutes)
  - Callback failures > 10/minute
  - Invalid signatures detected
  - Rate limit exceeded repeatedly

Warning Alerts:
  - High response time (> 3 seconds)
  - Elevated error rate (> 2%)
  - Unusual traffic patterns
```

---

## 7. API DOCUMENTATION LINKS

### 7.1 Interactive API Documentation

```yaml
Production Docs: https://api.ucg.mhb.co.tz/docs
UAT Docs: https://api-uat.ucg.mhb.co.tz/docs

Format: Swagger/OpenAPI 3.0
Features:
  - Try it out functionality
  - Code samples (cURL, JavaScript, Python)
  - Request/response examples
  - Authentication guide
```

### 7.2 Postman Collection

```
Download: https://api.ucg.mhb.co.tz/postman/collection.json

Includes:
  - All endpoints
  - Pre-configured variables
  - Example requests
  - Test scripts
```

---

**Document Version**: 1.0
**Last Updated**: November 6, 2025
**Status**: DRAFT FOR PRESENTATION
**Classification**: CONFIDENTIAL
