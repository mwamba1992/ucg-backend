# UCG Service Provider API Documentation

## Overview

The Universal Collection Gateway (UCG) Service Provider API enables service providers (schools, hospitals, utilities, etc.) to integrate payment collection functionality into their systems. This API allows you to:

- Generate payment references for customers (single and bulk)
- Track payment status and history
- Receive payment notifications
- Manage reference lifecycles (extend, cancel)
- Access reconciliation data for settlements

**Version:** 1.0.0
**Base URL (Production):** `https://api.ucg.mhb.co.tz/api/v1`
**Base URL (Testing):** `http://192.168.1.94:8000/api/v1`

---

## Table of Contents

1. [Authentication & Security](#authentication--security)
2. [Reference Generation](#reference-generation)
   - [Single Reference Generation](#1-generate-single-reference)
   - [Bulk Reference Generation](#2-bulk-reference-generation)
   - [Bulk Status Tracking](#3-check-bulk-generation-status)
3. [Reference Management](#reference-management)
   - [List References](#1-list-references)
   - [Get Reference Details](#2-get-reference-details)
   - [Update Reference](#3-update-reference)
   - [Extend Reference Expiry](#4-extend-reference-expiry)
   - [Cancel Reference](#5-cancel-reference)
   - [Validate Reference](#6-validate-reference)
4. [Payment Notifications](#payment-notifications)
5. [Reconciliation](#reconciliation)
6. [Error Handling](#error-handling)
7. [Rate Limits](#rate-limits)
8. [Webhooks](#webhooks)
9. [Code Examples](#code-examples)

---

## Authentication & Security

### OAuth 2.0 Password Grant

UCG uses **OAuth 2.0 Password Grant** flow for service provider authentication. Credentials are rotated every **3 months** for security purposes.

### Credential Lifecycle

- **Initial Credentials:** Provided upon service provider approval
- **Rotation Schedule:** Every 90 days (3 months)
- **Rotation Notification:** Email notification 14 days before expiration
- **Grace Period:** 7 days after expiration before old credentials are disabled
- **Secure Delivery:** New credentials sent via encrypted email

### Authentication Endpoint

**POST** `/auth/sp/login`

**Request:**
```json
{
  "email": "your-sp-email@example.com",
  "password": "your-secure-password"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlZGVhZmY2OS1iMjQwLTQ3NWUtOGEwNy0xMDNlNzljNmE5OTYiLCJlbWFpbCI6InlvdXItc3AtZW1haWxAZXhhbXBsZS5jb20iLCJzcENvZGUiOiJUQU4iLCJ0eXBlIjoiU0VSVklDRV9QUk9WSURFUiIsImlhdCI6MTczNjM4ODEyNywiZXhwIjoxNzM2Mzg5MDI3fQ.ViMoc6ya01BAqu279iK50j-7fo-lbEpEqb4BzXeVwGw",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "serviceProvider": {
    "id": "edeaff69-b240-475e-8a07-103e79c6a996",
    "spCode": "TAN",
    "businessName": "Tanzania National Hospital",
    "businessType": "HOSPITAL",
    "email": "your-sp-email@example.com",
    "phoneNumber": "+255712345678",
    "status": "APPROVED",
    "isActive": true
  }
}
```

### Token Details

| Token Type | Lifetime | Usage |
|------------|----------|-------|
| **Access Token** | 15 minutes | Include in `Authorization` header for all API calls |
| **Refresh Token** | 7 days | Use to obtain new access token without re-authentication |

### Using Access Tokens

All API requests must include the access token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh (Optional)

**POST** `/auth/refresh`

```json
{
  "userId": "your-service-provider-id",
  "refreshToken": "your-refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "new-access-token"
}
```

### Security Best Practices

1. **Credential Storage:**
   - Store credentials in environment variables or secure vaults (e.g., AWS Secrets Manager, HashiCorp Vault)
   - Never commit credentials to version control
   - Use different credentials for development and production

2. **Token Management:**
   - Implement automatic token refresh logic
   - Clear tokens from memory when no longer needed
   - Handle 401 errors by re-authenticating

3. **HTTPS Only:**
   - All API calls must use HTTPS in production
   - Never send credentials over unencrypted connections

4. **IP Whitelisting:**
   - UCG can whitelist your server IPs for additional security
   - Contact support to configure IP restrictions

5. **Credential Rotation:**
   - Monitor credential expiration dates
   - Test new credentials before old ones expire
   - Update all systems during grace period

---

## Reference Generation

### 1. Generate Single Reference

Create a payment reference for a single customer synchronously.

**Endpoint:** `POST /sp/references`

**Headers:**
```http
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 150000,
  "description": "Hospital consultation and lab tests",
  "expiresAt": "2026-01-31T23:59:59.000Z",
  "paymentOption": "FULL",
  "metadata": {
    "patientId": "PT-2025-001234",
    "department": "Outpatient",
    "invoiceNumber": "INV-2025-5678"
  }
}
```

**Field Descriptions:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `customerName` | string | Yes | Full name of customer | "John Doe" |
| `customerPhone` | string | Yes | Customer phone (E.164 format) | "+255712345678" |
| `amount` | number | Yes | Payment amount in TZS | 150000 |
| `description` | string | No | Purpose of payment | "School fees Term 1" |
| `expiresAt` | string (ISO 8601) | No | Expiration date (default: 30 days) | "2026-01-31T23:59:59.000Z" |
| `paymentOption` | enum | No | Payment type: `FULL` or `INSTALLMENT` | "FULL" |
| `metadata` | object | No | Custom data (max 5KB) | `{ "orderId": "12345" }` |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Payment reference generated successfully",
  "data": {
    "id": "7d833986-dae7-4c1f-922c-c71e88315920",
    "referenceNumber": "TAN-0000001-B18",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 150000,
    "description": "Hospital consultation and lab tests",
    "status": "ACTIVE",
    "paymentOption": "FULL",
    "expiresAt": "2026-01-31T23:59:59.000Z",
    "createdAt": "2025-12-27T10:30:00.000Z",
    "metadata": {
      "patientId": "PT-2025-001234",
      "department": "Outpatient",
      "invoiceNumber": "INV-2025-5678"
    }
  }
}
```

**Reference Number Format:**
- Format: `{SP_CODE}-{SEQUENCE}-{CHECKSUM}`
- Example: `TAN-0000001-B18`
- `TAN`: Service provider code
- `0000001`: Sequential number
- `B18`: Checksum for validation

**cURL Example:**
```bash
curl -X POST https://api.ucg.mhb.co.tz/api/v1/sp/references \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 150000,
    "description": "Hospital consultation",
    "paymentOption": "FULL"
  }'
```

---

### 2. Bulk Reference Generation

Generate up to 1,000 references in a single request. Processing is asynchronous.

**Endpoint:** `POST /sp/references/bulk`

**Headers:**
```http
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "references": [
    {
      "customerName": "John Doe",
      "customerPhone": "+255712345678",
      "amount": 50000,
      "description": "School fees - Form 1A",
      "metadata": { "class": "Form 1A", "studentId": "STD-001" }
    },
    {
      "customerName": "Jane Smith",
      "customerPhone": "+255712345679",
      "amount": 75000,
      "description": "School fees - Form 2B",
      "metadata": { "class": "Form 2B", "studentId": "STD-002" }
    }
  ]
}
```

**Constraints:**
- Maximum: 1,000 references per request
- Request timeout: 30 seconds
- Processing: Asynchronous via background jobs

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Bulk reference generation initiated",
  "data": {
    "batchId": "batch-a7b8c9d0-e1f2-3456-7890-abcdef123456",
    "totalRequested": 2,
    "status": "PROCESSING",
    "estimatedCompletionTime": "2025-12-27T10:35:00.000Z"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Maximum 1000 references per bulk request"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://api.ucg.mhb.co.tz/api/v1/sp/references/bulk \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "references": [
      {
        "customerName": "John Doe",
        "customerPhone": "+255712345678",
        "amount": 50000
      },
      {
        "customerName": "Jane Smith",
        "customerPhone": "+255712345679",
        "amount": 75000
      }
    ]
  }'
```

---

### 3. Check Bulk Generation Status

Track the progress of a bulk generation job.

**Endpoint:** `GET /sp/references/bulk/:batchId`

**Response (200 OK):**

**While Processing:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch-a7b8c9d0-e1f2-3456-7890-abcdef123456",
    "status": "PROCESSING",
    "summary": {
      "totalRequested": 1000,
      "successCount": 650,
      "failureCount": 10,
      "processingCount": 340
    },
    "progress": 66,
    "startedAt": "2025-12-27T10:30:00.000Z",
    "completedAt": null,
    "downloadUrl": null
  }
}
```

**Completed:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch-a7b8c9d0-e1f2-3456-7890-abcdef123456",
    "status": "COMPLETED",
    "summary": {
      "totalRequested": 1000,
      "successCount": 998,
      "failureCount": 2,
      "processingCount": 0
    },
    "progress": 100,
    "startedAt": "2025-12-27T10:30:00.000Z",
    "completedAt": "2025-12-27T10:35:00.000Z",
    "downloadUrl": "https://api.ucg.mhb.co.tz/api/v1/sp/references/bulk/batch-a7b8c9d0/download"
  }
}
```

**Batch Status Types:**
- `PROCESSING`: Job is running
- `COMPLETED`: All references processed
- `FAILED`: Job failed (contact support)
- `PARTIAL`: Some references succeeded

### 4. Download Bulk Results

Download results of a completed bulk generation.

**Endpoint:** `GET /sp/references/bulk/:batchId/download?format=csv`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | string | No | `csv` | Output format: `csv` or `json` |

**CSV Format:**
```csv
status,referenceNumber,customerName,customerPhone,amount,error
SUCCESS,TAN-0000001-B18,John Doe,+255712345678,50000,
SUCCESS,TAN-0000002-C24,Jane Smith,+255712345679,75000,
FAILED,,,+255712345680,60000,Invalid phone number format
```

**JSON Format:**
```json
{
  "batchId": "batch-a7b8c9d0-e1f2-3456-7890-abcdef123456",
  "results": [
    {
      "status": "SUCCESS",
      "referenceNumber": "TAN-0000001-B18",
      "customerName": "John Doe",
      "customerPhone": "+255712345678",
      "amount": 50000,
      "error": null
    },
    {
      "status": "FAILED",
      "referenceNumber": null,
      "customerName": "Invalid User",
      "customerPhone": "+255712345680",
      "amount": 60000,
      "error": "Invalid phone number format"
    }
  ]
}
```

---

## Reference Management

### 1. List References

Retrieve a paginated list of references with filtering.

**Endpoint:** `GET /sp/references`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page (max: 100) |
| `status` | string | No | - | Filter by status: `ACTIVE`, `USED`, `EXPIRED`, `CANCELLED` |
| `search` | string | No | - | Search by customer name, phone, or reference number |
| `startDate` | string | No | - | Filter by creation date (ISO 8601) |
| `endDate` | string | No | - | Filter by creation date (ISO 8601) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "7d833986-dae7-4c1f-922c-c71e88315920",
        "referenceNumber": "TAN-0000001-B18",
        "customerName": "John Doe",
        "customerPhone": "+255712345678",
        "amount": 150000,
        "status": "ACTIVE",
        "paymentOption": "FULL",
        "expiresAt": "2026-01-31T23:59:59.000Z",
        "createdAt": "2025-12-27T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

**Example Requests:**
```bash
# Get all active references
curl "https://api.ucg.mhb.co.tz/api/v1/sp/references?status=ACTIVE" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Search for references by customer name
curl "https://api.ucg.mhb.co.tz/api/v1/sp/references?search=John" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get references for December 2025
curl "https://api.ucg.mhb.co.tz/api/v1/sp/references?startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-31T23:59:59.000Z" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 2. Get Reference Details

Retrieve detailed information about a specific reference.

**Endpoint:** `GET /sp/references/:referenceNumber`

**Path Parameters:**
- `referenceNumber`: The reference number (e.g., `TAN-0000001-B18`)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "7d833986-dae7-4c1f-922c-c71e88315920",
    "referenceNumber": "TAN-0000001-B18",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 150000,
    "description": "Hospital consultation and lab tests",
    "status": "ACTIVE",
    "paymentOption": "FULL",
    "expiresAt": "2026-01-31T23:59:59.000Z",
    "createdAt": "2025-12-27T10:30:00.000Z",
    "updatedAt": "2025-12-27T10:30:00.000Z",
    "metadata": {
      "patientId": "PT-2025-001234",
      "department": "Outpatient"
    }
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "REFERENCE_NOT_FOUND",
    "message": "Reference not found or you do not have permission to access it"
  }
}
```

---

### 3. Update Reference

Update reference details. Only allowed for **unpaid** references (status: `ACTIVE`).

**Endpoint:** `PATCH /sp/references/:referenceNumber`

**Request Body:**
```json
{
  "customerName": "John Doe Updated",
  "customerPhone": "+255712345679",
  "amount": 175000,
  "description": "Updated description"
}
```

**Updatable Fields:**
- `customerName`
- `customerPhone`
- `amount`
- `description`
- `metadata`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reference updated successfully",
  "data": {
    "id": "7d833986-dae7-4c1f-922c-c71e88315920",
    "referenceNumber": "TAN-0000001-B18",
    "customerName": "John Doe Updated",
    "customerPhone": "+255712345679",
    "amount": 175000,
    "status": "ACTIVE",
    "updatedAt": "2025-12-27T11:00:00.000Z"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_UPDATE_REFERENCE",
    "message": "Cannot update used reference"
  }
}
```

---

### 4. Extend Reference Expiry

Extend the expiration date of an active reference.

**Endpoint:** `PATCH /sp/references/:referenceNumber/extend`

**Request Body:**
```json
{
  "additionalDays": 30
}
```

**Field Descriptions:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `additionalDays` | number | Yes | Number of days to extend (1-365) |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reference expiry extended successfully",
  "data": {
    "referenceNumber": "TAN-0000001-B18",
    "oldExpiryDate": "2026-01-31T23:59:59.000Z",
    "newExpiryDate": "2026-03-02T23:59:59.000Z",
    "extendedBy": 30,
    "extendedAt": "2025-12-27T11:00:00.000Z"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_EXTEND_REFERENCE",
    "message": "Cannot extend expired or used reference"
  }
}
```

**cURL Example:**
```bash
curl -X PATCH "https://api.ucg.mhb.co.tz/api/v1/sp/references/TAN-0000001-B18/extend" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"additionalDays": 30}'
```

---

### 5. Cancel Reference

Cancel an active reference. Cannot be used for payment after cancellation.

**Endpoint:** `POST /sp/references/:referenceNumber/cancel`

**Request Body:**
```json
{
  "reason": "Customer requested refund"
}
```

**Field Descriptions:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | No | Reason for cancellation (max 500 characters) |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reference cancelled successfully",
  "data": {
    "referenceNumber": "TAN-0000001-B18",
    "status": "CANCELLED",
    "cancelledAt": "2025-12-27T11:00:00.000Z",
    "reason": "Customer requested refund"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_CANCEL_REFERENCE",
    "message": "Cannot cancel reference that has already been used for payment"
  }
}
```

**Valid Cancellation Conditions:**
- Reference status must be `ACTIVE` or `EXPIRED`
- Reference must not have any successful payments
- Service provider must own the reference

---

### 6. Validate Reference

Validate a reference before giving it to a customer.

**Endpoint:** `GET /sp/references/:referenceNumber/validate`

**Response (200 OK - Valid):**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "referenceNumber": "TAN-0000001-B18",
    "status": "ACTIVE",
    "expiresAt": "2026-01-31T23:59:59.000Z",
    "message": "Reference is valid and ready for payment"
  }
}
```

**Response (200 OK - Invalid):**
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "referenceNumber": "TAN-0000001-B18",
    "status": "EXPIRED",
    "expiresAt": "2025-12-01T23:59:59.000Z",
    "message": "Reference has expired"
  }
}
```

---

## Payment Notifications

UCG provides payment data through **pull** and **push** mechanisms.

### Pull: Query Payments

Retrieve payment information by polling the API.

**Endpoint:** `GET /sp/payments`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `status` | string | Filter by status: `SUCCESS`, `PENDING`, `FAILED` |
| `startDate` | string (ISO 8601) | Filter payments from this date |
| `endDate` | string (ISO 8601) | Filter payments until this date |
| `search` | string | Search by reference, payer name, or phone |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "referenceNumber": "TAN-0000001-B18",
        "amountPaid": 150000,
        "payerName": "John Doe",
        "payerPhone": "+255712345678",
        "paymentChannel": "MPESA",
        "transactionId": "QAB12345XYZ",
        "status": "SUCCESS",
        "currency": "TZS",
        "paidAt": "2025-12-27T12:30:00.000Z",
        "updatedAt": "2025-12-27T12:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 850,
      "totalPages": 43,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Get Payment by Reference

**Endpoint:** `GET /sp/payments/reference/:referenceNumber`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "referenceNumber": "TAN-0000001-B18",
    "payments": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "amountPaid": 75000,
        "payerName": "John Doe",
        "payerPhone": "+255712345678",
        "paymentChannel": "MPESA",
        "transactionId": "QAB12345XYZ",
        "status": "SUCCESS",
        "paidAt": "2025-12-27T12:30:00.000Z"
      },
      {
        "id": "c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8",
        "amountPaid": 75000,
        "payerName": "John Doe",
        "payerPhone": "+255712345678",
        "paymentChannel": "MPESA",
        "transactionId": "QAB67890ABC",
        "status": "SUCCESS",
        "paidAt": "2025-12-28T10:15:00.000Z"
      }
    ],
    "totalPaid": 150000,
    "paymentCount": 2
  }
}
```

### Get Payment Summary

Get detailed payment summary including installment tracking.

**Endpoint:** `GET /sp/payments/reference/:referenceNumber/summary`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "referenceNumber": "TAN-0000001-B18",
    "invoiceAmount": 150000,
    "totalPaid": 150000,
    "remainingAmount": 0,
    "installmentCount": 2,
    "paymentOption": "INSTALLMENT",
    "isFullyPaid": true,
    "status": "USED",
    "payments": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "amountPaid": 75000,
        "payerName": "John Doe",
        "paymentChannel": "MPESA",
        "paidAt": "2025-12-27T12:30:00.000Z",
        "status": "SUCCESS"
      },
      {
        "id": "c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8",
        "amountPaid": 75000,
        "payerName": "John Doe",
        "paymentChannel": "MPESA",
        "paidAt": "2025-12-28T10:15:00.000Z",
        "status": "SUCCESS"
      }
    ]
  }
}
```

### Payment Statistics

**Endpoint:** `GET /sp/payments/statistics`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string (ISO 8601) | Filter start date |
| `endDate` | string (ISO 8601) | Filter end date |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalPayments": 850,
    "totalAmount": 42500000,
    "averagePaymentAmount": 50000,
    "successfulPayments": 837,
    "failedPayments": 13,
    "successRate": 98.47,
    "paymentsByChannel": {
      "MPESA": { "count": 450, "amount": 22500000 },
      "TIGOPESA": { "count": 250, "amount": 12500000 },
      "AIRTEL": { "count": 150, "amount": 7500000 }
    },
    "recentPayments": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "referenceNumber": "TAN-0000001-B18",
        "amountPaid": 50000,
        "payerName": "John Doe",
        "paymentChannel": "MPESA",
        "status": "SUCCESS",
        "paidAt": "2025-12-27T12:30:00.000Z"
      }
    ]
  }
}
```

### Push: Webhooks (Coming Soon)

UCG will support webhook notifications for real-time payment updates. Contact support to register your webhook endpoint.

**Webhook Event:**
```json
{
  "event": "payment.success",
  "timestamp": "2025-12-27T12:30:00.000Z",
  "data": {
    "referenceNumber": "TAN-0000001-B18",
    "paymentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "amountPaid": 150000,
    "payerName": "John Doe",
    "payerPhone": "+255712345678",
    "paymentChannel": "MPESA",
    "transactionId": "QAB12345XYZ",
    "paidAt": "2025-12-27T12:30:00.000Z"
  }
}
```

---

## Reconciliation

### Get Settlements

Retrieve settlement records for reconciliation.

**Endpoint:** `GET /reconciliation/settlements`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `serviceProviderId` | string (UUID) | Your service provider ID |
| `status` | string | Filter by status: `PENDING`, `RECONCILED`, `DISPUTED` |
| `startDate` | string (ISO 8601) | Settlement period start |
| `endDate` | string (ISO 8601) | Settlement period end |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "settlementId": "SETTLE-2025-12-001",
        "periodStart": "2025-12-01T00:00:00.000Z",
        "periodEnd": "2025-12-31T23:59:59.000Z",
        "totalTransactions": 850,
        "totalAmount": 42500000,
        "commissionAmount": 1062500,
        "netAmount": 41437500,
        "status": "PENDING",
        "createdAt": "2025-12-31T23:59:59.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 12,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

### Get Settlement Details

**Endpoint:** `GET /reconciliation/settlements/:settlementId`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "settlementId": "SETTLE-2025-12-001",
    "periodStart": "2025-12-01T00:00:00.000Z",
    "periodEnd": "2025-12-31T23:59:59.000Z",
    "totalTransactions": 850,
    "totalAmount": 42500000,
    "commissionRate": 2.5,
    "commissionAmount": 1062500,
    "netAmount": 41437500,
    "status": "PENDING",
    "bankAccount": {
      "bankName": "CRDB Bank",
      "accountNumber": "0150********789",
      "accountName": "Tanzania National Hospital"
    },
    "createdAt": "2025-12-31T23:59:59.000Z",
    "reconciledAt": null,
    "reconciledBy": null
  }
}
```

### Download Settlement Report

**Endpoint:** `GET /reconciliation/settlements/:settlementId/report`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "settlementId": "SETTLE-2025-12-001",
    "periodStart": "2025-12-01T00:00:00.000Z",
    "periodEnd": "2025-12-31T23:59:59.000Z",
    "summary": {
      "totalTransactions": 850,
      "totalAmount": 42500000,
      "commissionAmount": 1062500,
      "netAmount": 41437500
    },
    "transactions": [
      {
        "date": "2025-12-27T12:30:00.000Z",
        "referenceNumber": "TAN-0000001-B18",
        "payerName": "John Doe",
        "amount": 150000,
        "channel": "MPESA",
        "transactionId": "QAB12345XYZ",
        "commission": 3750
      }
    ],
    "downloadLinks": {
      "pdf": "https://api.ucg.mhb.co.tz/api/v1/reconciliation/settlements/a1b2c3d4/report.pdf",
      "excel": "https://api.ucg.mhb.co.tz/api/v1/reconciliation/settlements/a1b2c3d4/report.xlsx",
      "csv": "https://api.ucg.mhb.co.tz/api/v1/reconciliation/settlements/a1b2c3d4/report.csv"
    }
  }
}
```

### Mark Settlement as Reconciled

**Endpoint:** `PATCH /reconciliation/settlements/:settlementId/reconcile`

**Request Body:**
```json
{
  "reconciledBy": "Finance Manager Name"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Settlement marked as reconciled",
  "data": {
    "settlementId": "SETTLE-2025-12-001",
    "status": "RECONCILED",
    "reconciledAt": "2026-01-05T10:00:00.000Z",
    "reconciledBy": "Finance Manager Name"
  }
}
```

### Report Settlement Discrepancy

**Endpoint:** `POST /reconciliation/settlements/:settlementId/dispute`

**Request Body:**
```json
{
  "details": "Found 5 missing transactions totaling TZS 250,000. Details attached."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Discrepancy reported successfully",
  "data": {
    "settlementId": "SETTLE-2025-12-001",
    "status": "DISPUTED",
    "disputedAt": "2026-01-05T10:00:00.000Z",
    "ticketNumber": "TICKET-2026-001",
    "details": "Found 5 missing transactions totaling TZS 250,000."
  }
}
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "additional context"
    }
  }
}
```

### HTTP Status Codes

| Status | Meaning | Description |
|--------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 202 | Accepted | Request accepted for async processing |
| 400 | Bad Request | Invalid request parameters or body |
| 401 | Unauthorized | Missing, invalid, or expired token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error (contact support) |
| 503 | Service Unavailable | System maintenance or downtime |

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `VALIDATION_ERROR` | 400 | Request validation failed | Check request body/parameters |
| `UNAUTHORIZED` | 401 | Invalid or expired token | Re-authenticate |
| `ACCOUNT_NOT_ACTIVE` | 403 | Service provider account not active | Contact support |
| `ACCOUNT_NOT_APPROVED` | 403 | Account pending approval | Wait for approval |
| `REFERENCE_NOT_FOUND` | 404 | Reference not found or not accessible | Verify reference number |
| `PAYMENT_NOT_FOUND` | 404 | Payment not found | Verify payment ID |
| `BATCH_NOT_FOUND` | 404 | Bulk batch not found | Verify batch ID |
| `CANNOT_UPDATE_REFERENCE` | 400 | Reference cannot be updated | Check reference status |
| `CANNOT_CANCEL_REFERENCE` | 400 | Reference cannot be cancelled | Check if reference is used |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Slow down requests |
| `INTERNAL_ERROR` | 500 | Server error | Contact support |

### Error Examples

**Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "customerPhone": "Must be in E.164 format (e.g., +255712345678)",
      "amount": "Must be greater than 1000"
    }
  }
}
```

**Authentication Error:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token has expired"
  }
}
```

**Rate Limit Error:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "details": {
      "retryAfter": 60,
      "limit": 100,
      "window": "1 minute"
    }
  }
}
```

---

## Rate Limits

To ensure fair usage and system stability, UCG enforces rate limits per service provider.

### Current Limits

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| Authentication | 10 requests | 1 minute | Per IP |
| Single Reference Generation | 100 requests | 1 minute | Per service provider |
| Bulk Reference Generation | 5 requests | 1 hour | Per service provider |
| List/Query Endpoints | 200 requests | 1 minute | Per service provider |
| All Other Endpoints | 100 requests | 1 minute | Per service provider |

### Rate Limit Headers

Responses include rate limit information in headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1640606400
```

### Handling Rate Limits

**Best Practices:**
1. Monitor `X-RateLimit-Remaining` header
2. Implement exponential backoff on 429 errors
3. Cache frequently accessed data
4. Use bulk endpoints instead of multiple single requests
5. Spread requests over time instead of bursts

**Example Retry Logic (JavaScript):**
```javascript
async function makeRequest(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      console.log(`Rate limited. Retrying after ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Webhooks

### Coming Soon

UCG will support webhook notifications for real-time event delivery. Supported events include:

- `payment.success` - Payment successfully processed
- `payment.failed` - Payment processing failed
- `reference.expired` - Reference has expired
- `settlement.completed` - Settlement completed

### Webhook Registration

Contact UCG support to register your webhook endpoint:
- **Email:** support@ucg.mhb.co.tz
- **Required Information:**
  - Webhook URL (HTTPS only)
  - Events to subscribe to
  - IP addresses for webhook origin validation

### Webhook Security

Webhooks will include:
- HMAC-SHA256 signature in `X-UCG-Signature` header
- Request timestamp in `X-UCG-Timestamp` header
- Unique event ID in `X-UCG-Event-ID` header

---

## Code Examples

### PHP Example

```php
<?php

class UCGClient {
    private $baseUrl;
    private $accessToken;

    public function __construct($baseUrl = 'https://api.ucg.mhb.co.tz/api/v1') {
        $this->baseUrl = $baseUrl;
    }

    /**
     * Authenticate and get access token
     */
    public function login($email, $password) {
        $response = $this->post('/auth/sp/login', [
            'email' => $email,
            'password' => $password
        ], false);

        $this->accessToken = $response['accessToken'];
        return $response;
    }

    /**
     * Generate a single reference
     */
    public function generateReference($data) {
        return $this->post('/sp/references', $data);
    }

    /**
     * Generate bulk references
     */
    public function generateBulkReferences($references) {
        return $this->post('/sp/references/bulk', [
            'references' => $references
        ]);
    }

    /**
     * Check bulk generation status
     */
    public function getBulkStatus($batchId) {
        return $this->get("/sp/references/bulk/{$batchId}");
    }

    /**
     * Get reference details
     */
    public function getReference($referenceNumber) {
        return $this->get("/sp/references/{$referenceNumber}");
    }

    /**
     * Extend reference expiry
     */
    public function extendReference($referenceNumber, $additionalDays) {
        return $this->patch("/sp/references/{$referenceNumber}/extend", [
            'additionalDays' => $additionalDays
        ]);
    }

    /**
     * Cancel reference
     */
    public function cancelReference($referenceNumber, $reason = null) {
        return $this->post("/sp/references/{$referenceNumber}/cancel", [
            'reason' => $reason
        ]);
    }

    /**
     * Get payments
     */
    public function getPayments($params = []) {
        $query = http_build_query($params);
        return $this->get("/sp/payments?{$query}");
    }

    /**
     * Get payment by reference
     */
    public function getPaymentByReference($referenceNumber) {
        return $this->get("/sp/payments/reference/{$referenceNumber}");
    }

    /**
     * HTTP POST request
     */
    private function post($endpoint, $data, $requiresAuth = true) {
        return $this->request('POST', $endpoint, $data, $requiresAuth);
    }

    /**
     * HTTP GET request
     */
    private function get($endpoint, $requiresAuth = true) {
        return $this->request('GET', $endpoint, null, $requiresAuth);
    }

    /**
     * HTTP PATCH request
     */
    private function patch($endpoint, $data, $requiresAuth = true) {
        return $this->request('PATCH', $endpoint, $data, $requiresAuth);
    }

    /**
     * Make HTTP request
     */
    private function request($method, $endpoint, $data = null, $requiresAuth = true) {
        $url = $this->baseUrl . $endpoint;

        $headers = [
            'Content-Type: application/json'
        ];

        if ($requiresAuth && $this->accessToken) {
            $headers[] = "Authorization: Bearer {$this->accessToken}";
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        if ($data && in_array($method, ['POST', 'PATCH', 'PUT'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true);

        if ($httpCode >= 400) {
            throw new Exception($decoded['error']['message'] ?? 'API Error');
        }

        return $decoded;
    }
}

// Usage Example
$client = new UCGClient();

// 1. Login
$auth = $client->login('your-email@example.com', 'your-password');
echo "Logged in as: " . $auth['serviceProvider']['businessName'] . "\n";

// 2. Generate single reference
$reference = $client->generateReference([
    'customerName' => 'John Doe',
    'customerPhone' => '+255712345678',
    'amount' => 150000,
    'description' => 'Hospital fees'
]);
echo "Reference generated: " . $reference['data']['referenceNumber'] . "\n";

// 3. Generate bulk references
$bulkReferences = [
    ['customerName' => 'Alice', 'customerPhone' => '+255712000001', 'amount' => 50000],
    ['customerName' => 'Bob', 'customerPhone' => '+255712000002', 'amount' => 75000]
];
$bulk = $client->generateBulkReferences($bulkReferences);
echo "Bulk batch ID: " . $bulk['data']['batchId'] . "\n";

// 4. Check bulk status
sleep(5); // Wait for processing
$status = $client->getBulkStatus($bulk['data']['batchId']);
echo "Bulk status: " . $status['data']['status'] . "\n";

// 5. Get payments
$payments = $client->getPayments([
    'page' => 1,
    'limit' => 10,
    'status' => 'SUCCESS'
]);
echo "Total payments: " . $payments['data']['pagination']['totalItems'] . "\n";

// 6. Extend reference
$extended = $client->extendReference('TAN-0000001-B18', 30);
echo "Reference extended to: " . $extended['data']['newExpiryDate'] . "\n";

?>
```

### Python Example

```python
import requests
from typing import Dict, List, Optional
from datetime import datetime

class UCGClient:
    def __init__(self, base_url: str = 'https://api.ucg.mhb.co.tz/api/v1'):
        self.base_url = base_url
        self.access_token: Optional[str] = None

    def login(self, email: str, password: str) -> Dict:
        """Authenticate and get access token"""
        response = self._post('/auth/sp/login', {
            'email': email,
            'password': password
        }, requires_auth=False)

        self.access_token = response['accessToken']
        return response

    def generate_reference(self, customer_name: str, customer_phone: str,
                          amount: int, description: str = None,
                          payment_option: str = 'FULL') -> Dict:
        """Generate a single reference"""
        data = {
            'customerName': customer_name,
            'customerPhone': customer_phone,
            'amount': amount,
            'paymentOption': payment_option
        }
        if description:
            data['description'] = description

        return self._post('/sp/references', data)

    def generate_bulk_references(self, references: List[Dict]) -> Dict:
        """Generate bulk references"""
        return self._post('/sp/references/bulk', {
            'references': references
        })

    def get_bulk_status(self, batch_id: str) -> Dict:
        """Check bulk generation status"""
        return self._get(f'/sp/references/bulk/{batch_id}')

    def get_reference(self, reference_number: str) -> Dict:
        """Get reference details"""
        return self._get(f'/sp/references/{reference_number}')

    def list_references(self, page: int = 1, limit: int = 20,
                       status: str = None, search: str = None) -> Dict:
        """List references with filtering"""
        params = {'page': page, 'limit': limit}
        if status:
            params['status'] = status
        if search:
            params['search'] = search

        query = '&'.join([f'{k}={v}' for k, v in params.items()])
        return self._get(f'/sp/references?{query}')

    def update_reference(self, reference_number: str, updates: Dict) -> Dict:
        """Update reference details"""
        return self._patch(f'/sp/references/{reference_number}', updates)

    def extend_reference(self, reference_number: str, additional_days: int) -> Dict:
        """Extend reference expiry"""
        return self._patch(f'/sp/references/{reference_number}/extend', {
            'additionalDays': additional_days
        })

    def cancel_reference(self, reference_number: str, reason: str = None) -> Dict:
        """Cancel reference"""
        data = {}
        if reason:
            data['reason'] = reason
        return self._post(f'/sp/references/{reference_number}/cancel', data)

    def get_payments(self, page: int = 1, limit: int = 20,
                    status: str = None, start_date: str = None,
                    end_date: str = None) -> Dict:
        """Get payments list"""
        params = {'page': page, 'limit': limit}
        if status:
            params['status'] = status
        if start_date:
            params['startDate'] = start_date
        if end_date:
            params['endDate'] = end_date

        query = '&'.join([f'{k}={v}' for k, v in params.items()])
        return self._get(f'/sp/payments?{query}')

    def get_payment_by_reference(self, reference_number: str) -> Dict:
        """Get payments for a specific reference"""
        return self._get(f'/sp/payments/reference/{reference_number}')

    def get_payment_summary(self, reference_number: str) -> Dict:
        """Get payment summary for a reference"""
        return self._get(f'/sp/payments/reference/{reference_number}/summary')

    def get_payment_statistics(self, start_date: str = None,
                              end_date: str = None) -> Dict:
        """Get payment statistics"""
        params = {}
        if start_date:
            params['startDate'] = start_date
        if end_date:
            params['endDate'] = end_date

        query = '&'.join([f'{k}={v}' for k, v in params.items()])
        return self._get(f'/sp/payments/statistics?{query}')

    def _get_headers(self, requires_auth: bool = True) -> Dict:
        """Get HTTP headers"""
        headers = {'Content-Type': 'application/json'}
        if requires_auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        return headers

    def _post(self, endpoint: str, data: Dict, requires_auth: bool = True) -> Dict:
        """Make POST request"""
        url = self.base_url + endpoint
        response = requests.post(url, json=data,
                               headers=self._get_headers(requires_auth))
        response.raise_for_status()
        return response.json()

    def _get(self, endpoint: str, requires_auth: bool = True) -> Dict:
        """Make GET request"""
        url = self.base_url + endpoint
        response = requests.get(url, headers=self._get_headers(requires_auth))
        response.raise_for_status()
        return response.json()

    def _patch(self, endpoint: str, data: Dict, requires_auth: bool = True) -> Dict:
        """Make PATCH request"""
        url = self.base_url + endpoint
        response = requests.patch(url, json=data,
                                headers=self._get_headers(requires_auth))
        response.raise_for_status()
        return response.json()

# Usage Example
if __name__ == '__main__':
    client = UCGClient()

    # 1. Login
    auth = client.login('your-email@example.com', 'your-password')
    print(f"Logged in as: {auth['serviceProvider']['businessName']}")

    # 2. Generate single reference
    reference = client.generate_reference(
        customer_name='John Doe',
        customer_phone='+255712345678',
        amount=150000,
        description='Hospital fees'
    )
    print(f"Reference generated: {reference['data']['referenceNumber']}")

    # 3. Generate bulk references
    bulk_references = [
        {'customerName': 'Alice', 'customerPhone': '+255712000001', 'amount': 50000},
        {'customerName': 'Bob', 'customerPhone': '+255712000002', 'amount': 75000}
    ]
    bulk = client.generate_bulk_references(bulk_references)
    print(f"Bulk batch ID: {bulk['data']['batchId']}")

    # 4. Get payments
    payments = client.get_payments(page=1, limit=10, status='SUCCESS')
    print(f"Total payments: {payments['data']['pagination']['totalItems']}")

    # 5. Extend reference
    extended = client.extend_reference('TAN-0000001-B18', 30)
    print(f"Reference extended to: {extended['data']['newExpiryDate']}")
```

### Node.js/JavaScript Example

```javascript
const axios = require('axios');

class UCGClient {
  constructor(baseUrl = 'https://api.ucg.mhb.co.tz/api/v1') {
    this.baseUrl = baseUrl;
    this.accessToken = null;
  }

  /**
   * Authenticate and get access token
   */
  async login(email, password) {
    const response = await this._post('/auth/sp/login', {
      email,
      password
    }, false);

    this.accessToken = response.accessToken;
    return response;
  }

  /**
   * Generate a single reference
   */
  async generateReference(data) {
    return this._post('/sp/references', data);
  }

  /**
   * Generate bulk references
   */
  async generateBulkReferences(references) {
    return this._post('/sp/references/bulk', { references });
  }

  /**
   * Check bulk generation status
   */
  async getBulkStatus(batchId) {
    return this._get(`/sp/references/bulk/${batchId}`);
  }

  /**
   * Get reference details
   */
  async getReference(referenceNumber) {
    return this._get(`/sp/references/${referenceNumber}`);
  }

  /**
   * List references
   */
  async listReferences(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this._get(`/sp/references?${query}`);
  }

  /**
   * Update reference
   */
  async updateReference(referenceNumber, updates) {
    return this._patch(`/sp/references/${referenceNumber}`, updates);
  }

  /**
   * Extend reference expiry
   */
  async extendReference(referenceNumber, additionalDays) {
    return this._patch(`/sp/references/${referenceNumber}/extend`, {
      additionalDays
    });
  }

  /**
   * Cancel reference
   */
  async cancelReference(referenceNumber, reason = null) {
    return this._post(`/sp/references/${referenceNumber}/cancel`, { reason });
  }

  /**
   * Get payments
   */
  async getPayments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this._get(`/sp/payments?${query}`);
  }

  /**
   * Get payment by reference
   */
  async getPaymentByReference(referenceNumber) {
    return this._get(`/sp/payments/reference/${referenceNumber}`);
  }

  /**
   * Get payment summary
   */
  async getPaymentSummary(referenceNumber) {
    return this._get(`/sp/payments/reference/${referenceNumber}/summary`);
  }

  /**
   * HTTP GET request
   */
  async _get(endpoint, requiresAuth = true) {
    const url = this.baseUrl + endpoint;
    const headers = this._getHeaders(requiresAuth);

    const response = await axios.get(url, { headers });
    return response.data;
  }

  /**
   * HTTP POST request
   */
  async _post(endpoint, data, requiresAuth = true) {
    const url = this.baseUrl + endpoint;
    const headers = this._getHeaders(requiresAuth);

    const response = await axios.post(url, data, { headers });
    return response.data;
  }

  /**
   * HTTP PATCH request
   */
  async _patch(endpoint, data, requiresAuth = true) {
    const url = this.baseUrl + endpoint;
    const headers = this._getHeaders(requiresAuth);

    const response = await axios.patch(url, data, { headers });
    return response.data;
  }

  /**
   * Get HTTP headers
   */
  _getHeaders(requiresAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (requiresAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }
}

// Usage Example
(async () => {
  const client = new UCGClient();

  try {
    // 1. Login
    const auth = await client.login('your-email@example.com', 'your-password');
    console.log(`Logged in as: ${auth.serviceProvider.businessName}`);

    // 2. Generate single reference
    const reference = await client.generateReference({
      customerName: 'John Doe',
      customerPhone: '+255712345678',
      amount: 150000,
      description: 'Hospital fees'
    });
    console.log(`Reference generated: ${reference.data.referenceNumber}`);

    // 3. Generate bulk references
    const bulkReferences = [
      { customerName: 'Alice', customerPhone: '+255712000001', amount: 50000 },
      { customerName: 'Bob', customerPhone: '+255712000002', amount: 75000 }
    ];
    const bulk = await client.generateBulkReferences(bulkReferences);
    console.log(`Bulk batch ID: ${bulk.data.batchId}`);

    // 4. Get payments
    const payments = await client.getPayments({
      page: 1,
      limit: 10,
      status: 'SUCCESS'
    });
    console.log(`Total payments: ${payments.data.pagination.totalItems}`);

    // 5. Extend reference
    const extended = await client.extendReference('TAN-0000001-B18', 30);
    console.log(`Reference extended to: ${extended.data.newExpiryDate}`);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
})();

module.exports = UCGClient;
```

---

## Support & Contact

### Technical Support

**Email:** support@ucg.mhb.co.tz
**Phone:** +255 XX XXX XXXX
**Hours:** Monday - Friday, 8:00 AM - 5:00 PM (EAT)

### Credential Issues

Contact support immediately if you:
- Lost your credentials
- Suspect credential compromise
- Need early rotation
- Experience authentication errors

### Integration Assistance

For integration help:
- Review this documentation
- Check code examples
- Test in sandbox environment first
- Contact support for specific questions

### Emergency Contact

For production issues outside business hours:
- **Email:** emergency@ucg.mhb.co.tz
- Response time: 1-2 hours for critical issues

---

## Changelog

### Version 1.0.0 (December 2025)

**Initial Release:**
- OAuth 2.0 authentication with 90-day credential rotation
- Single and bulk reference generation
- Reference management (list, update, extend, cancel)
- Payment queries and statistics
- Reconciliation endpoints
- Rate limiting
- Comprehensive error handling

---

## Appendix

### Phone Number Format (E.164)

All phone numbers must follow the E.164 international format:

**Format:** `+[country_code][area_code][local_number]`

**Examples:**
- Tanzania: `+255712345678`
- Kenya: `+254712345678`
- Uganda: `+256712345678`

**Invalid Formats:**
- `0712345678` (missing country code)
- `255712345678` (missing + prefix)
- `+255 712 345 678` (contains spaces)
- `+255-712-345-678` (contains hyphens)

### Date Format (ISO 8601)

All dates must be in ISO 8601 format:

**Format:** `YYYY-MM-DDTHH:mm:ss.sssZ`

**Examples:**
- `2025-12-27T10:30:00.000Z` (UTC)
- `2026-01-31T23:59:59.000Z` (End of day UTC)

### Reference Number Format

**Format:** `{SP_CODE}-{SEQUENCE}-{CHECKSUM}`

**Components:**
- `SP_CODE`: 2-3 character service provider code (e.g., `TAN`, `MWA`)
- `SEQUENCE`: 7-digit sequential number (e.g., `0000001`)
- `CHECKSUM`: 3-character validation code (e.g., `B18`)

**Example:** `TAN-0000001-B18`

### Testing Credentials

**Test Environment:** `http://192.168.1.94:8000/api/v1`

**Test Credentials:** Contact support for sandbox credentials

**Test Payment Channels:**
- Use test phone numbers for M-Pesa: `+255000000001` to `+255000000999`
- Payments in test environment are simulated and don't require actual money

---

**Document Version:** 1.0.0
**Last Updated:** December 27, 2025
**Next Review:** March 27, 2026
