# UCG Payment Gateway API Documentation

**Version:** 1.0
**Base URL:** `https://api.ucg.mhb.co.tz/api/v1`
**Environment:** Production

> **Note:** Authentication, request signing, and hashing mechanisms will be covered in a separate security document.

---

## Table of Contents
1. [Reference Generation APIs](#reference-generation-apis)
   - [Single Reference (Synchronous)](#1-single-reference-generation-synchronous)
   - [Single Reference (Asynchronous)](#2-single-reference-generation-asynchronous)
   - [Bulk Reference Generation](#3-bulk-reference-generation)
   - [Check Bulk Status](#4-check-bulk-generation-status)
2. [Payment Posting APIs](#payment-posting-apis)
   - [Query/Validate Reference](#1-queryvalidate-reference-before-payment)
   - [Post Payment](#2-post-payment)
   - [Get Payment Summary](#3-get-payment-summary)
3. [Reconciliation APIs](#reconciliation-apis)
   - [Generate Settlement](#1-generate-settlement)
   - [Get Settlements](#2-get-settlements)
   - [Get Settlement Report](#3-get-settlement-report)
   - [Query Transactions](#4-query-transactions-for-reconciliation)
   - [Mark as Reconciled](#5-mark-settlement-as-reconciled)
   - [Report Discrepancy](#6-report-settlement-discrepancy)
4. [Webhook Notifications](#webhook-notifications)
5. [Error Codes](#error-codes)

---

## Reference Generation APIs

### 1. Single Reference Generation (Synchronous)

Generate a payment reference immediately and receive the reference number in the response.

**Endpoint:** `POST /references`

**Request Body:**
```json
{
  "serviceProviderId": "uuid-here",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "customerEmail": "john.doe@example.com",
  "customerId": "19900505-12345-67890-12",
  "customerIdType": "1",
  "customerAccount": "ACC-2025-00456",
  "amount": 150000,
  "minPaymentAmount": 50000,
  "description": "School fees for Term 1 2025",
  "currency": "TZS",
  "paymentOption": "PARTIAL",
  "workstation": "TERMINAL-002",
  "issuedBy": "Jane Smith",
  "approvedBy": "John Manager",
  "metadata": {
    "studentId": "STD-2025-001",
    "class": "Form 4"
  },
  "lineItems": [
    {
      "serviceDepartment": "3001",
      "serviceType": "140354565431",
      "serviceDescription": "Tuition fees",
      "serviceAmount": 100000,
      "paymentPriority": 1
    },
    {
      "serviceDepartment": "3002",
      "serviceType": "140354565432",
      "serviceDescription": "Boarding fees",
      "serviceAmount": 50000,
      "paymentPriority": 2
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "9113278d-2936-45b5-9891-037dbd0f107e",
  "referenceNumber": "TES-0000001-7FB",
  "serviceProviderId": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "customerEmail": "john.doe@example.com",
  "amount": "150000.00",
  "minPaymentAmount": "50000.00",
  "currency": "TZS",
  "paymentOption": "PARTIAL",
  "status": "ACTIVE",
  "expiresAt": "2025-12-13T06:16:29.855Z",
  "isValid": true,
  "createdAt": "2025-11-13T06:16:29.863Z"
}
```

---

### 2. Single Reference Generation (Asynchronous)

Queue a reference for background processing. Ideal for high-volume scenarios.

**Endpoint:** `POST /references/async`

**Request Body:** *(Same as synchronous request)*

**Response (202 Accepted):**
```json
{
  "status": "QUEUED",
  "requestId": "87e7c6ed-0913-43f9-9339-30978f1f5ce7",
  "message": "Reference creation queued. Processing will complete shortly."
}
```

**Webhook Callback (to your callbackUrl):**
```json
{
  "requestId": "87e7c6ed-0913-43f9-9339-30978f1f5ce7",
  "success": true,
  "referenceNumber": "TES-0000001-7FB",
  "reference": {
    "id": "9113278d-2936-45b5-9891-037dbd0f107e",
    "referenceNumber": "TES-0000001-7FB",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 150000,
    "currency": "TZS",
    "status": "ACTIVE",
    "expiresAt": "2025-12-13T06:16:29.855Z",
    "createdAt": "2025-11-13T06:16:29.863Z"
  },
  "error": null
}
```

---

### 3. Bulk Reference Generation

Generate multiple references in one request. Processed asynchronously.

**Endpoint:** `POST /references/bulk`

**Request Body:**
```json
{
  "serviceProviderId": "uuid-here",
  "defaultExpiryDays": 30,
  "references": [
    {
      "customerName": "John Doe",
      "customerPhone": "+255712345678",
      "customerEmail": "john.doe@example.com",
      "amount": 50000,
      "description": "Invoice #001"
    },
    {
      "customerName": "Jane Smith",
      "customerPhone": "+255723456789",
      "amount": 75000,
      "description": "Invoice #002"
    },
    {
      "customerName": "Bob Johnson",
      "customerPhone": "+255734567890",
      "amount": 100000,
      "description": "Invoice #003"
    }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "status": "QUEUED",
  "requestId": "batch-550e8400-e29b-41d4-a716-446655440000",
  "totalRequested": 3,
  "message": "Bulk reference generation queued. Processing will complete shortly.",
  "estimatedCompletionTime": "2025-01-15T10:35:00Z"
}
```

---

### 4. Check Bulk Generation Status

Check the progress of bulk reference generation.

**Endpoint:** `GET /references/bulk/{batchId}/status`

**Query Parameters:**
- `serviceProviderId` (required)

**Response (200 OK):**
```json
{
  "batchId": "batch-550e8400-e29b-41d4-a716-446655440000",
  "serviceProviderId": "uuid-here",
  "status": "COMPLETED",
  "totalRequested": 100,
  "successCount": 98,
  "failureCount": 2,
  "processingCount": 0,
  "startedAt": "2025-01-15T10:30:00Z",
  "completedAt": "2025-01-15T10:34:30Z",
  "resultFileUrl": "https://storage.ucg.mhb.co.tz/batches/batch-uuid/results.json"
}
```

**Status Values:**
- `PENDING` - Queued, not started
- `PROCESSING` - Currently generating
- `COMPLETED` - All successful
- `PARTIAL` - Some succeeded, some failed
- `FAILED` - All failed

---

## Payment Posting APIs

### 1. Query/Validate Reference (Before Payment)

**IMPORTANT:** Always query and validate the reference before posting payment to ensure it's valid and get payment details.

**Endpoint:** `GET /references/validate/{referenceNumber}`

**Request:**
```
GET /references/validate/TES-0000001-7FB
```

**Response (200 OK) - Valid Reference:**
```json
{
  "isValid": true,
  "referenceNumber": "TES-0000001-7FB",
  "status": "ACTIVE",
  "expiresAt": "2025-12-13T06:16:29.855Z",
  "daysUntilExpiry": 29,
  "reason": "Valid reference",
  "validationChecks": {
    "formatValid": true,
    "checksumValid": true,
    "notExpired": true,
    "notUsed": true,
    "notCancelled": true
  },
  "reference": {
    "referenceNumber": "TES-0000001-7FB",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": "150000.00",
    "totalPaid": "0.00",
    "remainingAmount": 150000,
    "minPaymentAmount": "50000.00",
    "currency": "TZS",
    "paymentOption": "PARTIAL",
    "status": "ACTIVE",
    "isFullyPaid": false,
    "installmentCount": 0,
    "expiresAt": "2025-12-13T06:16:29.855Z"
  }
}
```

**Response (200 OK) - Invalid Reference (Expired):**
```json
{
  "isValid": false,
  "referenceNumber": "TES-0000001-7FB",
  "status": "EXPIRED",
  "expiresAt": "2025-11-12T06:16:29.855Z",
  "daysUntilExpiry": -1,
  "reason": "Reference has expired",
  "validationChecks": {
    "formatValid": true,
    "checksumValid": true,
    "notExpired": false,
    "notUsed": true,
    "notCancelled": true
  }
}
```

**Response (200 OK) - Invalid Reference (Already Used):**
```json
{
  "isValid": false,
  "referenceNumber": "TES-0000001-7FB",
  "status": "USED",
  "reason": "Reference already used",
  "validationChecks": {
    "formatValid": true,
    "checksumValid": true,
    "notExpired": true,
    "notUsed": false,
    "notCancelled": true
  },
  "usedAt": "2025-11-13T06:27:34.103Z",
  "transactionId": "117088a1-859e-4447-ab78-c6ec867fb205"
}
```

**Response (200 OK) - Invalid Format:**
```json
{
  "isValid": false,
  "referenceNumber": "INVALID-REF",
  "status": null,
  "reason": "Invalid reference format",
  "validationChecks": {
    "formatValid": false,
    "checksumValid": false,
    "notExpired": false,
    "notUsed": false,
    "notCancelled": false
  }
}
```

---

### 2. Post Payment

Post a payment against a reference number.

**Endpoint:** `POST /payments`

**Request Body:**
```json
{
  "referenceNumber": "TES-0000001-7FB",
  "payerName": "John Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 50000,
  "currency": "TZS",
  "paymentChannel": "M-Pesa",
  "description": "Partial payment - First installment"
}
```

**Response (200 OK):**
```json
{
  "id": "549ba531-f616-41ff-b6e8-cfccee411f72",
  "referenceNumber": "TES-0000001-7FB",
  "payerName": "John Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 50000,
  "status": "SUCCESS",
  "currency": "TZS",
  "paymentChannel": "M-Pesa",
  "paidAt": "2025-11-13T06:26:46.653Z",
  "reference": {
    "referenceNumber": "TES-0000001-7FB",
    "amount": "150000.00",
    "totalPaid": "50000.00",
    "remainingAmount": 100000,
    "installmentCount": 1,
    "isFullyPaid": false,
    "status": "ACTIVE"
  }
}
```

---

### 3. Get Payment Summary

Retrieve payment history and summary for a reference.

**Endpoint:** `GET /payments/{referenceNumber}/summary`

**Response (200 OK):**
```json
{
  "referenceNumber": "TES-0000001-7FB",
  "invoiceAmount": "150000.00",
  "totalPaid": "150000.00",
  "remainingAmount": 0,
  "installmentCount": 2,
  "paymentOption": "PARTIAL",
  "isFullyPaid": true,
  "status": "USED",
  "payments": [
    {
      "id": "549ba531-f616-41ff-b6e8-cfccee411f72",
      "amountPaid": "50000.00",
      "payerName": "John Doe",
      "paymentChannel": "M-Pesa",
      "paidAt": "2025-11-13T06:26:46.653Z",
      "status": "SUCCESS"
    },
    {
      "id": "117088a1-859e-4447-ab78-c6ec867fb205",
      "amountPaid": "100000.00",
      "payerName": "John Doe",
      "paymentChannel": "Bank",
      "paidAt": "2025-11-13T06:27:34.103Z",
      "status": "SUCCESS"
    }
  ]
}
```

---

## Payment Flow Example

### Typical Payment Flow for Banks/Payment Processors

**Step 1: Customer provides reference number**
- Customer enters reference: `TES-0000001-7FB`

**Step 2: Validate reference before collecting payment**
```bash
GET /references/validate/TES-0000001-7FB
```

**Response:**
```json
{
  "isValid": true,
  "referenceNumber": "TES-0000001-7FB",
  "reference": {
    "customerName": "John Doe",
    "amount": "150000.00",
    "remainingAmount": 150000,
    "minPaymentAmount": "50000.00",
    "paymentOption": "PARTIAL",
    "currency": "TZS"
  }
}
```

**Step 3: Display payment information to customer**
- Show: Customer Name, Amount Due, Minimum Payment (if partial)
- Customer confirms and enters payment amount

**Step 4: Post the payment**
```bash
POST /payments
{
  "referenceNumber": "TES-0000001-7FB",
  "payerName": "John Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 50000,
  "paymentChannel": "M-Pesa"
}
```

**Response:**
```json
{
  "id": "payment-uuid",
  "status": "SUCCESS",
  "reference": {
    "remainingAmount": 100000,
    "isFullyPaid": false
  }
}
```

**Step 5: Display receipt to customer**
- Show: Payment success, remaining balance (if any)

---

## Reconciliation APIs

The Reconciliation APIs enable service providers to match transactions, generate settlements, and track payment reconciliation. These APIs support daily, weekly, or monthly settlement cycles.

### 1. Generate Settlement

Generate a settlement report for a specific period. This creates a settlement record aggregating all successful transactions.

**Endpoint:** `POST /reconciliation/settlements/generate`

**Request Body:**
```json
{
  "serviceProviderId": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "period": "DAILY"
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceProviderId` | UUID | Yes | Service provider ID |
| `periodStart` | Date | Yes | Settlement period start (ISO 8601) |
| `periodEnd` | Date | Yes | Settlement period end (ISO 8601) |
| `period` | Enum | Yes | DAILY, WEEKLY, MONTHLY, CUSTOM |

**Response (201 Created):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "settlementNumber": "SET-20250131-00001",
  "serviceProviderId": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
  "settlementDate": "2025-01-31",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "period": "MONTHLY",
  "totalTransactions": 150,
  "successfulTransactions": 150,
  "failedTransactions": 0,
  "totalAmount": "15000000.00",
  "totalFees": "150000.00",
  "netSettlement": "14850000.00",
  "currency": "TZS",
  "status": "PENDING",
  "isReconciled": false,
  "createdAt": "2025-01-31T23:59:59Z"
}
```

---

### 2. Get Settlements

Query settlements for a service provider with optional filters.

**Endpoint:** `GET /reconciliation/settlements`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serviceProviderId` | UUID | Yes | Service provider ID |
| `startDate` | Date | No | Filter by period start date |
| `endDate` | Date | No | Filter by period end date |
| `status` | Enum | No | PENDING, PROCESSING, COMPLETED, FAILED, DISPUTED |
| `isReconciled` | Boolean | No | Filter by reconciliation status |

**Example Request:**
```
GET /reconciliation/settlements?serviceProviderId=58bfe4aa-0843-47ea-8a19-467f702aebc4&startDate=2025-01-01&endDate=2025-01-31&status=PENDING
```

**Response (200 OK):**
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "settlementNumber": "SET-20250131-00001",
    "settlementDate": "2025-01-31",
    "periodStart": "2025-01-01",
    "periodEnd": "2025-01-31",
    "period": "MONTHLY",
    "totalTransactions": 150,
    "totalAmount": "15000000.00",
    "netSettlement": "14850000.00",
    "currency": "TZS",
    "status": "PENDING",
    "isReconciled": false
  },
  {
    "id": "7ba85f64-8821-4562-b3fc-2c963f66bcd2",
    "settlementNumber": "SET-20241231-00001",
    "settlementDate": "2024-12-31",
    "periodStart": "2024-12-01",
    "periodEnd": "2024-12-31",
    "totalTransactions": 200,
    "totalAmount": "20000000.00",
    "netSettlement": "19800000.00",
    "status": "COMPLETED",
    "isReconciled": true
  }
]
```

---

### 3. Get Settlement Report

Retrieve comprehensive settlement report with all transactions and summary.

**Endpoint:** `GET /reconciliation/settlements/{settlementId}/report`

**Path Parameters:**
- `settlementId` - Settlement UUID

**Response (200 OK):**
```json
{
  "settlement": {
    "settlementNumber": "SET-20250131-00001",
    "period": "MONTHLY",
    "periodStart": "2025-01-01",
    "periodEnd": "2025-01-31",
    "settlementDate": "2025-01-31",
    "status": "PENDING",
    "isReconciled": false
  },
  "transactions": [
    {
      "paymentId": "549ba531-f616-41ff-b6e8-cfccee411f72",
      "referenceNumber": "TES-0000001-7FB",
      "customerName": "John Doe",
      "payerPhone": "+255712345678",
      "amountPaid": 50000,
      "paymentChannel": "M-Pesa",
      "paidAt": "2025-01-15T10:30:00Z",
      "status": "SUCCESS"
    },
    {
      "paymentId": "117088a1-859e-4447-ab78-c6ec867fb205",
      "referenceNumber": "TES-0000002-8GC",
      "customerName": "Jane Smith",
      "payerPhone": "+255723456789",
      "amountPaid": 100000,
      "paymentChannel": "Bank",
      "paidAt": "2025-01-16T14:20:00Z",
      "status": "SUCCESS"
    }
  ],
  "summary": {
    "totalTransactions": 150,
    "totalAmount": 15000000,
    "totalFees": 150000,
    "netSettlement": 14850000,
    "currency": "TZS",
    "byChannel": [
      {
        "channel": "M-Pesa",
        "count": 80,
        "amount": 8000000
      },
      {
        "channel": "Bank",
        "count": 70,
        "amount": 7000000
      }
    ]
  }
}
```

---

### 4. Query Transactions for Reconciliation

Get detailed transaction data for reconciliation matching.

**Endpoint:** `GET /reconciliation/transactions`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serviceProviderId` | UUID | Yes | Service provider ID |
| `startDate` | DateTime | Yes | Transaction start date/time (ISO 8601) |
| `endDate` | DateTime | Yes | Transaction end date/time (ISO 8601) |
| `status` | String | No | Filter by payment status (SUCCESS, FAILED) |
| `paymentChannel` | String | No | Filter by payment channel |

**Example Request:**
```
GET /reconciliation/transactions?serviceProviderId=58bfe4aa-0843-47ea-8a19-467f702aebc4&startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z&status=SUCCESS
```

**Response (200 OK):**
```json
[
  {
    "paymentId": "549ba531-f616-41ff-b6e8-cfccee411f72",
    "referenceNumber": "TES-0000001-7FB",
    "payerName": "John Doe",
    "payerPhone": "+255712345678",
    "amountPaid": "50000.00",
    "currency": "TZS",
    "paymentChannel": "M-Pesa",
    "status": "SUCCESS",
    "paidAt": "2025-01-15T10:30:00Z",
    "reference": {
      "customerName": "John Doe",
      "amount": "150000.00"
    }
  },
  {
    "paymentId": "117088a1-859e-4447-ab78-c6ec867fb205",
    "referenceNumber": "TES-0000002-8GC",
    "payerName": "Jane Smith",
    "payerPhone": "+255723456789",
    "amountPaid": "100000.00",
    "currency": "TZS",
    "paymentChannel": "Bank",
    "status": "SUCCESS",
    "paidAt": "2025-01-16T14:20:00Z",
    "reference": {
      "customerName": "Jane Smith",
      "amount": "100000.00"
    }
  }
]
```

---

### 5. Mark Settlement as Reconciled

Confirm that a settlement has been successfully reconciled.

**Endpoint:** `PATCH /reconciliation/settlements/{settlementId}/reconcile`

**Path Parameters:**
- `settlementId` - Settlement UUID

**Request Body:**
```json
{
  "reconciledBy": "finance@serviceprovider.com"
}
```

**Response (200 OK):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "settlementNumber": "SET-20250131-00001",
  "status": "COMPLETED",
  "isReconciled": true,
  "reconciledAt": "2025-02-01T09:15:00Z",
  "reconciledBy": "finance@serviceprovider.com",
  "netSettlement": "14850000.00"
}
```

---

### 6. Report Settlement Discrepancy

Report a discrepancy or dispute for a settlement.

**Endpoint:** `POST /reconciliation/settlements/{settlementId}/dispute`

**Path Parameters:**
- `settlementId` - Settlement UUID

**Request Body:**
```json
{
  "details": "Amount mismatch: Expected 15,000,000 TZS but received 14,950,000 TZS in bank account. Missing 50,000 TZS from 2 transactions."
}
```

**Response (200 OK):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "settlementNumber": "SET-20250131-00001",
  "status": "DISPUTED",
  "notes": "Amount mismatch: Expected 15,000,000 TZS but received 14,950,000 TZS in bank account. Missing 50,000 TZS from 2 transactions.",
  "netSettlement": "14850000.00"
}
```

---

## Reconciliation Flow Example

### Typical Reconciliation Flow for Service Providers

**Step 1: Automatic Settlement Generation**
- UCG generates daily/weekly/monthly settlements
- Settlements created at end of period

**Step 2: Service Provider Receives Notification**
- Email/SMS notification of new settlement
- Contains settlement number and amount

**Step 3: Query Settlement Details**
```bash
GET /reconciliation/settlements/{settlementId}/report
```

**Step 4: Download Transaction Data**
```bash
GET /reconciliation/transactions?serviceProviderId=xxx&startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z
```

**Step 5: Match with Internal Records**
- Compare transaction count
- Verify total amounts
- Match individual transactions by reference number

**Step 6A: If Matched - Confirm Reconciliation**
```bash
PATCH /reconciliation/settlements/{settlementId}/reconcile
{
  "reconciledBy": "finance@serviceprovider.com"
}
```

**Step 6B: If Mismatch - Report Discrepancy**
```bash
POST /reconciliation/settlements/{settlementId}/dispute
{
  "details": "Amount mismatch details..."
}
```

**Step 7: Settlement Processing**
- UCG team investigates disputed settlements
- Resolved settlements move to COMPLETED status
- Funds transferred to service provider account

---

## Settlement Number Format

All settlement numbers follow this format:

**Format:** `SET-YYYYMMDD-XXXXX`

- **SET** = Settlement prefix
- **YYYYMMDD** = Settlement date (ISO date format)
- **XXXXX** = Sequential number (5 digits)

**Example:** `SET-20250131-00001`

---

## Webhook Notifications

UCG sends webhook notifications for asynchronous operations.

### Payment Notification Callback

**Endpoint:** `POST {your-webhook-url}`

**Payload:**
```json
{
  "paymentId": "549ba531-f616-41ff-b6e8-cfccee411f72",
  "referenceNumber": "TES-0000001-7FB",
  "amountPaid": 50000,
  "status": "SUCCESS",
  "serviceProviderId": "uuid-here",
  "notificationType": "WEBHOOK",
  "payment": {
    "id": "549ba531-f616-41ff-b6e8-cfccee411f72",
    "payerName": "John Doe",
    "payerPhone": "+255712345678",
    "amountPaid": 50000,
    "currency": "TZS",
    "paymentChannel": "M-Pesa",
    "paidAt": "2025-11-13T06:26:46.653Z"
  },
  "reference": {
    "referenceNumber": "TES-0000001-7FB",
    "amount": "150000.00",
    "totalPaid": "50000.00",
    "remainingAmount": 100000,
    "isFullyPaid": false,
    "status": "ACTIVE"
  },
  "timestamp": "2025-11-13T06:26:46.653Z"
}
```

**Your Expected Response:**
```json
HTTP/1.1 200 OK

{
  "received": true,
  "message": "Payment notification processed successfully"
}
```

---

## Field Specifications

### Required Fields - Reference Generation

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `serviceProviderId` | UUID | Your service provider ID | "uuid-here" |
| `customerName` | String | Customer full name (max 200) | "John Doe" |
| `customerPhone` | String | Customer phone (max 15) | "+255712345678" |
| `amount` | Number | Invoice amount (min 100) | 150000 |

### Optional Fields - Reference Generation

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `customerEmail` | String | Customer email | null |
| `customerId` | String | National ID/Passport | null |
| `customerIdType` | String | ID type (1=NID, 2=Passport) | null |
| `customerAccount` | String | Account with SP | null |
| `minPaymentAmount` | Number | Minimum payment allowed | null |
| `description` | String | Payment description | null |
| `currency` | String | Currency code | "TZS" |
| `paymentOption` | Enum | Payment option (see below) | "COMPLETE" |
| `metadata` | Object | Additional data | {} |
| `lineItems` | Array | Service breakdown | [] |
| `callbackUrl` | URL | Webhook URL for async | null |

### Payment Options

| Option | Description | Example |
|--------|-------------|---------|
| `COMPLETE` | Single payment ≥ invoice amount | Pay 150,000 for 150,000 invoice |
| `PARTIAL` | One or more payments, last must complete balance | Pay 50,000 then 100,000 for 150,000 invoice |
| `PRECISE` | Single payment exactly = invoice amount | Pay exactly 150,000 for 150,000 invoice |
| `LIMITED` | Multiple payments ≤ invoice, last must be exact | Pay 50,000, 50,000, then exactly 50,000 |
| `PERPETUAL` | Any number of payments, any amounts | Multiple small payments accepted |

### Required Fields - Payment Posting

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `referenceNumber` | String | Payment reference | "TES-0000001-7FB" |
| `payerName` | String | Payer name (max 200) | "John Doe" |
| `payerPhone` | String | Payer phone (max 15) | "+255712345678" |
| `amountPaid` | Number | Amount paid (min 100) | 50000 |
| `paymentChannel` | String | Payment method (max 10) | "M-Pesa", "Bank" |

### Optional Fields - Payment Posting

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `currency` | String | Currency code | "TZS" |
| `description` | String | Payment description (max 255) | null |

---

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `202` | Accepted (queued for processing) |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized |
| `404` | Not Found |
| `500` | Internal Server Error |

### Common Error Responses

**Invalid Reference:**
```json
{
  "statusCode": 400,
  "message": "Invalid reference number",
  "error": "Bad Request"
}
```

**Reference Expired:**
```json
{
  "statusCode": 400,
  "message": "Reference is not valid. Status: EXPIRED",
  "error": "Bad Request"
}
```

**Payment Validation Failed:**
```json
{
  "statusCode": 400,
  "message": "Payment not allowed: PARTIAL option requires final payment >= 100000",
  "error": "Bad Request"
}
```

**Reference Already Paid:**
```json
{
  "statusCode": 400,
  "message": "Reference has been fully paid. No further payments accepted.",
  "error": "Bad Request"
}
```

---

## Reference Number Format

All generated references follow this format:

**Format:** `XXX-YYYYYYY-ZZZ`

- **XXX** = Service Provider Code (3 characters)
- **YYYYYYY** = Sequential number (7 digits)
- **ZZZ** = Checksum (3 characters, uppercase alphanumeric)

**Example:** `TES-0000001-7FB`

---

## Contact & Support

**Technical Support:**
Email: support@ucg.mhb.co.tz
Phone: +255 XXX XXX XXX

**Integration Assistance:**
Email: integration@ucg.mhb.co.tz

**Production Access:**
Contact your account manager to obtain:
- Service Provider ID
- API Credentials
- Webhook Configuration

---

**Document Version:** 1.2
**Last Updated:** November 13, 2025
**Changes in v1.2:** Streamlined Reconciliation APIs - removed dashboard, focused on settlement reports
**Changes in v1.1:** Added Reconciliation APIs section
**Next Review:** Authentication & Security Documentation
