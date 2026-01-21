# Third-Party System API Specifications

## Overview

This document specifies the API endpoints that third-party systems MUST implement to enable the UCG Payment System to retrieve and verify payment references from external systems.

## Table of Contents

1. [Authentication](#authentication)
2. [Required Endpoints](#required-endpoints)
3. [Data Models](#data-models)
4. [Error Handling](#error-handling)
5. [Security Requirements](#security-requirements)
6. [Testing & Validation](#testing--validation)

---

## Authentication

Third-party systems MUST support one of the following authentication methods:

### Option 1: API Key Authentication (Recommended)
```http
GET /api/v1/payment-references
Authorization: Bearer {api_key}
```

### Option 2: Basic Authentication
```http
GET /api/v1/payment-references
Authorization: Basic {base64_encoded_credentials}
```

### Option 3: OAuth 2.0
```http
GET /api/v1/payment-references
Authorization: Bearer {oauth_token}
```

---

## Required Endpoints

### 1. Get Payment References

**Endpoint:** `GET /api/v1/payment-references`

**Description:** Returns a list of payment references that need to be processed by UCG system.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (ISO 8601) | No | Filter references created on or after this date. Format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss` |
| `endDate` | string (ISO 8601) | No | Filter references created on or before this date. Format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss` |
| `status` | string | No | Filter by reference status: `ACTIVE`, `PAID`, `EXPIRED`, `CANCELLED` |
| `page` | integer | No | Page number for pagination (default: 1) |
| `limit` | integer | No | Number of records per page (default: 50, max: 100) |
| `referenceNumber` | string | No | Fetch a specific reference by reference number |

**Request Example:**
```bash
curl -X GET "https://your-system.com/api/v1/payment-references?startDate=2026-01-01&endDate=2026-01-21&status=ACTIVE&page=1&limit=50" \
  -H "Authorization: Bearer your_api_key_here"
```

**Response Format:**

```json
{
  "success": true,
  "data": [
    {
      "referenceNumber": "REF-2026-001234",
      "institutionCode": "ABC123",
      "institutionName": "ABC Institution",
      "amount": 50000.00,
      "currency": "TZS",
      "paymentOption": "COMPLETE",
      "customerName": "John Doe",
      "customerPhone": "+255712345678",
      "customerEmail": "john.doe@example.com",
      "description": "School fees for Term 1",
      "status": "ACTIVE",
      "expiryDate": "2026-12-31T23:59:59Z",
      "createdAt": "2026-01-15T10:30:00Z",
      "metadata": {
        "studentId": "STU-2026-001",
        "academicYear": "2026/2027",
        "term": "1"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 250,
    "limit": 50
  }
}
```

**HTTP Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Invalid or missing authentication
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

### 2. Get Single Payment Reference

**Endpoint:** `GET /api/v1/payment-references/{referenceNumber}`

**Description:** Returns detailed information about a specific payment reference.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `referenceNumber` | string | Yes | The unique reference number |

**Request Example:**
```bash
curl -X GET "https://your-system.com/api/v1/payment-references/REF-2026-001234" \
  -H "Authorization: Bearer your_api_key_here"
```

**Response Format:**

```json
{
  "success": true,
  "data": {
    "referenceNumber": "REF-2026-001234",
    "institutionCode": "ABC123",
    "institutionName": "ABC Institution",
    "amount": 50000.00,
    "currency": "TZS",
    "paymentOption": "COMPLETE",
    "partialPaymentConfig": {
      "minimumAmount": 10000.00,
      "allowPartialPayment": false
    },
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "customerEmail": "john.doe@example.com",
    "description": "School fees for Term 1",
    "status": "ACTIVE",
    "expiryDate": "2026-12-31T23:59:59Z",
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z",
    "totalPaid": 0.00,
    "remainingAmount": 50000.00,
    "payments": [],
    "metadata": {
      "studentId": "STU-2026-001",
      "academicYear": "2026/2027",
      "term": "1",
      "class": "Form 4A"
    }
  }
}
```

**HTTP Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing authentication
- `404 Not Found` - Reference not found
- `500 Internal Server Error` - Server error

---

### 3. Update Reference Status (Callback)

**Endpoint:** `POST /api/v1/payment-references/{referenceNumber}/status`

**Description:** UCG system will call this endpoint to notify the third-party system when a payment has been processed.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `referenceNumber` | string | Yes | The unique reference number |

**Request Body:**

```json
{
  "status": "PAID",
  "amountPaid": 50000.00,
  "totalPaid": 50000.00,
  "remainingAmount": 0.00,
  "paymentDate": "2026-01-21T14:30:00Z",
  "transactionId": "UCG-TXN-2026-001234",
  "paymentChannel": "MPESA",
  "fspCode": "VODACOM",
  "payerName": "John Doe",
  "payerPhone": "+255712345678"
}
```

**Request Example:**
```bash
curl -X POST "https://your-system.com/api/v1/payment-references/REF-2026-001234/status" \
  -H "Authorization: Bearer your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAID",
    "amountPaid": 50000.00,
    "totalPaid": 50000.00,
    "remainingAmount": 0.00,
    "paymentDate": "2026-01-21T14:30:00Z",
    "transactionId": "UCG-TXN-2026-001234",
    "paymentChannel": "MPESA",
    "fspCode": "VODACOM",
    "payerName": "John Doe",
    "payerPhone": "+255712345678"
  }'
```

**Response Format:**

```json
{
  "success": true,
  "message": "Payment status updated successfully",
  "data": {
    "referenceNumber": "REF-2026-001234",
    "status": "PAID",
    "updatedAt": "2026-01-21T14:30:05Z"
  }
}
```

**HTTP Status Codes:**
- `200 OK` - Status updated successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Invalid or missing authentication
- `404 Not Found` - Reference not found
- `409 Conflict` - Status update conflict (e.g., reference already paid)
- `500 Internal Server Error` - Server error

---

## Data Models

### PaymentReference Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `referenceNumber` | string | Yes | Unique reference identifier (max 100 chars) |
| `institutionCode` | string | Yes | Your institution/organization code (max 50 chars) |
| `institutionName` | string | Yes | Your institution/organization name (max 200 chars) |
| `amount` | decimal | Yes | Total amount to be paid (must be > 0) |
| `currency` | string | Yes | Currency code (default: "TZS") |
| `paymentOption` | string | Yes | Payment type (see Payment Options below) |
| `partialPaymentConfig` | object | Conditional | Required if paymentOption is PARTIAL, PRECISE, LIMITED, or PERPETUAL |
| `customerName` | string | Yes | Name of the customer/payer (max 200 chars) |
| `customerPhone` | string | Yes | Customer phone number (international format: +255...) |
| `customerEmail` | string | No | Customer email address |
| `description` | string | Yes | Description of the payment purpose (max 500 chars) |
| `status` | string | Yes | Current status (see Status Values below) |
| `expiryDate` | string (ISO 8601) | No | When the reference expires (null for no expiry) |
| `createdAt` | string (ISO 8601) | Yes | When the reference was created |
| `updatedAt` | string (ISO 8601) | Yes | When the reference was last updated |
| `totalPaid` | decimal | Yes | Total amount paid so far (default: 0) |
| `remainingAmount` | decimal | Yes | Amount still to be paid |
| `payments` | array | No | Array of payment records (see Payment Object below) |
| `metadata` | object | No | Additional custom data (flexible JSON object) |

### Payment Options

| Option | Description | Partial Payment Allowed |
|--------|-------------|------------------------|
| `COMPLETE` | Full amount must be paid in a single transaction | No |
| `PARTIAL` | Any amount can be paid until total is reached | Yes |
| `PRECISE` | Exact amount must be paid (no more, no less) | No |
| `LIMITED` | Partial payments allowed with minimum amount | Yes (with minimum) |
| `PERPETUAL` | Any amount can be paid, no total limit | Yes (unlimited) |

### Partial Payment Configuration

Required when `paymentOption` is PARTIAL, PRECISE, LIMITED, or PERPETUAL:

```json
{
  "minimumAmount": 10000.00,
  "allowPartialPayment": true,
  "maximumAmount": 100000.00
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `minimumAmount` | decimal | Conditional | Minimum payment amount (required for LIMITED) |
| `allowPartialPayment` | boolean | Yes | Whether partial payments are allowed |
| `maximumAmount` | decimal | No | Maximum total payment (optional cap) |

### Status Values

| Status | Description |
|--------|-------------|
| `ACTIVE` | Reference is active and can accept payments |
| `PAID` | Reference has been fully paid |
| `PARTIALLY_PAID` | Reference has received partial payment |
| `EXPIRED` | Reference has expired and cannot accept payments |
| `CANCELLED` | Reference has been cancelled |
| `SUSPENDED` | Reference is temporarily suspended |

### Payment Object

```json
{
  "paymentId": "PAY-2026-001234",
  "amountPaid": 50000.00,
  "paymentDate": "2026-01-21T14:30:00Z",
  "transactionId": "UCG-TXN-2026-001234",
  "paymentChannel": "MPESA",
  "fspCode": "VODACOM",
  "payerName": "John Doe",
  "payerPhone": "+255712345678",
  "status": "SUCCESS"
}
```

---

## Error Handling

### Standard Error Response Format

All error responses MUST follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error context"
    }
  },
  "timestamp": "2026-01-21T14:30:00Z"
}
```

### Common Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication failed |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Response Examples

**Invalid Date Range:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Start date must be before end date",
    "details": {
      "startDate": "2026-12-31",
      "endDate": "2026-01-01"
    }
  },
  "timestamp": "2026-01-21T14:30:00Z"
}
```

**Reference Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Payment reference not found",
    "details": {
      "referenceNumber": "REF-2026-999999"
    }
  },
  "timestamp": "2026-01-21T14:30:00Z"
}
```

---

## Security Requirements

### 1. HTTPS Only
- ALL API endpoints MUST be served over HTTPS
- HTTP connections should be rejected or redirected to HTTPS

### 2. API Key Security
- API keys must be at least 32 characters long
- API keys should be rotatable
- Support separate API keys for production and testing

### 3. IP Whitelisting (Optional but Recommended)
- Allow restricting API access to specific IP addresses
- UCG system IPs will be provided during integration setup

### 4. Rate Limiting
Recommended rate limits:
- **Authentication endpoint**: 10 requests per minute per IP
- **GET endpoints**: 100 requests per minute per API key
- **POST endpoints**: 50 requests per minute per API key

### 5. Request Validation
- Validate all input parameters
- Sanitize data to prevent injection attacks
- Return clear validation error messages

### 6. Logging
- Log all API requests with timestamps
- Log authentication attempts (success and failure)
- Retain logs for at least 90 days

---

## Testing & Validation

### Test Data Requirements

Please provide test API credentials and at least 3 test references with different payment options:

#### Test Reference 1: COMPLETE Payment
```json
{
  "referenceNumber": "TEST-COMPLETE-001",
  "amount": 50000.00,
  "paymentOption": "COMPLETE",
  "status": "ACTIVE"
}
```

#### Test Reference 2: PARTIAL Payment
```json
{
  "referenceNumber": "TEST-PARTIAL-001",
  "amount": 100000.00,
  "paymentOption": "PARTIAL",
  "partialPaymentConfig": {
    "minimumAmount": 10000.00,
    "allowPartialPayment": true
  },
  "status": "ACTIVE"
}
```

#### Test Reference 3: LIMITED Payment
```json
{
  "referenceNumber": "TEST-LIMITED-001",
  "amount": 75000.00,
  "paymentOption": "LIMITED",
  "partialPaymentConfig": {
    "minimumAmount": 25000.00,
    "allowPartialPayment": true
  },
  "status": "ACTIVE"
}
```

### Integration Testing Checklist

- [ ] Test environment API endpoint URL provided
- [ ] Test API credentials provided
- [ ] Test references created in your system
- [ ] GET /api/v1/payment-references endpoint tested successfully
- [ ] GET /api/v1/payment-references/{referenceNumber} endpoint tested successfully
- [ ] POST /api/v1/payment-references/{referenceNumber}/status endpoint tested successfully
- [ ] Authentication working correctly
- [ ] Error responses following standard format
- [ ] Pagination working correctly
- [ ] Date filtering working correctly
- [ ] Status filtering working correctly
- [ ] All required fields present in responses
- [ ] Production environment API endpoint URL provided
- [ ] Production API credentials provided
- [ ] IP whitelisting configured (if applicable)
- [ ] Rate limiting configured
- [ ] SSL certificate valid and trusted

---

## API Response Time Requirements

To ensure smooth payment processing, your API should meet these performance requirements:

| Endpoint | Maximum Response Time |
|----------|----------------------|
| GET /api/v1/payment-references | 2 seconds |
| GET /api/v1/payment-references/{referenceNumber} | 1 second |
| POST /api/v1/payment-references/{referenceNumber}/status | 3 seconds |

---

## Support & Contact

For integration support and questions, please provide:

1. **Technical Contact Information:**
   - Name:
   - Email:
   - Phone:
   - Available hours:

2. **API Documentation URL:**
   - Test environment:
   - Production environment:

3. **Support Channels:**
   - Technical support email:
   - Emergency contact (24/7):
   - Slack/Teams channel (if available):

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-21 | Initial specification document |

---

## Appendix: Complete Integration Example

### Step 1: UCG Fetches Payment References

```bash
# UCG system calls third-party API to get new references
curl -X GET "https://your-system.com/api/v1/payment-references?startDate=2026-01-21&status=ACTIVE" \
  -H "Authorization: Bearer your_api_key"
```

**Third-party system responds:**
```json
{
  "success": true,
  "data": [
    {
      "referenceNumber": "REF-2026-001234",
      "institutionCode": "ABC123",
      "institutionName": "ABC Institution",
      "amount": 50000.00,
      "currency": "TZS",
      "paymentOption": "COMPLETE",
      "customerName": "John Doe",
      "customerPhone": "+255712345678",
      "description": "School fees",
      "status": "ACTIVE"
    }
  ]
}
```

### Step 2: UCG Creates Reference in UCG System

UCG system creates a new payment reference in its database using the data received.

### Step 3: Customer Makes Payment

Customer pays via MPESA, TIGO PESA, or other channel to the UCG reference.

### Step 4: UCG Notifies Third-Party System

```bash
# UCG system calls third-party API to update payment status
curl -X POST "https://your-system.com/api/v1/payment-references/REF-2026-001234/status" \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PAID",
    "amountPaid": 50000.00,
    "totalPaid": 50000.00,
    "remainingAmount": 0.00,
    "paymentDate": "2026-01-21T14:30:00Z",
    "transactionId": "UCG-TXN-2026-001234",
    "paymentChannel": "MPESA",
    "fspCode": "VODACOM",
    "payerName": "John Doe",
    "payerPhone": "+255712345678"
  }'
```

**Third-party system responds:**
```json
{
  "success": true,
  "message": "Payment status updated successfully",
  "data": {
    "referenceNumber": "REF-2026-001234",
    "status": "PAID",
    "updatedAt": "2026-01-21T14:30:05Z"
  }
}
```

---

**End of Specification Document**

Please implement these API endpoints and provide us with:
1. Test environment URL and credentials
2. Test references for integration testing
3. Expected production deployment date
4. Technical contact information
