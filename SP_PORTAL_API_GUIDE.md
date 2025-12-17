# Service Provider Portal API Guide

Complete documentation for the UCG Backend Service Provider (SP) Portal APIs.

## Table of Contents
- [Authentication](#authentication)
- [Dashboard Endpoints](#dashboard-endpoints)
- [Payment Endpoints](#payment-endpoints)
- [Reference Endpoints](#reference-endpoints)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Authentication

### Base URL
```
http://localhost:8000/api/v1
Production: https://api.ucg.mhb.co.tz/api/v1
```

### 1. Service Provider Login

Authenticate as a service provider and receive JWT tokens.

**Endpoint:** `POST /auth/sp/login`

**Request:**
```json
{
  "email": "admin@mwanga.school.tz",
  "password": "your-password"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "serviceProvider": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "spCode": "MWA",
    "businessName": "Mwanga Secondary School",
    "businessType": "SCHOOL",
    "email": "admin@mwanga.school.tz",
    "phoneNumber": "+255712345678",
    "status": "APPROVED",
    "isActive": true
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials or account not approved
- `401 Unauthorized` - Account is not active
- `401 Unauthorized` - Account has been deleted

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/sp/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mwanga.school.tz",
    "password": "password"
  }'
```

### Using the Access Token

All subsequent requests to SP endpoints require the access token in the Authorization header:

```
Authorization: Bearer {accessToken}
```

**Token Details:**
- **Access Token Lifetime:** 15 minutes
- **Refresh Token Lifetime:** 7 days
- **Token Type:** JWT (JSON Web Token)

**Token Payload:**
```json
{
  "sub": "serviceProviderId",
  "email": "sp@example.com",
  "spCode": "MWA",
  "type": "SERVICE_PROVIDER"
}
```

---

## Dashboard Endpoints

All dashboard endpoints automatically filter data by the authenticated service provider.

### 1. Get Dashboard Overview

Get overview statistics including total references, payments, and revenue.

**Endpoint:** `GET /sp/dashboard/overview`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Filter start date (ISO 8601 format) |
| endDate | string | No | Filter end date (ISO 8601 format) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalReferences": 1250,
    "activeReferences": 450,
    "totalPayments": 800,
    "totalRevenue": 45000000,
    "pendingSettlement": 2500000,
    "recentActivity": []
  }
}
```

**Example:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET "http://localhost:8000/api/v1/sp/dashboard/overview?startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2. Get Dashboard Trends

Get payment and reference trends over time for charts and graphs.

**Endpoint:** `GET /sp/dashboard/trends`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | '7days', '30days', '90days', 'year' |
| startDate | string | No | Custom start date (ISO 8601) |
| endDate | string | No | Custom end date (ISO 8601) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "30days",
    "paymentTrends": [
      {
        "date": "2025-11-01",
        "count": 45,
        "amount": 2250000
      },
      {
        "date": "2025-11-02",
        "count": 52,
        "amount": 2600000
      }
    ],
    "referenceTrends": [
      {
        "date": "2025-11-01",
        "generated": 60,
        "used": 45
      },
      {
        "date": "2025-11-02",
        "generated": 65,
        "used": 52
      }
    ]
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/sp/dashboard/trends?period=30days" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3. Get Reference Analytics

Get detailed analytics about references (status breakdown, usage patterns, etc.).

**Endpoint:** `GET /sp/dashboard/analytics/references`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Filter start date (ISO 8601) |
| endDate | string | No | Filter end date (ISO 8601) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "statusBreakdown": {
      "active": 450,
      "used": 650,
      "expired": 100,
      "cancelled": 50
    },
    "utilizationRate": 76.5,
    "averageTimeToUse": 12.5,
    "topCustomers": []
  }
}
```

---

### 4. Get Payment Analytics

Get detailed analytics about payments (payment methods, success rates, amounts, etc.).

**Endpoint:** `GET /sp/dashboard/analytics/payments`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Filter start date (ISO 8601) |
| endDate | string | No | Filter end date (ISO 8601) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "paymentMethodBreakdown": {
      "MPESA": {
        "count": 450,
        "amount": 22500000
      },
      "TIGOPESA": {
        "count": 250,
        "amount": 12500000
      },
      "AIRTEL": {
        "count": 100,
        "amount": 5000000
      }
    },
    "successRate": 98.5,
    "averagePaymentAmount": 50000,
    "peakHours": [9, 10, 14, 15]
  }
}
```

---

### 5. Get Service Provider Profile

Get the authenticated service provider's profile information and settings.

**Endpoint:** `GET /sp/dashboard/profile`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "spCode": "MWA",
    "businessName": "Mwanga Secondary School",
    "businessType": "SCHOOL",
    "email": "admin@mwanga.school.tz",
    "phoneNumber": "+255712345678",
    "physicalAddress": "Kimara Stop Over",
    "region": "DAR",
    "district": "UBUNGO",
    "status": "APPROVED",
    "isActive": true,
    "contact": {
      "id": "bc8927f4-9537-4902-8e9e-ca1c99d0195a",
      "fullName": "JOEL M GAITAN",
      "phoneNumber": "0753107301",
      "email": "joelgaitan1992@gmail.com",
      "position": "CEO",
      "isPrimary": true
    },
    "bankAccounts": [
      {
        "id": "97859e6b-2898-43b8-ba5c-be1db0abf639",
        "bankName": "CRDB",
        "accountNumber": "120000999",
        "accountName": "JOEL M GAITAN",
        "branchName": "DODOMA",
        "accountType": "SAVINGS",
        "isPrimary": true,
        "isActive": true
      }
    ],
    "settings": {
      "commissionRate": "2.50",
      "settlementFrequency": "DAILY",
      "autoSettlement": true,
      "minimumSettlementAmount": "10000.00",
      "emailNotifications": true,
      "smsNotifications": true
    }
  }
}
```

---

## Payment Endpoints

All payment endpoints automatically filter data by the authenticated service provider.

### 1. List All Payments

Get a paginated list of all payments with optional filtering.

**Endpoint:** `GET /sp/payments`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page |
| status | string | No | - | Filter by status: 'SUCCESS', 'PENDING', 'FAILED' |
| startDate | string | No | - | Filter start date (ISO 8601) |
| endDate | string | No | - | Filter end date (ISO 8601) |
| search | string | No | - | Search by reference number, payer name, or phone |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "referenceNumber": "MWA-0001234-A7B",
        "amountPaid": 50000,
        "payerName": "John Doe",
        "payerPhone": "+255712345678",
        "paymentChannel": "MPESA",
        "status": "SUCCESS",
        "currency": "TZS",
        "paidAt": "2025-12-07T10:30:00.000Z",
        "updatedAt": "2025-12-07T10:30:00.000Z"
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

**Example:**
```bash
# Get all successful payments for December 2025
curl -X GET "http://localhost:8000/api/v1/sp/payments?page=1&limit=20&status=SUCCESS&startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer $TOKEN"

# Search for payments by customer name
curl -X GET "http://localhost:8000/api/v1/sp/payments?search=John" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2. Get Payment Statistics

Get comprehensive payment statistics for the service provider.

**Endpoint:** `GET /sp/payments/statistics`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Filter start date (ISO 8601) |
| endDate | string | No | Filter end date (ISO 8601) |

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
      "MPESA": {
        "count": 450,
        "amount": 22500000
      },
      "TIGOPESA": {
        "count": 250,
        "amount": 12500000
      },
      "AIRTEL": {
        "count": 150,
        "amount": 7500000
      }
    },
    "recentPayments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "referenceNumber": "MWA-0001234-A7B",
        "amountPaid": 50000,
        "payerName": "John Doe",
        "paymentChannel": "MPESA",
        "status": "SUCCESS",
        "paidAt": "2025-12-07T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 3. Get Payments by Reference Number

Get all payments made against a specific reference number.

**Endpoint:** `GET /sp/payments/reference/:referenceNumber`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| referenceNumber | string | Yes | The reference number (e.g., MWA-0001234-A7B) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "referenceNumber": "MWA-0001234-A7B",
    "payments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "amountPaid": 25000,
        "payerName": "John Doe",
        "payerPhone": "+255712345678",
        "paymentChannel": "MPESA",
        "status": "SUCCESS",
        "currency": "TZS",
        "paidAt": "2025-12-07T10:30:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "amountPaid": 25000,
        "payerName": "John Doe",
        "payerPhone": "+255712345678",
        "paymentChannel": "MPESA",
        "status": "SUCCESS",
        "currency": "TZS",
        "paidAt": "2025-12-08T10:30:00.000Z"
      }
    ],
    "totalPaid": 50000,
    "paymentCount": 2
  }
}
```

**Error Responses:**
- `400 Bad Request` - Reference not found or not accessible

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/sp/payments/reference/MWA-0001234-A7B" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. Get Payment Summary by Reference

Get detailed payment summary including invoice amount, total paid, remaining, and installment information.

**Endpoint:** `GET /sp/payments/reference/:referenceNumber/summary`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "referenceNumber": "MWA-0001234-A7B",
    "invoiceAmount": 50000,
    "totalPaid": 50000,
    "remainingAmount": 0,
    "installmentCount": 2,
    "paymentOption": "INSTALLMENT",
    "isFullyPaid": true,
    "status": "USED",
    "payments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "amountPaid": 25000,
        "payerName": "John Doe",
        "paymentChannel": "MPESA",
        "paidAt": "2025-12-07T10:30:00.000Z",
        "status": "SUCCESS"
      }
    ]
  }
}
```

---

### 5. Get Payment Details

Get detailed information about a specific payment.

**Endpoint:** `GET /sp/payments/:paymentId`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| paymentId | string (UUID) | Yes | The payment ID |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "referenceNumber": "MWA-0001234-A7B",
    "amountPaid": 50000,
    "payerName": "John Doe",
    "payerPhone": "+255712345678",
    "paymentChannel": "MPESA",
    "status": "SUCCESS",
    "currency": "TZS",
    "paidAt": "2025-12-07T10:30:00.000Z",
    "updatedAt": "2025-12-07T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Payment not found or not accessible

---

## Reference Endpoints

All reference endpoints automatically filter data by the authenticated service provider.

### 1. Generate Single Reference

Create a single payment reference for a customer.

**Endpoint:** `POST /sp/references`

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000,
  "description": "School fees payment for Term 1",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "paymentOption": "FULL"
}
```

**Request Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customerName | string | Yes | Customer's full name |
| customerPhone | string | Yes | Customer's phone number (format: +255XXXXXXXXX) |
| amount | number | Yes | Payment amount |
| description | string | No | Description of the payment |
| expiresAt | string | No | Expiry date (ISO 8601 format) |
| paymentOption | string | No | 'FULL' or 'INSTALLMENT' (default: FULL) |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Payment reference generated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "referenceNumber": "MWA-0001234-A7B",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "status": "ACTIVE",
    "expiresAt": "2025-12-31T23:59:59.000Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/v1/sp/references \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "description": "School fees",
    "paymentOption": "FULL"
  }'
```

---

### 2. Generate Multiple References (Bulk)

Create up to 1000 references in one request. Processing is asynchronous.

**Endpoint:** `POST /sp/references/bulk`

**Request Body:**
```json
{
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
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Bulk reference generation initiated",
  "data": {
    "batchId": "batch-550e8400-e29b-41d4-a716-446655440000",
    "totalRequested": 2,
    "status": "PROCESSING",
    "estimatedCompletionTime": "2025-11-07T10:35:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Exceeds maximum 1000 references

---

### 3. Get Bulk Generation Status

Check the status and progress of a bulk reference generation job.

**Endpoint:** `GET /sp/references/bulk/:batchId`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "batchId": "batch-550e8400",
    "status": "COMPLETED",
    "summary": {
      "totalRequested": 100,
      "successCount": 98,
      "failureCount": 2,
      "processingCount": 0
    },
    "progress": 100,
    "startedAt": "2025-11-07T10:30:00.000Z",
    "completedAt": "2025-11-07T10:35:00.000Z",
    "downloadUrl": "https://api.ucg.mhb.co.tz/api/v1/sp/references/bulk/batch-550e8400/download"
  }
}
```

---

### 4. List All References

Get a paginated list of all references with filtering and search.

**Endpoint:** `GET /sp/references`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page |
| status | string | No | - | 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED' |
| search | string | No | - | Search by customer name, phone, or reference |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "referenceNumber": "MWA-0001234-A7B",
        "customerName": "John Doe",
        "amount": 50000,
        "status": "ACTIVE"
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

---

### 5. Get Reference Statistics

Get statistics for service provider references (counts, amounts, trends).

**Endpoint:** `GET /sp/references/statistics`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Filter start date (ISO 8601) |
| endDate | string | No | Filter end date (ISO 8601) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalReferences": 1250,
    "activeReferences": 450,
    "usedReferences": 650,
    "expiredReferences": 100,
    "cancelledReferences": 50,
    "totalAmount": 62500000,
    "totalCollected": 32500000
  }
}
```

---

### 6. Get Reference Details

Get detailed information about a specific reference.

**Endpoint:** `GET /sp/references/:referenceNumber`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "referenceNumber": "MWA-0001234-A7B",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "status": "ACTIVE",
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "createdAt": "2025-12-01T10:00:00.000Z"
  }
}
```

---

### 7. Cancel Reference

Cancel an active reference. Cannot be used for payment after cancellation.

**Endpoint:** `POST /sp/references/:referenceNumber/cancel`

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reference cancelled successfully",
  "data": {
    "referenceNumber": "MWA-0001234-A7B",
    "status": "CANCELLED",
    "cancelledAt": "2025-12-10T10:00:00.000Z",
    "reason": "Customer requested cancellation"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Reference cannot be cancelled (already used/expired)

---

### 8. Validate Reference

Validate a reference before giving it to a customer (optional check).

**Endpoint:** `GET /sp/references/:referenceNumber/validate`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "referenceNumber": "MWA-0001234-A7B",
    "status": "ACTIVE",
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "message": "Reference is valid and ready for payment"
  }
}
```

---

### 9. Extend Reference Expiry

Extend the expiry date of an active reference.

**Endpoint:** `PATCH /sp/references/:referenceNumber/extend`

**Request Body:**
```json
{
  "additionalDays": 7
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reference expiry extended successfully",
  "data": {
    "referenceNumber": "MWA-0001234-A7B",
    "oldExpiryDate": "2025-12-31T23:59:59.000Z",
    "newExpiryDate": "2026-01-07T23:59:59.000Z",
    "extendedBy": 7,
    "extendedAt": "2025-12-10T10:00:00.000Z"
  }
}
```

---

## Error Handling

### Standard Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 OK | Request successful |
| 201 Created | Resource created successfully |
| 202 Accepted | Request accepted for processing |
| 400 Bad Request | Invalid request parameters |
| 401 Unauthorized | Missing or invalid authentication token |
| 403 Forbidden | Insufficient permissions |
| 404 Not Found | Resource not found |
| 429 Too Many Requests | Rate limit exceeded |
| 500 Internal Server Error | Server error |

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| VALIDATION_ERROR | Request validation failed | Check request body/parameters |
| UNAUTHORIZED | Invalid or expired token | Re-authenticate |
| REFERENCE_NOT_FOUND | Reference not found or not accessible | Verify reference number and access |
| PAYMENT_NOT_FOUND | Payment not found or not accessible | Verify payment ID and access |
| BATCH_NOT_FOUND | Batch not found | Verify batch ID |
| ACCOUNT_NOT_ACTIVE | Service provider account not active | Contact administrator |
| ACCOUNT_NOT_APPROVED | Service provider account not approved | Wait for approval |

---

## Best Practices

### 1. Token Management

```javascript
// Store tokens securely
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);

// Add token to all requests
const config = {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
};

// Handle token expiration
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response.status === 401) {
      // Redirect to login or refresh token
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 2. Pagination

Always use pagination for list endpoints:

```javascript
async function getAllPayments() {
  let page = 1;
  let allPayments = [];
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `http://localhost:8000/api/v1/sp/payments?page=${page}&limit=100`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const data = await response.json();

    allPayments.push(...data.data.items);
    hasMore = data.data.pagination.hasNext;
    page++;
  }

  return allPayments;
}
```

### 3. Error Handling

Always handle errors gracefully:

```javascript
try {
  const response = await fetch('http://localhost:8000/api/v1/sp/payments', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Error:', error.error.message);
    // Show user-friendly error message
    return;
  }

  const data = await response.json();
  // Process data
} catch (error) {
  console.error('Network error:', error);
  // Show network error message
}
```

### 4. Date Filtering

Use ISO 8601 format for dates:

```javascript
// Get payments for the last 30 days
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

const url = `http://localhost:8000/api/v1/sp/payments?` +
  `startDate=${startDate.toISOString()}&` +
  `endDate=${endDate.toISOString()}`;
```

### 5. Search and Filtering

Combine multiple filters for precise results:

```javascript
const filters = {
  page: 1,
  limit: 20,
  status: 'SUCCESS',
  search: 'John',
  startDate: '2025-12-01T00:00:00.000Z',
  endDate: '2025-12-31T23:59:59.000Z'
};

const queryString = new URLSearchParams(filters).toString();
const url = `http://localhost:8000/api/v1/sp/payments?${queryString}`;
```

---

## Complete Integration Example

### React/Next.js Example

```typescript
// api/auth.ts
export async function loginServiceProvider(email: string, password: string) {
  const response = await fetch('http://localhost:8000/api/v1/auth/sp/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data.serviceProvider;
}

// api/dashboard.ts
export async function getDashboardOverview() {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:8000/api/v1/sp/dashboard/overview', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard');
  }

  const data = await response.json();
  return data.data;
}

// api/payments.ts
export async function getPayments(page = 1, limit = 20, filters = {}) {
  const token = localStorage.getItem('accessToken');
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters
  });

  const response = await fetch(
    `http://localhost:8000/api/v1/sp/payments?${queryParams}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }

  const data = await response.json();
  return data.data;
}

// api/references.ts
export async function generateReference(referenceData) {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:8000/api/v1/sp/references', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(referenceData)
  });

  if (!response.ok) {
    throw new Error('Failed to generate reference');
  }

  const data = await response.json();
  return data.data;
}
```

---

## Environment Configuration

### Development
```env
API_BASE_URL=http://localhost:8000/api/v1
```

### Production
```env
API_BASE_URL=https://api.ucg.mhb.co.tz/api/v1
```

---

## Support

For issues or questions:
- **Email:** support@ucg.mhb.co.tz
- **GitHub Issues:** [UCG Backend Issues](https://github.com/mwamba1992/ucg-backend/issues)
- **Documentation:** This guide

---

## Changelog

### Version 1.0.0 (December 2025)
- Initial release
- SP authentication with JWT
- Dashboard endpoints
- Payment endpoints with filtering
- Reference generation and management
- Automatic service provider data filtering
