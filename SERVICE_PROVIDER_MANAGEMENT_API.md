# Service Provider Management API Documentation

## Base URL
```
http://192.168.1.94:8000/api/v1
```

## Authentication
All endpoints require JWT Bearer token authentication from admin/user login.

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Table of Contents
1. [Service Provider Roles & Permissions](#service-provider-roles--permissions)
2. [Onboarding Status](#onboarding-status)
3. [Business Types](#business-types)
4. [Endpoints](#endpoints)
   - [Create Service Provider](#1-create-service-provider)
   - [List Service Providers](#2-list-service-providers)
   - [Get Service Provider Statistics](#3-get-service-provider-statistics)
   - [Get Service Provider by ID](#4-get-service-provider-by-id)
   - [Get Service Provider by Code](#5-get-service-provider-by-code)
   - [Update Service Provider](#6-update-service-provider)
   - [Approve Service Provider](#7-approve-service-provider)
   - [Reject Service Provider](#8-reject-service-provider)
   - [Toggle Activation](#9-toggle-activation)
   - [Soft Delete Service Provider](#10-soft-delete-service-provider)
   - [Bank Account Management](#bank-account-management)

---

## Service Provider Roles & Permissions

### Required Admin Roles
| Endpoint | SUPER_ADMIN | ADMIN | MANAGER | OPERATOR | VIEWER |
|----------|-------------|-------|---------|----------|--------|
| Create SP | ✅ | ✅ | ❌ | ❌ | ❌ |
| List SPs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Get Statistics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Get SP Details | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update SP | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve SP | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reject SP | ✅ | ✅ | ❌ | ❌ | ❌ |
| Toggle Activation | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete SP | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Onboarding Status

```typescript
enum OnboardingStatus {
  PENDING = 'PENDING',       // Awaiting approval
  APPROVED = 'APPROVED',     // Approved and can login
  ACTIVE = 'ACTIVE',         // Active and operational
  REJECTED = 'REJECTED',     // Rejected (with reason)
  SUSPENDED = 'SUSPENDED',   // Temporarily suspended
  DEACTIVATED = 'DEACTIVATED' // Deactivated
}
```

---

## Business Types

```typescript
enum ServiceProviderType {
  SCHOOL = 'SCHOOL',               // Educational institutions
  MICROFINANCE = 'MICROFINANCE',   // MFIs, SACCOs
  UTILITY = 'UTILITY',             // Water, electricity
  HEALTHCARE = 'HEALTHCARE',       // Hospitals, clinics
  GOVERNMENT = 'GOVERNMENT',       // Government agencies
  OTHER = 'OTHER'                  // Other (specify in otherBusinessType)
}
```

---

## Endpoints

### 1. Create Service Provider

Register a new service provider (admin-initiated).

**Endpoint:** `POST /service-providers`

**Required Role:** `SUPER_ADMIN`, `ADMIN`

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
  "physicalAddress": "Plot 123, Uhuru Street, Moshi",
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
      "swiftCode": "CORUTZTZ",
      "isPrimary": true
    }
  ],
  "settings": {
    "commissionRate": 2.5,
    "settlementFrequency": "DAILY",
    "autoSettlement": false,
    "minimumSettlementAmount": 10000,
    "webhookUrl": "https://mwanga.school.tz/api/webhook",
    "webhookEnabled": false,
    "emailNotifications": true,
    "smsNotifications": true,
    "dailyTransactionLimit": 1000000,
    "apiRateLimit": 100
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
| registrationNumber | string | Yes | **Unique**, max 100 chars |
| tinNumber | string | Yes | **Unique**, max 100 chars |
| phoneNumber | string | Yes | Max 15 chars |
| email | string | Yes | Valid email, **unique**, max 100 chars |
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

**Bank Account Fields (at least 1 required):**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| bankName | string | Yes | Max 100 chars |
| accountNumber | string | Yes | Max 50 chars |
| accountName | string | Yes | Max 200 chars |
| branchName | string | No | Max 100 chars |
| swiftCode | string | No | Max 20 chars |
| isPrimary | boolean | No | Default: false |

**Settings Fields (all optional):**
| Field | Type | Default | Validation |
|-------|------|---------|------------|
| commissionRate | number | 0 | 0-100 |
| settlementFrequency | enum | DAILY | DAILY, WEEKLY, MONTHLY |
| autoSettlement | boolean | true | |
| minimumSettlementAmount | number | 0 | Min: 0 |
| webhookUrl | string | null | Valid URL |
| webhookEnabled | boolean | false | |
| emailNotifications | boolean | true | |
| smsNotifications | boolean | true | |
| dailyTransactionLimit | number | null | Min: 0 |
| apiRateLimit | number | 100 | 1-1000 |

**Success Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "spCode": "MWA",
  "businessName": "Mwanga Secondary School",
  "businessType": "SCHOOL",
  "otherBusinessType": null,
  "registrationNumber": "BN123456789",
  "tinNumber": "123-456-789",
  "phoneNumber": "+255712345678",
  "email": "admin@mwanga.school.tz",
  "physicalAddress": "Plot 123, Uhuru Street, Moshi",
  "region": "Kilimanjaro",
  "district": "Mwanga",
  "status": "PENDING",
  "isActive": false,
  "createdAt": "2025-12-15T10:30:00.000Z",
  "updatedAt": "2025-12-15T10:30:00.000Z",
  "contact": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "fullName": "John Smith",
    "phoneNumber": "+255712345678",
    "email": "john.smith@mwanga.school.tz",
    "idType": "NIDA",
    "idNumber": "19850101-12345-67890-12",
    "position": "Headmaster"
  },
  "bankAccounts": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
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

- **409 Conflict:** TIN already exists
```json
{
  "statusCode": 409,
  "message": "TIN number already registered"
}
```

---

### 2. List Service Providers

Get paginated list of service providers with filtering.

**Endpoint:** `GET /service-providers`

**Required Role:** `SUPER_ADMIN`, `ADMIN`, `MANAGER`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |
| status | enum | No | - | Filter by onboarding status |
| businessType | enum | No | - | Filter by business type |
| search | string | No | - | Search by business name, email, or SP code |
| isActive | boolean | No | - | Filter by active status |

**Example Request:**
```http
GET /service-providers?page=1&limit=20&status=APPROVED&businessType=SCHOOL&search=mwanga
```

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "spCode": "MWA",
      "businessName": "Mwanga Secondary School",
      "businessType": "SCHOOL",
      "email": "admin@mwanga.school.tz",
      "phoneNumber": "+255712345678",
      "region": "Kilimanjaro",
      "district": "Mwanga",
      "status": "APPROVED",
      "isActive": true,
      "createdAt": "2025-12-01T10:30:00.000Z",
      "contact": {
        "fullName": "John Smith",
        "phoneNumber": "+255712345678"
      }
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

### 3. Get Service Provider Statistics

Get overall service provider statistics.

**Endpoint:** `GET /service-providers/statistics`

**Required Role:** `SUPER_ADMIN`, `ADMIN`, `MANAGER`

**Success Response (200):**
```json
{
  "total": 250,
  "pending": 35,
  "approved": 180,
  "active": 150,
  "rejected": 10,
  "suspended": 5,
  "byBusinessType": {
    "SCHOOL": 120,
    "MICROFINANCE": 50,
    "UTILITY": 30,
    "HEALTHCARE": 25,
    "GOVERNMENT": 15,
    "OTHER": 10
  },
  "byRegion": {
    "Dar es Salaam": 80,
    "Kilimanjaro": 45,
    "Arusha": 35
  },
  "activeCount": 150,
  "inactiveCount": 100
}
```

---

### 4. Get Service Provider by ID

Get detailed information about a specific service provider.

**Endpoint:** `GET /service-providers/:id`

**Required Role:** `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `OPERATOR`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Service Provider ID |

**Example Request:**
```http
GET /service-providers/550e8400-e29b-41d4-a716-446655440000
```

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "spCode": "MWA",
  "businessName": "Mwanga Secondary School",
  "businessType": "SCHOOL",
  "otherBusinessType": null,
  "registrationNumber": "BN123456789",
  "tinNumber": "123-456-789",
  "phoneNumber": "+255712345678",
  "email": "admin@mwanga.school.tz",
  "physicalAddress": "Plot 123, Uhuru Street, Moshi",
  "region": "Kilimanjaro",
  "district": "Mwanga",
  "status": "APPROVED",
  "isActive": true,
  "rejectionReason": null,
  "approvedAt": "2025-12-10T10:30:00.000Z",
  "approvedBy": "admin-user-id",
  "createdAt": "2025-12-01T10:30:00.000Z",
  "updatedAt": "2025-12-15T10:30:00.000Z",
  "contact": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "fullName": "John Smith",
    "phoneNumber": "+255712345678",
    "email": "john.smith@mwanga.school.tz",
    "idType": "NIDA",
    "idNumber": "19850101-12345-67890-12",
    "position": "Headmaster"
  },
  "bankAccounts": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "bankName": "CRDB Bank",
      "accountNumber": "0150123456789",
      "accountName": "Mwanga Secondary School",
      "branchName": "Moshi Branch",
      "swiftCode": "CORUTZTZ",
      "isPrimary": true,
      "isActive": true
    }
  ],
  "settings": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "commissionRate": 2.5,
    "settlementFrequency": "DAILY",
    "autoSettlement": false,
    "minimumSettlementAmount": 10000,
    "webhookUrl": "https://mwanga.school.tz/api/webhook",
    "webhookEnabled": false,
    "emailNotifications": true,
    "smsNotifications": true,
    "dailyTransactionLimit": 1000000,
    "apiRateLimit": 100
  }
}
```

**Error Responses:**
- **404 Not Found:** Service provider not found
```json
{
  "statusCode": 404,
  "message": "Service provider not found"
}
```

---

### 5. Get Service Provider by Code

Get service provider details using SP code (3 characters).

**Endpoint:** `GET /service-providers/code/:spCode`

**Required Role:** `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `OPERATOR`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| spCode | string | Service Provider Code (e.g., MWA) |

**Example Request:**
```http
GET /service-providers/code/MWA
```

**Success Response (200):**
Same as "Get Service Provider by ID"

---

### 6. Update Service Provider

Update service provider details.

**Endpoint:** `PATCH /service-providers/:id`

**Required Role:** `SUPER_ADMIN`, `ADMIN`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Service Provider ID |

**Request Body (All fields optional):**
```json
{
  "businessName": "Updated School Name",
  "phoneNumber": "+255712345679",
  "email": "newemail@mwanga.school.tz",
  "physicalAddress": "New Address",
  "region": "Kilimanjaro",
  "district": "Mwanga",
  "status": "ACTIVE",
  "contact": {
    "fullName": "Jane Doe",
    "phoneNumber": "+255712345680",
    "email": "jane.doe@mwanga.school.tz",
    "idType": "NIDA",
    "idNumber": "19900101-12345-67890-12",
    "position": "Deputy Headmaster"
  },
  "bankAccounts": [
    {
      "bankName": "NBC Bank",
      "accountNumber": "0110987654321",
      "accountName": "Mwanga Secondary School",
      "isPrimary": true
    }
  ],
  "settings": {
    "commissionRate": 3.0,
    "settlementFrequency": "WEEKLY",
    "autoSettlement": true
  }
}
```

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "spCode": "MWA",
  "businessName": "Updated School Name",
  "email": "newemail@mwanga.school.tz",
  "status": "ACTIVE",
  "updatedAt": "2025-12-15T11:00:00.000Z"
}
```

**Error Responses:**
- **404 Not Found:** Service provider not found
- **409 Conflict:** Email already in use by another SP
- **409 Conflict:** Registration number already in use
- **409 Conflict:** TIN already in use

---

### 7. Approve Service Provider

Approve a pending service provider onboarding.

**Endpoint:** `POST /service-providers/:id/approve`

**Required Role:** `SUPER_ADMIN`, `ADMIN`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Service Provider ID |

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "spCode": "MWA",
  "businessName": "Mwanga Secondary School",
  "status": "APPROVED",
  "isActive": true,
  "approvedAt": "2025-12-15T11:00:00.000Z",
  "approvedBy": "admin-user-id"
}
```

**Error Responses:**
- **404 Not Found:** Service provider not found
- **400 Bad Request:** Already approved
```json
{
  "statusCode": 400,
  "message": "Service provider is already approved"
}
```

---

### 8. Reject Service Provider

Reject a pending service provider onboarding.

**Endpoint:** `POST /service-providers/:id/reject`

**Required Role:** `SUPER_ADMIN`, `ADMIN`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Service Provider ID |

**Request Body:**
```json
{
  "rejectionReason": "Incomplete documentation. Missing business registration certificate."
}
```

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "spCode": "MWA",
  "businessName": "Mwanga Secondary School",
  "status": "REJECTED",
  "isActive": false,
  "rejectionReason": "Incomplete documentation. Missing business registration certificate.",
  "rejectedAt": "2025-12-15T11:00:00.000Z"
}
```

---

### 9. Toggle Activation

Activate or deactivate a service provider.

**Endpoint:** `PATCH /service-providers/:id/toggle-activation`

**Required Role:** `SUPER_ADMIN`, `ADMIN`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Service Provider ID |

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "spCode": "MWA",
  "businessName": "Mwanga Secondary School",
  "isActive": false,
  "updatedAt": "2025-12-15T11:00:00.000Z"
}
```

**Note:** This toggles between active and inactive. When deactivated, the SP cannot login or perform any operations.

---

### 10. Soft Delete Service Provider

Soft delete a service provider (marks as deleted but keeps record).

**Endpoint:** `DELETE /service-providers/:id`

**Required Role:** `SUPER_ADMIN` only

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Service Provider ID |

**Success Response (204):**
```
No Content
```

**Note:** The service provider record is not removed from the database, only marked as deleted with a `deletedAt` timestamp. The SP cannot login after soft deletion.

---

## Bank Account Management

### Get All Bank Accounts

**Endpoint:** `GET /service-providers/:id/bank-accounts`

**Success Response (200):**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "bankName": "CRDB Bank",
    "accountNumber": "0150123456789",
    "accountName": "Mwanga Secondary School",
    "branchName": "Moshi Branch",
    "swiftCode": "CORUTZTZ",
    "isPrimary": true,
    "isActive": true
  }
]
```

---

### Get Single Bank Account

**Endpoint:** `GET /service-providers/:id/bank-accounts/:accountId`

**Success Response (200):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "bankName": "CRDB Bank",
  "accountNumber": "0150123456789",
  "accountName": "Mwanga Secondary School",
  "branchName": "Moshi Branch",
  "swiftCode": "CORUTZTZ",
  "accountType": "SAVINGS",
  "isPrimary": true,
  "isActive": true
}
```

---

### Add Bank Account

**Endpoint:** `POST /service-providers/:id/bank-accounts`

**Request Body:**
```json
{
  "bankName": "NBC Bank",
  "accountNumber": "0110987654321",
  "accountName": "Mwanga Secondary School",
  "branchName": "Dar es Salaam Branch",
  "swiftCode": "NLCBTZTZ",
  "isPrimary": false
}
```

**Success Response (201):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "bankName": "NBC Bank",
  "accountNumber": "0110987654321",
  "accountName": "Mwanga Secondary School",
  "isPrimary": false,
  "isActive": true
}
```

---

### Update Bank Account

**Endpoint:** `PATCH /service-providers/:id/bank-accounts/:accountId`

**Request Body (all fields optional):**
```json
{
  "bankName": "Updated Bank Name",
  "accountNumber": "0110987654322",
  "branchName": "New Branch"
}
```

**Success Response (200):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "bankName": "Updated Bank Name",
  "accountNumber": "0110987654322",
  "branchName": "New Branch",
  "isActive": true
}
```

---

### Set Primary Bank Account

**Endpoint:** `POST /service-providers/:id/bank-accounts/:accountId/set-primary`

**Success Response (200):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "bankName": "NBC Bank",
  "accountNumber": "0110987654321",
  "isPrimary": true,
  "isActive": true
}
```

**Note:** This automatically unsets other accounts as primary.

---

### Delete Bank Account

**Endpoint:** `DELETE /service-providers/:id/bank-accounts/:accountId`

**Success Response (204):**
```
No Content
```

**Error Responses:**
- **400 Bad Request:** Cannot delete the only active bank account
```json
{
  "statusCode": 400,
  "message": "Cannot delete the only active bank account"
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
  "message": ["businessName should not be empty", "email must be an email"],
  "error": "Bad Request"
}
```

---

## Frontend Implementation Examples

### TypeScript Types

```typescript
// Enums
export enum OnboardingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

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

export enum SettlementFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

// Service Provider Interface
export interface ServiceProvider {
  id: string;
  spCode: string;
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
  status: OnboardingStatus;
  isActive: boolean;
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
  bankAccounts?: BankAccount[];
  settings?: Settings;
}

export interface Contact {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  idType: IdType;
  idNumber: string;
  position?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branchName?: string;
  swiftCode?: string;
  accountType?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface Settings {
  id: string;
  commissionRate: number;
  settlementFrequency: SettlementFrequency;
  autoSettlement: boolean;
  minimumSettlementAmount?: number;
  webhookUrl?: string;
  webhookEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  dailyTransactionLimit?: number;
  apiRateLimit: number;
}

// DTOs
export interface CreateServiceProviderDto {
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
    isPrimary?: boolean;
  }>;
  settings?: {
    commissionRate?: number;
    settlementFrequency?: SettlementFrequency;
    autoSettlement?: boolean;
    minimumSettlementAmount?: number;
    webhookUrl?: string;
    webhookEnabled?: boolean;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    dailyTransactionLimit?: number;
    apiRateLimit?: number;
  };
}

export interface UpdateServiceProviderDto {
  businessName?: string;
  phoneNumber?: string;
  email?: string;
  physicalAddress?: string;
  region?: string;
  district?: string;
  status?: OnboardingStatus;
  contact?: Partial<Contact>;
  bankAccounts?: Array<Partial<BankAccount>>;
  settings?: Partial<Settings>;
}

export interface ServiceProviderListResponse {
  data: ServiceProvider[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ServiceProviderStatistics {
  total: number;
  pending: number;
  approved: number;
  active: number;
  rejected: number;
  suspended: number;
  byBusinessType: Record<BusinessType, number>;
  byRegion: Record<string, number>;
  activeCount: number;
  inactiveCount: number;
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
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Service Provider API
export const serviceProviderApi = {
  // Create service provider
  async createServiceProvider(data: CreateServiceProviderDto): Promise<ServiceProvider> {
    const response = await apiClient.post('/service-providers', data);
    return response.data;
  },

  // List service providers
  async listServiceProviders(params?: {
    page?: number;
    limit?: number;
    status?: OnboardingStatus;
    businessType?: BusinessType;
    search?: string;
    isActive?: boolean;
  }): Promise<ServiceProviderListResponse> {
    const response = await apiClient.get('/service-providers', { params });
    return response.data;
  },

  // Get statistics
  async getStatistics(): Promise<ServiceProviderStatistics> {
    const response = await apiClient.get('/service-providers/statistics');
    return response.data;
  },

  // Get service provider by ID
  async getServiceProviderById(id: string): Promise<ServiceProvider> {
    const response = await apiClient.get(`/service-providers/${id}`);
    return response.data;
  },

  // Get service provider by code
  async getServiceProviderByCode(spCode: string): Promise<ServiceProvider> {
    const response = await apiClient.get(`/service-providers/code/${spCode}`);
    return response.data;
  },

  // Update service provider
  async updateServiceProvider(id: string, data: UpdateServiceProviderDto): Promise<ServiceProvider> {
    const response = await apiClient.patch(`/service-providers/${id}`, data);
    return response.data;
  },

  // Approve service provider
  async approveServiceProvider(id: string): Promise<ServiceProvider> {
    const response = await apiClient.post(`/service-providers/${id}/approve`);
    return response.data;
  },

  // Reject service provider
  async rejectServiceProvider(id: string, rejectionReason: string): Promise<ServiceProvider> {
    const response = await apiClient.post(`/service-providers/${id}/reject`, { rejectionReason });
    return response.data;
  },

  // Toggle activation
  async toggleActivation(id: string): Promise<ServiceProvider> {
    const response = await apiClient.patch(`/service-providers/${id}/toggle-activation`);
    return response.data;
  },

  // Soft delete service provider
  async softDeleteServiceProvider(id: string): Promise<void> {
    await apiClient.delete(`/service-providers/${id}`);
  },

  // Bank account management
  async getBankAccounts(id: string): Promise<BankAccount[]> {
    const response = await apiClient.get(`/service-providers/${id}/bank-accounts`);
    return response.data;
  },

  async addBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
    const response = await apiClient.post(`/service-providers/${id}/bank-accounts`, data);
    return response.data;
  },

  async setPrimaryBankAccount(id: string, accountId: string): Promise<BankAccount> {
    const response = await apiClient.post(`/service-providers/${id}/bank-accounts/${accountId}/set-primary`);
    return response.data;
  },

  async deleteBankAccount(id: string, accountId: string): Promise<void> {
    await apiClient.delete(`/service-providers/${id}/bank-accounts/${accountId}`);
  },
};
```

### React Component Example

```typescript
import { useState, useEffect } from 'react';
import { serviceProviderApi } from './services/serviceProviderApi';

function ServiceProviderManagement() {
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [stats, setStats] = useState<ServiceProviderStatistics | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServiceProviders();
    loadStatistics();
  }, [page]);

  const loadServiceProviders = async () => {
    setLoading(true);
    try {
      const response = await serviceProviderApi.listServiceProviders({ page, limit: 20 });
      setServiceProviders(response.data);
    } catch (error) {
      console.error('Failed to load service providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await serviceProviderApi.getStatistics();
      setStats(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await serviceProviderApi.approveServiceProvider(id);
      loadServiceProviders(); // Reload list
    } catch (error) {
      console.error('Failed to approve service provider:', error);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await serviceProviderApi.rejectServiceProvider(id, reason);
      loadServiceProviders(); // Reload list
    } catch (error) {
      console.error('Failed to reject service provider:', error);
    }
  };

  const handleToggleActivation = async (id: string) => {
    try {
      await serviceProviderApi.toggleActivation(id);
      loadServiceProviders(); // Reload list
    } catch (error) {
      console.error('Failed to toggle activation:', error);
    }
  };

  // Component JSX...
}
```

---

## Best Practices

1. **Always use HTTPS in production**
2. **Store JWT tokens securely** (httpOnly cookies recommended)
3. **Implement token refresh mechanism** for better UX
4. **Handle 401 responses** by redirecting to login
5. **Implement proper error handling** and user feedback
6. **Use role-based UI rendering** to hide unauthorized actions
7. **Validate input on frontend** before sending to API
8. **Implement confirmation dialogs** for approve/reject/delete operations
9. **Cache service provider lists** and statistics where appropriate
10. **Implement proper loading states** for better UX
11. **Verify unique fields** (email, registration number, TIN) before submission
12. **Provide clear rejection reasons** when rejecting SP applications

---

## Service Provider Lifecycle

```
PENDING → APPROVED → ACTIVE → (SUSPENDED/DEACTIVATED)
   ↓
REJECTED
```

1. **PENDING**: New registration, awaiting approval
2. **APPROVED**: Admin approved, SP can login
3. **ACTIVE**: Actively using the system
4. **REJECTED**: Application rejected with reason
5. **SUSPENDED**: Temporarily suspended (can be reactivated)
6. **DEACTIVATED**: Permanently deactivated

---

## Support

For issues or questions, contact the backend development team.

**API Version:** v1
**Last Updated:** January 2026
