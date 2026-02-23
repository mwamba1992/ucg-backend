# Airtel C2B Integration - API Documentation

## Overview

UCG hosts 5 XML-based API endpoints that Airtel calls to validate and process Customer-to-Business (C2B) payments. All Airtel-facing endpoints use the `<COMMAND>` XML root element and require JWT (HS512) authentication.

Additionally, 5 admin JSON endpoints are available for internal transaction management.

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication](#authentication)
3. [Airtel C2B Endpoints (XML)](#airtel-c2b-endpoints-xml)
4. [Admin Endpoints (JSON)](#admin-endpoints-json)
5. [Error Codes](#error-codes)
6. [Database Tables](#database-tables)
7. [Environment Variables](#environment-variables)
8. [cURL Examples](#curl-examples)

---

## Architecture

```
Airtel  ──XML+JWT──>  UCG Airtel Module  ──>  ReferenceService (validate)
                                          ──>  PaymentService.createPayment()
                                                  ├── CBS GL Transfer
                                                  ├── Save to `payments` table
                                                  └── SP Notifications (SMS/Email/Webhook)
                                          ──>  Save to `airtel_transactions` table
                                          ──>  Return XML response to Airtel
```

**Processing is synchronous** - Airtel receives the actual payment result (success/failure) immediately.

**Two tables are updated on successful payment:**
- `payments` - main payment record (via PaymentService)
- `airtel_transactions` - Airtel-specific audit trail (linked via `paymentId`)

**APEF routing:** References starting with `001` or `002` are automatically routed to the APEF payment flow.

---

## Authentication

### Airtel C2B Endpoints (JWT HS512)

Airtel signs requests with a JWT token using the **HS512** algorithm and a shared secret key.

```
Authorization: Bearer <jwt_token>
```

The shared key is configured via:
1. `airtel_config` table (`sharedKey` column) - checked first
2. `AIRTEL_SHARED_KEY` environment variable - fallback

### Admin Endpoints (UCG JWT)

Admin endpoints use standard UCG JWT authentication with role-based access.

```
Authorization: Bearer <ucg_jwt_token>
```

Required roles: `SUPER_ADMIN`, `ADMIN`, or `MANAGER` (varies by endpoint).

---

## Airtel C2B Endpoints (XML)

All endpoints:
- Accept: `application/xml` or `text/xml`
- Return: XML with `<COMMAND>` root element
- Auth: Airtel JWT (HS512)
- Always return HTTP 200 with result in XML body (never HTTP error codes)

### 1. Validate Transaction

**POST** `/api/v1/airtel/validate`

Called by Airtel before processing to check if a reference exists and can accept the payment amount.

**Request:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>VALIDATETXN</TYPE>
  <TXNID>AIR20260223.1200.001</TXNID>
  <MSISDN>0784123456</MSISDN>
  <AMOUNT>50000</AMOUNT>
  <COMPANYNAME>UCG_PARTNER</COMPANYNAME>
  <CUSTOMERREFERENCEID>MHB-0000001-ABC</CUSTOMERREFERENCEID>
  <SENDERNAME>John Doe</SENDERNAME>
</COMMAND>
```

**Success Response:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>VALIDATETXNRESPONSE</TYPE>
  <TXNID>AIR20260223.1200.001</TXNID>
  <REFID></REFID>
  <RESULT>TS</RESULT>
  <ERRORCODE>error000</ERRORCODE>
  <ERRORDESC>Validation successful</ERRORDESC>
  <MSISDN>0784123456</MSISDN>
  <FLAG>Y</FLAG>
  <CONTENT>Customer: John Doe|Amount: TZS 50000|Ref: MHB-0000001-ABC</CONTENT>
</COMMAND>
```

**Failure Response:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>VALIDATETXNRESPONSE</TYPE>
  <TXNID>AIR20260223.1200.001</TXNID>
  <REFID></REFID>
  <RESULT>TF</RESULT>
  <ERRORCODE>error010</ERRORCODE>
  <ERRORDESC>Reference not found</ERRORDESC>
  <MSISDN>0784123456</MSISDN>
  <FLAG>N</FLAG>
</COMMAND>
```

---

### 2. Process Transaction

**POST** `/api/v1/airtel/process`

Called by Airtel to execute the actual payment. This triggers:
1. Reference validation
2. Payment record creation
3. CBS GL transfer (GL-first - if this fails, the entire payment fails)
4. SP notifications (SMS/Email/Webhook based on SP settings)
5. Airtel transaction record update

**Request:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>PROCESSTXN</TYPE>
  <TXNID>AIR20260223.1200.001</TXNID>
  <MSISDN>0784123456</MSISDN>
  <AMOUNT>50000</AMOUNT>
  <COMPANYNAME>UCG_PARTNER</COMPANYNAME>
  <CUSTOMERREFERENCEID>MHB-0000001-ABC</CUSTOMERREFERENCEID>
  <SENDERNAME>John Doe</SENDERNAME>
</COMMAND>
```

**Success Response:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>PROCESSTXNRESPONSE</TYPE>
  <TXNID>AIR20260223.1200.001</TXNID>
  <REFID>AR7890123456ABCD1234</REFID>
  <RESULT>TS</RESULT>
  <ERRORCODE>error000</ERRORCODE>
  <ERRORDESC>Payment processed successfully</ERRORDESC>
  <MSISDN>0784123456</MSISDN>
  <FLAG>Y</FLAG>
  <CONTENT>Payment received. Ref: AR7890123456ABCD1234</CONTENT>
</COMMAND>
```

**Duplicate Transaction Response:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>PROCESSTXNRESPONSE</TYPE>
  <TXNID>AIR20260223.1200.001</TXNID>
  <REFID></REFID>
  <RESULT>TS</RESULT>
  <ERRORCODE>error000</ERRORCODE>
  <ERRORDESC>Transaction already processed</ERRORDESC>
  <MSISDN>0784123456</MSISDN>
  <FLAG>N</FLAG>
</COMMAND>
```

---

### 3. Transaction Enquiry

**POST** `/api/v1/airtel/enquiry`

Called by Airtel to check the status of a previously processed transaction.

**Request:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>TXNENQUIRY</TYPE>
  <TXNID>AIR20260223.1200.001</TXNID>
  <MSISDN>0784123456</MSISDN>
  <COMPANYNAME>UCG_PARTNER</COMPANYNAME>
</COMMAND>
```

**Success Response (completed transaction):**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>TXNENQUIRYRESPONSE</TYPE>
  <TXNID>AIR20260223.1200.001</TXNID>
  <REFID>AR7890123456ABCD1234</REFID>
  <RESULT>TS</RESULT>
  <ERRORCODE>error000</ERRORCODE>
  <ERRORDESC>Transaction completed</ERRORDESC>
  <MSISDN>0784123456</MSISDN>
  <FLAG>Y</FLAG>
  <CONTENT>Payment completed. Ref: AR7890123456ABCD1234</CONTENT>
</COMMAND>
```

**Not Found Response:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>TXNENQUIRYRESPONSE</TYPE>
  <TXNID>AIR20260223.1200.001</TXNID>
  <REFID></REFID>
  <RESULT>TF</RESULT>
  <ERRORCODE>error010</ERRORCODE>
  <ERRORDESC>Transaction not found</ERRORDESC>
  <FLAG>N</FLAG>
</COMMAND>
```

---

### 4. Bill Fetch

**POST** `/api/v1/airtel/billfetch`

Called by Airtel to fetch bill details (amount due, customer name) for a payment reference.

**Request:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>BILLFETCH</TYPE>
  <CUSTOMERREFERENCEID>MHB-0000001-ABC</CUSTOMERREFERENCEID>
  <MSISDN>0784123456</MSISDN>
  <COMPANYNAME>UCG_PARTNER</COMPANYNAME>
</COMMAND>
```

**Success Response:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>BILLFETCHRESPONSE</TYPE>
  <CUSTOMERREFERENCEID>MHB-0000001-ABC</CUSTOMERREFERENCEID>
  <RESULT>TS</RESULT>
  <ERRORCODE>error000</ERRORCODE>
  <ERRORDESC>Bill found</ERRORDESC>
  <AMOUNT>50000</AMOUNT>
  <CUSTOMERNAME>John Doe</CUSTOMERNAME>
  <DESCRIPTION>School Fees Payment</DESCRIPTION>
  <FLAG>Y</FLAG>
  <CONTENT>Bill for John Doe|Amount: TZS 50000</CONTENT>
</COMMAND>
```

---

### 5. Lookup Details

**POST** `/api/v1/airtel/lookup`

Called by Airtel to look up customer and reference details.

**Request:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>LOOKUPDETAILS</TYPE>
  <CUSTOMERREFERENCEID>MHB-0000001-ABC</CUSTOMERREFERENCEID>
  <MSISDN>0784123456</MSISDN>
  <COMPANYNAME>UCG_PARTNER</COMPANYNAME>
</COMMAND>
```

**Success Response:**
```xml
<?xml version="1.0"?>
<COMMAND>
  <TYPE>LOOKUPDETAILSRESPONSE</TYPE>
  <CUSTOMERREFERENCEID>MHB-0000001-ABC</CUSTOMERREFERENCEID>
  <RESULT>TS</RESULT>
  <ERRORCODE>error000</ERRORCODE>
  <ERRORDESC>Details found</ERRORDESC>
  <CUSTOMERNAME>John Doe</CUSTOMERNAME>
  <AMOUNT>50000</AMOUNT>
  <DESCRIPTION>School Fees Payment</DESCRIPTION>
  <FLAG>Y</FLAG>
  <CONTENT>John Doe|TZS 50000|School Fees Payment</CONTENT>
</COMMAND>
```

---

## Admin Endpoints (JSON)

All admin endpoints require UCG JWT authentication.

### 6. List Airtel Transactions

**GET** `/api/v1/airtel/transactions`

Roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`

| Query Param | Type | Description |
|------------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `status` | string | Filter by status: RECEIVED, PROCESSING, COMPLETED, FAILED |
| `referenceNumber` | string | Filter by reference number |

### 7. Get Single Transaction

**GET** `/api/v1/airtel/transactions/:txnId`

Roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`

### 8. Retry Failed Transaction

**POST** `/api/v1/airtel/transactions/:txnId/retry`

Roles: `SUPER_ADMIN`, `ADMIN`

Only transactions with status `FAILED` can be retried.

### 9. Get Airtel Config

**GET** `/api/v1/airtel/config`

Roles: `SUPER_ADMIN`

### 10. Get Statistics

**GET** `/api/v1/airtel/statistics`

Roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`

| Query Param | Type | Description |
|------------|------|-------------|
| `startDate` | string | ISO date (e.g., 2026-01-01) |
| `endDate` | string | ISO date (e.g., 2026-12-31) |

---

## Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| `error000` | SUCCESS | Transaction successful |
| `error001` | SERVICE_NOT_AVAILABLE | Service temporarily unavailable |
| `error010` | INVALID_REFERENCE | Invalid customer reference number |
| `error011` | ACCOUNT_LOCKED | Reference expired, cancelled, or fully paid |
| `error012` | INVALID_AMOUNT | Invalid payment amount |
| `error013` | INSUFFICIENT_AMOUNT | Amount insufficient |
| `error014` | AMOUNT_TOO_HIGH | Amount exceeds allowed limit |
| `error015` | AMOUNT_TOO_LOW | Amount below minimum |
| `error016` | INVALID_PAYMENT | Invalid payment |
| `error100` | GENERAL_ERROR | General/internal error |
| `error111` | RETRY_NO_RESPONSE | Retry - no response received |

**Result Codes:**
- `TS` - Transaction Successful
- `TF` - Transaction Failed

---

## Database Tables

### `airtel_transactions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `txnId` | VARCHAR(50) UNIQUE | Airtel transaction ID |
| `refId` | VARCHAR(50) | UCG partner reference (e.g., AR7890123456ABCD1234) |
| `paymentId` | UUID (FK) | Links to `payments` table |
| `referenceNumber` | VARCHAR(50) | Customer reference ID |
| `amount` | DECIMAL(15,2) | Payment amount |
| `customerPhone` | VARCHAR(15) | Payer MSISDN |
| `customerName` | VARCHAR(200) | Payer name |
| `companyName` | VARCHAR(50) | Airtel partner identifier |
| `status` | ENUM | RECEIVED, PROCESSING, COMPLETED, FAILED |
| `resultCode` | VARCHAR(50) | Error code (error000, etc.) |
| `cbsTransferId` | UUID (FK) | Links to `cbs_transfers` table |
| `rawNotification` | JSONB | Original request payload |
| `rawResponse` | JSONB | Response sent back |
| `processedAt` | TIMESTAMP | When processing completed |
| `createdAt` | TIMESTAMP | Record created |
| `updatedAt` | TIMESTAMP | Record updated |

### `airtel_config`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `partnerCode` | VARCHAR(50) | Airtel partner identifier |
| `sharedKey` | VARCHAR(255) | JWT HS512 shared secret |
| `isActive` | BOOLEAN | Configuration active flag |
| `metadata` | JSONB | Additional config data |

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AIRTEL_SHARED_KEY` | JWT HS512 shared secret (fallback if not in DB) | `your_shared_secret_here` |
| `AIRTEL_PARTNER_CODE` | Partner code (fallback if not in DB) | `UCG_PARTNER` |

---

## cURL Examples

### Variables

```bash
# Base URL
BASE_URL="http://localhost:3000/api/v1"

# Airtel JWT token (HS512 signed with shared key)
AIRTEL_TOKEN="eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9..."

# UCG Admin JWT token
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test reference number (replace with a real one)
REF_NUMBER="MHB-0000001-ABC"
```

---

### 1. Validate Transaction

```bash
curl -X POST "${BASE_URL}/airtel/validate" \
  -H "Content-Type: application/xml" \
  -H "Authorization: Bearer ${AIRTEL_TOKEN}" \
  -d '<?xml version="1.0"?>
<COMMAND>
  <TYPE>VALIDATETXN</TYPE>
  <TXNID>AIR20260223.1200.001</TXNID>
  <MSISDN>0784123456</MSISDN>
  <AMOUNT>50000</AMOUNT>
  <COMPANYNAME>UCG_PARTNER</COMPANYNAME>
  <CUSTOMERREFERENCEID>'"${REF_NUMBER}"'</CUSTOMERREFERENCEID>
  <SENDERNAME>John Doe</SENDERNAME>
</COMMAND>'
```

### 2. Process Transaction

```bash
curl -X POST "${BASE_URL}/airtel/process" \
  -H "Content-Type: application/xml" \
  -H "Authorization: Bearer ${AIRTEL_TOKEN}" \
  -d '<?xml version="1.0"?>
<COMMAND>
  <TYPE>PROCESSTXN</TYPE>
  <TXNID>AIR20260223.1200.002</TXNID>
  <MSISDN>0784123456</MSISDN>
  <AMOUNT>50000</AMOUNT>
  <COMPANYNAME>UCG_PARTNER</COMPANYNAME>
  <CUSTOMERREFERENCEID>'"${REF_NUMBER}"'</CUSTOMERREFERENCEID>
  <SENDERNAME>John Doe</SENDERNAME>
</COMMAND>'
```

### 3. Transaction Enquiry

```bash
curl -X POST "${BASE_URL}/airtel/enquiry" \
  -H "Content-Type: application/xml" \
  -H "Authorization: Bearer ${AIRTEL_TOKEN}" \
  -d '<?xml version="1.0"?>
<COMMAND>
  <TYPE>TXNENQUIRY</TYPE>
  <TXNID>AIR20260223.1200.002</TXNID>
  <MSISDN>0784123456</MSISDN>
  <COMPANYNAME>UCG_PARTNER</COMPANYNAME>
</COMMAND>'
```

### 4. Bill Fetch

```bash
curl -X POST "${BASE_URL}/airtel/billfetch" \
  -H "Content-Type: application/xml" \
  -H "Authorization: Bearer ${AIRTEL_TOKEN}" \
  -d '<?xml version="1.0"?>
<COMMAND>
  <TYPE>BILLFETCH</TYPE>
  <CUSTOMERREFERENCEID>'"${REF_NUMBER}"'</CUSTOMERREFERENCEID>
  <MSISDN>0784123456</MSISDN>
  <COMPANYNAME>UCG_PARTNER</COMPANYNAME>
</COMMAND>'
```

### 5. Lookup Details

```bash
curl -X POST "${BASE_URL}/airtel/lookup" \
  -H "Content-Type: application/xml" \
  -H "Authorization: Bearer ${AIRTEL_TOKEN}" \
  -d '<?xml version="1.0"?>
<COMMAND>
  <TYPE>LOOKUPDETAILS</TYPE>
  <CUSTOMERREFERENCEID>'"${REF_NUMBER}"'</CUSTOMERREFERENCEID>
  <MSISDN>0784123456</MSISDN>
  <COMPANYNAME>UCG_PARTNER</COMPANYNAME>
</COMMAND>'
```

### 6. List Transactions (Admin)

```bash
# All transactions
curl -X GET "${BASE_URL}/airtel/transactions" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# With filters
curl -X GET "${BASE_URL}/airtel/transactions?status=COMPLETED&page=1&limit=10" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# By reference number
curl -X GET "${BASE_URL}/airtel/transactions?referenceNumber=${REF_NUMBER}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

### 7. Get Single Transaction (Admin)

```bash
curl -X GET "${BASE_URL}/airtel/transactions/AIR20260223.1200.002" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

### 8. Retry Failed Transaction (Admin)

```bash
curl -X POST "${BASE_URL}/airtel/transactions/AIR20260223.1200.002/retry" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

### 9. Get Airtel Config (Super Admin)

```bash
curl -X GET "${BASE_URL}/airtel/config" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

### 10. Get Statistics (Admin)

```bash
# Default (last 30 days)
curl -X GET "${BASE_URL}/airtel/statistics" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# With date range
curl -X GET "${BASE_URL}/airtel/statistics?startDate=2026-01-01&endDate=2026-02-23" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## Payment Flow Sequence

```
1. Airtel calls VALIDATE  ──>  UCG checks reference exists, amount valid
                           <──  Returns TS/TF

2. Airtel calls PROCESS   ──>  UCG validates reference
                           ──>  UCG calls PaymentService.createPayment()
                                  ├── CBS GL transfer (must succeed)
                                  ├── Save to `payments` table
                                  ├── Update reference totalPaid
                                  └── Send SP notifications
                           ──>  UCG saves to `airtel_transactions` table
                           <──  Returns TS (with REFID) or TF

3. Airtel calls ENQUIRY   ──>  UCG looks up airtel_transactions by TXNID
   (if needed)             <──  Returns status

4. Airtel calls BILLFETCH ──>  UCG looks up reference, returns bill details
   (optional)              <──  Returns amount, customer name, description

5. Airtel calls LOOKUP    ──>  UCG looks up reference/customer details
   (optional)              <──  Returns customer info
```

---

## Module Files

```
src/modules/airtel/
├── dto/
│   ├── airtel-notification.dto.ts    # 5 request/response DTO pairs + error codes
│   └── airtel-queue.dto.ts           # RabbitMQ message shapes
├── entities/
│   ├── airtel-config.entity.ts       # Config table entity
│   └── airtel-transaction.entity.ts  # Transaction audit trail entity
├── guards/
│   └── airtel-jwt.guard.ts           # JWT HS512 verification
├── airtel.consumer.ts                # RabbitMQ consumer (backup)
├── airtel.controller.ts              # 5 XML + 5 admin endpoints
├── airtel.module.ts                  # Module registration
├── airtel.producer.ts                # RabbitMQ producer (backup)
└── airtel.service.ts                 # Core business logic
```
