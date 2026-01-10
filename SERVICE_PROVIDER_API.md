# Service Provider (SP) Portal API Documentation

## Base URL
```
http://192.168.1.94:8000/api/v1
```

## Authentication
All endpoints require JWT Bearer token authentication obtained from SP login.

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Table of Contents
1. [Authentication](#authentication-1)
   - [SP Login](#1-sp-login)
   - [SP Registration](#2-sp-registration)
2. [Reference Management](#reference-management)
   - [Generate Single Reference](#1-generate-single-reference)
   - [Generate Bulk References](#2-generate-bulk-references)
   - [List References](#3-list-references)
   - [Get Reference Details](#4-get-reference-details)
   - [Update Reference](#5-update-reference)
   - [Cancel Reference](#6-cancel-reference)
   - [Get Reference Statistics](#7-get-reference-statistics)
3. [Payment Management](#payment-management)
   - [List Payments](#1-list-payments)
   - [Get Payment Statistics](#2-get-payment-statistics)
   - [Get Payments by Reference](#3-get-payments-by-reference)
   - [Get Payment Summary](#4-get-payment-summary)
4. [Dashboard](#dashboard)
   - [Get Dashboard Overview](#1-get-dashboard-overview)
   - [Get Profile](#2-get-profile)

---

## Authentication

### 1. SP Login

Login to the service provider portal with email and password.

**Endpoint:** `POST /auth/sp/login`

**Request Body:**
```json
{
  "email": "admin@mwanga.school.tz",
  "password": "your-password"
}
```

**Field Validation:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Service provider email address |
| password | string | Yes | Service provider password |

**Success Response (200):**
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

**Token Expiration:**
- Access Token: 60 minutes
- Refresh Token: 30 days

**Error Responses:**
- **401 Unauthorized:** Invalid credentials
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

- **401 Unauthorized:** Account not approved
```json
{
  "statusCode": 401,
  "message": "Account not approved. Current status: PENDING"
}
```

---

### 2. SP Registration

Self-registration for service providers. Account will be PENDING until admin approval.

**Endpoint:** `POST /auth/sp/register`

**Request Body:**
```json
{
  "businessName": "Mwanga Secondary School",
  "businessType": "SCHOOL",
  "otherBusinessType": null,
  "registrationNumber": "BN123456789",
  "tinNumber": "123-456-789",
  "phoneNumber": "+255712345678",
  "email": "admin@mwanga.school.tz",
  "physicalAddress": "Plot 123, Uhuru Street",
  "region": "Kilimanjaro",
  "district": "Mwanga",
  "contact": {
    "fullName": "John Smith",
    "phoneNumber": "+255712345678",
    "email": "john.smith@mwanga.school.tz",
    "idType": "NIDA",
    "idNumber": "19850101-12345-67890-12",
    "position": "Headmaster"
  },
  "bankAccounts": [
    {
      "bankName": "CRDB Bank",
      "accountNumber": "0150123456789",
      "accountName": "Mwanga Secondary School",
      "branchName": "Moshi Branch",
      "swiftCode": "CORUTZTZ"
    }
  ],
  "settings": {
    "commissionRate": 2.5,
    "settlementFrequency": "DAILY",
    "autoSettlement": false
  }
}
```

**Field Validation:**

**Main Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| businessName | string | Yes | Max 200 chars |
| businessType | enum | Yes | SCHOOL, MICROFINANCE, UTILITY, HEALTHCARE, GOVERNMENT, OTHER |
| otherBusinessType | string | No | Required if businessType is OTHER, max 200 chars |
| registrationNumber | string | Yes | Unique, max 100 chars |
| tinNumber | string | Yes | Unique, max 100 chars |
| phoneNumber | string | Yes | Max 15 chars |
| email | string | Yes | Valid email, unique, max 100 chars |
| physicalAddress | string | No | |
| region | string | No | Max 100 chars |
| district | string | No | Max 100 chars |

**Contact Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| fullName | string | Yes | Max 200 chars |
| phoneNumber | string | Yes | Max 15 chars |
| email | string | Yes | Valid email |
| idType | enum | Yes | NIDA, PASSPORT, DRIVING_LICENSE, VOTER_ID |
| idNumber | string | Yes | Max 100 chars |
| position | string | No | Max 100 chars |

**Bank Account Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| bankName | string | Yes | Max 100 chars |
| accountNumber | string | Yes | Max 50 chars |
| accountName | string | Yes | Max 200 chars |
| branchName | string | No | Max 100 chars |
| swiftCode | string | No | Max 20 chars |

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Your account is pending approval. You will be notified once approved.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "spCode": "MWA",
    "businessName": "Mwanga Secondary School",
    "businessType": "SCHOOL",
    "email": "admin@mwanga.school.tz",
    "phoneNumber": "+255712345678",
    "status": "PENDING",
    "isActive": false
  }
}
```

**Error Responses:**
- **409 Conflict:** Email already exists
```json
{
  "statusCode": 409,
  "message": "Service provider with this email already exists"
}
```

- **409 Conflict:** Registration number already exists
```json
{
  "statusCode": 409,
  "message": "Business registration number already registered"
}
```

---

## Reference Management

### 1. Generate Single Reference

Create a payment reference for a customer.

**Endpoint:** `POST /sp/references`

**Authentication:** Required (SP JWT Token)

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "customerEmail": "john.doe@example.com",
  "customerId": "19900101-12345-67890-12",
  "customerIdType": "1",
  "customerAccount": "STD-2024-001",
  "amount": 50000,
  "minPaymentAmount": 10000,
  "description": "School fees for Term 1 2024",
  "currency": "TZS",
  "paymentOption": "INSTALLMENT",
  "metadata": {
    "studentId": "STD001",
    "class": "Form 1",
    "term": "Term 1"
  },
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Field Validation:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| customerName | string | Yes | Max 200 chars |
| customerPhone | string | Yes | Max 15 chars |
| customerEmail | string | No | Valid email |
| customerId | string | No | Max 50 chars |
| customerIdType | string | No | Max 20 chars |
| customerAccount | string | No | Max 100 chars |
| amount | number | Yes | Minimum 100 |
| minPaymentAmount | number | No | For partial payments |
| description | string | No | Payment purpose |
| currency | string | No | Default: TZS |
| paymentOption | enum | No | COMPLETE, INSTALLMENT, PARTIAL (default: COMPLETE) |
| metadata | object | No | Additional data |
| expiresAt | string | No | ISO 8601 date |

**Success Response (201):**
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
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-11-07T10:30:00.000Z"
  }
}
```

---

### 2. Generate Bulk References

Create multiple references in one request (up to 1000).

**Endpoint:** `POST /sp/references/bulk`

**Authentication:** Required (SP JWT Token)

**Request Body:**
```json
{
  "references": [
    {
      "customerName": "John Doe",
      "customerPhone": "+255712345678",
      "amount": 50000,
      "description": "School fees"
    },
    {
      "customerName": "Jane Smith",
      "customerPhone": "+255712345679",
      "amount": 45000,
      "description": "School fees"
    }
  ]
}
```

**Limits:**
- Maximum 1000 references per request
- Processing is asynchronous

**Success Response (202):**
```json
{
  "success": true,
  "message": "Bulk reference generation initiated",
  "data": {
    "batchId": "batch-550e8400-e29b-41d4-a716-446655440000",
    "totalRequested": 100,
    "status": "PROCESSING",
    "estimatedCompletionTime": "2024-11-07T10:35:00.000Z"
  }
}
```

**Check Batch Status:**

`GET /sp/references/bulk/:batchId`

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
    "startedAt": "2024-11-07T10:30:00.000Z",
    "completedAt": "2024-11-07T10:35:00.000Z",
    "downloadUrl": "http://192.168.1.94:8000/api/v1/sp/references/bulk/batch-550e8400/download"
  }
}
```

---

### 3. List References

Get paginated list of all references for your service provider.

**Endpoint:** `GET /sp/references`

**Authentication:** Required (SP JWT Token)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page |
| status | enum | No | - | Filter by status (ACTIVE, USED, EXPIRED, CANCELLED) |
| search | string | No | - | Search by customer name, phone, or reference number |

**Example Request:**
```http
GET /sp/references?page=1&limit=20&status=ACTIVE&search=john
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "referenceNumber": "MWA-0001234-A7B",
        "customerName": "John Doe",
        "customerPhone": "+255712345678",
        "amount": 50000,
        "status": "ACTIVE",
        "expiresAt": "2024-12-31T23:59:59.000Z",
        "createdAt": "2024-11-07T10:30:00.000Z"
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

### 4. Get Reference Details

Get detailed information about a specific reference.

**Endpoint:** `GET /sp/references/:referenceNumber`

**Authentication:** Required (SP JWT Token)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| referenceNumber | string | Reference number (e.g., MWA-0001234-A7B) |

**Example Request:**
```http
GET /sp/references/MWA-0001234-A7B
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "referenceNumber": "MWA-0001234-A7B",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "customerEmail": "john.doe@example.com",
    "amount": 50000,
    "minPaymentAmount": 10000,
    "description": "School fees for Term 1 2024",
    "status": "ACTIVE",
    "paymentOption": "INSTALLMENT",
    "metadata": {
      "studentId": "STD001",
      "class": "Form 1"
    },
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-11-07T10:30:00.000Z",
    "updatedAt": "2024-11-07T10:30:00.000Z"
  }
}
```

**Error Responses:**
- **404 Not Found:** Reference not found or no permission
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

### 5. Update Reference

Update reference details (only allowed for unpaid references).

**Endpoint:** `PATCH /sp/references/:referenceNumber`

**Authentication:** Required (SP JWT Token)

**Request Body (all fields optional):**
```json
{
  "customerName": "Updated Name",
  "customerPhone": "+255712345679",
  "amount": 75000,
  "description": "Updated description",
  "metadata": {
    "studentId": "STD001",
    "class": "Form 2"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reference updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "referenceNumber": "MWA-0001234-A7B",
    "customerName": "Updated Name",
    "customerPhone": "+255712345679",
    "amount": 75000,
    "status": "ACTIVE",
    "updatedAt": "2024-11-07T11:00:00.000Z"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Cannot update used reference
```json
{
  "statusCode": 400,
  "message": "Cannot update reference that has been used for payment"
}
```

---

### 6. Cancel Reference

Cancel an active reference.

**Endpoint:** `POST /sp/references/:referenceNumber/cancel`

**Authentication:** Required (SP JWT Token)

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reference cancelled successfully",
  "data": {
    "referenceNumber": "MWA-0001234-A7B",
    "status": "CANCELLED",
    "cancelledAt": "2024-11-07T11:00:00.000Z",
    "reason": "Customer requested cancellation"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Reference cannot be cancelled (already used/expired)

---

### 7. Get Reference Statistics

Get statistics for your references.

**Endpoint:** `GET /sp/references/statistics`

**Authentication:** Required (SP JWT Token)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Filter start date (ISO format) |
| endDate | string | No | Filter end date (ISO format) |

**Example Request:**
```http
GET /sp/references/statistics?startDate=2024-01-01&endDate=2024-12-31
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 1250,
    "active": 450,
    "used": 650,
    "expired": 100,
    "cancelled": 50,
    "totalAmount": 62500000,
    "averageAmount": 50000,
    "utilizationRate": 76.5,
    "byStatus": {
      "ACTIVE": 450,
      "USED": 650,
      "EXPIRED": 100,
      "CANCELLED": 50
    }
  }
}
```

---

## Payment Management

### 1. List Payments

Get paginated list of all payments for your service provider.

**Endpoint:** `GET /sp/payments`

**Authentication:** Required (SP JWT Token)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page |
| status | enum | No | - | Filter by status (SUCCESS, PENDING, FAILED) |
| startDate | string | No | - | Filter start date (ISO format) |
| endDate | string | No | - | Filter end date (ISO format) |
| search | string | No | - | Search by reference, payer name, or phone |

**Example Request:**
```http
GET /sp/payments?page=1&limit=20&status=SUCCESS&search=john
```

**Success Response (200):**
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
        "paidAt": "2024-11-07T10:30:00.000Z",
        "updatedAt": "2024-11-07T10:30:00.000Z"
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

### 2. Get Payment Statistics

Get payment statistics for your service provider.

**Endpoint:** `GET /sp/payments/statistics`

**Authentication:** Required (SP JWT Token)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Filter start date (ISO format) |
| endDate | string | No | Filter end date (ISO format) |

**Example Request:**
```http
GET /sp/payments/statistics?startDate=2024-01-01&endDate=2024-12-31
```

**Success Response (200):**
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
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "referenceNumber": "MWA-0001234-A7B",
        "amountPaid": 50000,
        "payerName": "John Doe",
        "paymentChannel": "MPESA",
        "status": "SUCCESS",
        "paidAt": "2024-11-07T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 3. Get Payments by Reference

Get all payments made against a specific reference number.

**Endpoint:** `GET /sp/payments/reference/:referenceNumber`

**Authentication:** Required (SP JWT Token)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| referenceNumber | string | Reference number (e.g., MWA-0001234-A7B) |

**Example Request:**
```http
GET /sp/payments/reference/MWA-0001234-A7B
```

**Success Response (200):**
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
        "paidAt": "2024-11-07T10:30:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "amountPaid": 25000,
        "payerName": "John Doe",
        "payerPhone": "+255712345678",
        "paymentChannel": "TIGOPESA",
        "status": "SUCCESS",
        "currency": "TZS",
        "paidAt": "2024-11-08T10:30:00.000Z"
      }
    ],
    "totalPaid": 50000,
    "paymentCount": 2
  }
}
```

---

### 4. Get Payment Summary

Get detailed payment summary including invoice amount, total paid, and remaining amount.

**Endpoint:** `GET /sp/payments/reference/:referenceNumber/summary`

**Authentication:** Required (SP JWT Token)

**Example Request:**
```http
GET /sp/payments/reference/MWA-0001234-A7B/summary
```

**Success Response (200):**
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
        "amountPaid": 25000,
        "paymentChannel": "MPESA",
        "paidAt": "2024-11-07T10:30:00.000Z"
      },
      {
        "amountPaid": 25000,
        "paymentChannel": "TIGOPESA",
        "paidAt": "2024-11-08T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Dashboard

### 1. Get Dashboard Overview

Get overview statistics for the service provider dashboard.

**Endpoint:** `GET /sp/dashboard/overview`

**Authentication:** Required (SP JWT Token)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Filter start date (ISO format) |
| endDate | string | No | Filter end date (ISO format) |

**Example Request:**
```http
GET /sp/dashboard/overview?startDate=2024-01-01&endDate=2024-12-31
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalReferences": 1250,
    "activeReferences": 450,
    "totalPayments": 800,
    "totalRevenue": 45000000,
    "pendingSettlement": 2500000,
    "recentActivity": [
      {
        "type": "PAYMENT",
        "description": "Payment received for MWA-0001234-A7B",
        "amount": 50000,
        "timestamp": "2024-11-07T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 2. Get Profile

Get the authenticated service provider's profile information.

**Endpoint:** `GET /sp/dashboard/profile`

**Authentication:** Required (SP JWT Token)

**Success Response (200):**
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
    "physicalAddress": "Plot 123, Uhuru Street",
    "region": "Kilimanjaro",
    "district": "Mwanga",
    "status": "APPROVED",
    "isActive": true,
    "contact": {
      "fullName": "John Smith",
      "phoneNumber": "+255712345678",
      "email": "john.smith@mwanga.school.tz",
      "position": "Headmaster"
    },
    "bankAccounts": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "bankName": "CRDB Bank",
        "accountNumber": "0150123456789",
        "accountName": "Mwanga Secondary School",
        "isPrimary": true,
        "isActive": true
      }
    ],
    "settings": {
      "commissionRate": 2.5,
      "settlementFrequency": "DAILY",
      "autoSettlement": false
    }
  }
}
```

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["customerName should not be empty", "amount must be a number"],
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found or you do not have permission to access it"
  }
}
```

---

## Frontend Implementation Examples

### TypeScript Types

```typescript
// Enums
export enum BusinessType {
  SCHOOL = 'SCHOOL',
  MICROFINANCE = 'MICROFINANCE',
  UTILITY = 'UTILITY',
  HEALTHCARE = 'HEALTHCARE',
  GOVERNMENT = 'GOVERNMENT',
  OTHER = 'OTHER',
}

export enum IdType {
  NIDA = 'NIDA',
  PASSPORT = 'PASSPORT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  VOTER_ID = 'VOTER_ID',
}

export enum ReferenceStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentOption {
  COMPLETE = 'COMPLETE',
  INSTALLMENT = 'INSTALLMENT',
  PARTIAL = 'PARTIAL',
}

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

// Service Provider Interface
export interface ServiceProvider {
  id: string;
  spCode: string;
  businessName: string;
  businessType: BusinessType;
  email: string;
  phoneNumber: string;
  status: string;
  isActive: boolean;
}

// Reference Interface
export interface Reference {
  id: string;
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  minPaymentAmount?: number;
  description?: string;
  status: ReferenceStatus;
  paymentOption: PaymentOption;
  metadata?: Record<string, any>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment Interface
export interface Payment {
  id: string;
  referenceNumber: string;
  amountPaid: number;
  payerName: string;
  payerPhone: string;
  paymentChannel: string;
  status: PaymentStatus;
  currency: string;
  paidAt: string;
}

// DTOs
export interface SpLoginDto {
  email: string;
  password: string;
}

export interface SpRegisterDto {
  businessName: string;
  businessType: BusinessType;
  otherBusinessType?: string;
  registrationNumber: string;
  tinNumber: string;
  phoneNumber: string;
  email: string;
  physicalAddress?: string;
  region?: string;
  district?: string;
  contact: {
    fullName: string;
    phoneNumber: string;
    email: string;
    idType: IdType;
    idNumber: string;
    position?: string;
  };
  bankAccounts: Array<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    branchName?: string;
    swiftCode?: string;
  }>;
  settings?: {
    commissionRate?: number;
    settlementFrequency?: string;
    autoSettlement?: boolean;
  };
}

export interface CreateReferenceDto {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerId?: string;
  customerIdType?: string;
  customerAccount?: string;
  amount: number;
  minPaymentAmount?: number;
  description?: string;
  currency?: string;
  paymentOption?: PaymentOption;
  metadata?: Record<string, any>;
  expiresAt?: string;
}

export interface ReferenceListResponse {
  success: boolean;
  data: {
    items: Reference[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
}

export interface PaymentListResponse {
  success: boolean;
  data: {
    items: Payment[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
}
```

### API Service Example (React/Next.js)

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.94:8000/api/v1';

// Create axios instance with auth
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('spAccessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('spAccessToken');
      window.location.href = '/sp/login';
    }
    return Promise.reject(error);
  }
);

// SP API Service
export const spApi = {
  // Authentication
  async login(data: SpLoginDto) {
    const response = await apiClient.post('/auth/sp/login', data);
    // Store token
    localStorage.setItem('spAccessToken', response.data.accessToken);
    localStorage.setItem('spRefreshToken', response.data.refreshToken);
    return response.data;
  },

  async register(data: SpRegisterDto) {
    const response = await apiClient.post('/auth/sp/register', data);
    return response.data;
  },

  // References
  async createReference(data: CreateReferenceDto): Promise<Reference> {
    const response = await apiClient.post('/sp/references', data);
    return response.data.data;
  },

  async listReferences(params?: {
    page?: number;
    limit?: number;
    status?: ReferenceStatus;
    search?: string;
  }): Promise<ReferenceListResponse> {
    const response = await apiClient.get('/sp/references', { params });
    return response.data;
  },

  async getReference(referenceNumber: string): Promise<Reference> {
    const response = await apiClient.get(`/sp/references/${referenceNumber}`);
    return response.data.data;
  },

  async updateReference(referenceNumber: string, data: Partial<CreateReferenceDto>): Promise<Reference> {
    const response = await apiClient.patch(`/sp/references/${referenceNumber}`, data);
    return response.data.data;
  },

  async cancelReference(referenceNumber: string, reason: string) {
    const response = await apiClient.post(`/sp/references/${referenceNumber}/cancel`, { reason });
    return response.data;
  },

  async getReferenceStatistics(params?: { startDate?: string; endDate?: string }) {
    const response = await apiClient.get('/sp/references/statistics', { params });
    return response.data.data;
  },

  // Payments
  async listPayments(params?: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<PaymentListResponse> {
    const response = await apiClient.get('/sp/payments', { params });
    return response.data;
  },

  async getPaymentStatistics(params?: { startDate?: string; endDate?: string }) {
    const response = await apiClient.get('/sp/payments/statistics', { params });
    return response.data.data;
  },

  async getPaymentsByReference(referenceNumber: string) {
    const response = await apiClient.get(`/sp/payments/reference/${referenceNumber}`);
    return response.data.data;
  },

  async getPaymentSummary(referenceNumber: string) {
    const response = await apiClient.get(`/sp/payments/reference/${referenceNumber}/summary`);
    return response.data.data;
  },

  // Dashboard
  async getDashboardOverview(params?: { startDate?: string; endDate?: string }) {
    const response = await apiClient.get('/sp/dashboard/overview', { params });
    return response.data.data;
  },

  async getProfile() {
    const response = await apiClient.get('/sp/dashboard/profile');
    return response.data.data;
  },
};
```

### React Component Example

```typescript
import { useState, useEffect } from 'react';
import { spApi } from './services/spApi';

function ReferenceManagement() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadReferences();
  }, [page]);

  const loadReferences = async () => {
    setLoading(true);
    try {
      const response = await spApi.listReferences({ page, limit: 20 });
      setReferences(response.data.items);
    } catch (error) {
      console.error('Failed to load references:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReference = async (data: CreateReferenceDto) => {
    try {
      await spApi.createReference(data);
      loadReferences(); // Reload list
    } catch (error) {
      console.error('Failed to create reference:', error);
    }
  };

  const handleCancelReference = async (referenceNumber: string, reason: string) => {
    try {
      await spApi.cancelReference(referenceNumber, reason);
      loadReferences(); // Reload list
    } catch (error) {
      console.error('Failed to cancel reference:', error);
    }
  };

  // Component JSX...
}
```

---

## Best Practices

1. **Always use HTTPS in production**
2. **Store JWT tokens securely** (httpOnly cookies or secure storage)
3. **Implement token refresh mechanism** for better UX (60-minute access token)
4. **Handle 401 responses** by redirecting to SP login
5. **Implement proper error handling** and user feedback
6. **Validate input on frontend** before sending to API
7. **Implement confirmation dialogs** for cancel operations
8. **Cache reference and payment lists** where appropriate
9. **Implement proper loading states** for better UX
10. **Use the reference number (not UUID)** when accessing reference details

---

## Rate Limits

- Single reference generation: 100 requests per minute
- Bulk reference generation: 10 requests per minute
- List endpoints: 60 requests per minute
- Statistics endpoints: 30 requests per minute

---

## Support

For issues or questions, contact the backend development team.

**API Version:** v1
**Last Updated:** January 2026
