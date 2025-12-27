# Financial Service Provider (FSP) API Documentation

## Overview

The Financial Service Provider API allows you to manage Banks and Mobile Network Operators (MNOs) in the UCG system. This includes creating, updating, listing, and managing FSP configurations.

**Base URL:** `http://192.168.1.94:8000/api/v1`

**Authentication:** All endpoints require JWT Bearer token authentication.

---

## FSP Types

- **MNO** - Mobile Network Operator (e.g., Vodacom M-Pesa, Airtel Money, Tigo Pesa, Halotel)
- **BANK** - Commercial Bank (e.g., CRDB, NMB, NBC, Equity Bank)

## FSP Status

- **ACTIVE** - FSP is operational and can process transactions
- **INACTIVE** - FSP is temporarily disabled
- **SUSPENDED** - FSP is suspended (usually due to issues or maintenance)

---

## Endpoints

### 1. Create FSP

Create a new Financial Service Provider (Bank or MNO).

**Endpoint:** `POST /financial-service-providers`

**Headers:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "fspCode": "VODACOM",
  "name": "Vodacom Tanzania PLC",
  "shortName": "Vodacom",
  "type": "MNO",
  "phoneNumber": "+255712345678",
  "email": "integration@vodacom.co.tz",
  "physicalAddress": "Ali Hassan Mwinyi Road, Dar es Salaam",
  "website": "https://vodacom.co.tz",
  "mnoCode": "VDC",
  "ussdCode": "*150#",
  "apiBaseUrl": "https://api.vodacom.co.tz/v1",
  "callbackUrl": "https://api.ucg.mhb.co.tz/api/v1/callbacks/vodacom",
  "webhookUrl": "https://api.ucg.mhb.co.tz/api/v1/webhooks/vodacom",
  "apiKey": "ak_live_xxxxxxxxxxxxxxxx",
  "apiSecret": "sk_live_xxxxxxxxxxxxxxxx",
  "glAccountNumber": "1001-2000-3000",
  "glAccountName": "Vodacom M-Pesa Collections",
  "glSettlementAccount": "1001-2000-3001",
  "glCommissionAccount": "1001-2000-3002",
  "glSuspenseAccount": "1001-2000-3003",
  "glRevenueAccount": "4001-5000-6000",
  "glChargesAccount": "4001-5000-6001",
  "transactionFeePercentage": 1.5,
  "transactionFeeFixed": 500,
  "settlementPeriodDays": 1,
  "logoUrl": "https://cdn.ucg.co.tz/logos/vodacom.png",
  "description": "M-Pesa mobile money services",
  "metadata": {
    "supportedCurrencies": ["TZS"],
    "maxTransactionAmount": 10000000,
    "minTransactionAmount": 1000
  }
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "fspCode": "VODACOM",
  "name": "Vodacom Tanzania PLC",
  "shortName": "Vodacom",
  "type": "MNO",
  "status": "ACTIVE",
  "phoneNumber": "+255712345678",
  "email": "integration@vodacom.co.tz",
  "physicalAddress": "Ali Hassan Mwinyi Road, Dar es Salaam",
  "website": "https://vodacom.co.tz",
  "mnoCode": "VDC",
  "ussdCode": "*150#",
  "apiBaseUrl": "https://api.vodacom.co.tz/v1",
  "callbackUrl": "https://api.ucg.mhb.co.tz/api/v1/callbacks/vodacom",
  "webhookUrl": "https://api.ucg.mhb.co.tz/api/v1/webhooks/vodacom",
  "transactionFeePercentage": 1.5,
  "transactionFeeFixed": 500,
  "settlementPeriodDays": 1,
  "totalTransactions": 0,
  "totalVolume": 0,
  "logoUrl": "https://cdn.ucg.co.tz/logos/vodacom.png",
  "description": "M-Pesa mobile money services",
  "metadata": {
    "supportedCurrencies": ["TZS"],
    "maxTransactionAmount": 10000000,
    "minTransactionAmount": 1000
  },
  "createdAt": "2025-12-22T10:30:00.000Z",
  "updatedAt": "2025-12-22T10:30:00.000Z"
}
```

---

### 2. List All FSPs

Get a paginated list of FSPs with optional filtering.

**Endpoint:** `GET /financial-service-providers`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page
- `type` (optional) - Filter by type: `MNO` or `BANK`
- `status` (optional) - Filter by status: `ACTIVE`, `INACTIVE`, `SUSPENDED`
- `search` (optional) - Search by name, short name, or FSP code

**Examples:**

```bash
# Get all FSPs (first page)
GET /financial-service-providers

# Get only MNOs
GET /financial-service-providers?type=MNO

# Get only active Banks
GET /financial-service-providers?type=BANK&status=ACTIVE

# Search for "Vodacom"
GET /financial-service-providers?search=Vodacom

# Pagination
GET /financial-service-providers?page=2&limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "fspCode": "VODACOM",
        "name": "Vodacom Tanzania PLC",
        "shortName": "Vodacom",
        "type": "MNO",
        "status": "ACTIVE",
        "phoneNumber": "+255712345678",
        "email": "integration@vodacom.co.tz",
        "totalTransactions": 15234,
        "totalVolume": 450000000,
        "lastTransactionAt": "2025-12-22T09:15:00.000Z",
        "createdAt": "2025-12-01T10:30:00.000Z",
        "updatedAt": "2025-12-22T10:30:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "fspCode": "CRDB",
        "name": "CRDB Bank PLC",
        "shortName": "CRDB",
        "type": "BANK",
        "status": "ACTIVE",
        "swiftCode": "CRDBTZTZ",
        "bankCode": "01",
        "totalTransactions": 8456,
        "totalVolume": 1200000000,
        "lastTransactionAt": "2025-12-22T08:45:00.000Z",
        "createdAt": "2025-12-01T11:00:00.000Z",
        "updatedAt": "2025-12-22T11:00:00.000Z"
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

---

### 3. Get FSP by ID

Retrieve detailed information about a specific FSP using its UUID.

**Endpoint:** `GET /financial-service-providers/:id`

**Example:**
```bash
GET /financial-service-providers/550e8400-e29b-41d4-a716-446655440000
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fspCode": "VODACOM",
    "name": "Vodacom Tanzania PLC",
    "shortName": "Vodacom",
    "type": "MNO",
    "status": "ACTIVE",
    "phoneNumber": "+255712345678",
    "email": "integration@vodacom.co.tz",
    "physicalAddress": "Ali Hassan Mwinyi Road, Dar es Salaam",
    "website": "https://vodacom.co.tz",
    "mnoCode": "VDC",
    "ussdCode": "*150#",
    "apiBaseUrl": "https://api.vodacom.co.tz/v1",
    "glAccountNumber": "1001-2000-3000",
    "glAccountName": "Vodacom M-Pesa Collections",
    "glSettlementAccount": "1001-2000-3001",
    "glCommissionAccount": "1001-2000-3002",
    "glSuspenseAccount": "1001-2000-3003",
    "glRevenueAccount": "4001-5000-6000",
    "glChargesAccount": "4001-5000-6001",
    "transactionFeePercentage": 1.5,
    "transactionFeeFixed": 500,
    "settlementPeriodDays": 1,
    "totalTransactions": 15234,
    "totalVolume": 450000000,
    "lastTransactionAt": "2025-12-22T09:15:00.000Z",
    "logoUrl": "https://cdn.ucg.co.tz/logos/vodacom.png",
    "description": "M-Pesa mobile money services",
    "metadata": {
      "supportedCurrencies": ["TZS"],
      "maxTransactionAmount": 10000000
    },
    "createdAt": "2025-12-01T10:30:00.000Z",
    "updatedAt": "2025-12-22T10:30:00.000Z"
  }
}
```

---

### 4. Get FSP by Code

Retrieve FSP details using the FSP code (e.g., VODACOM, CRDB).

**Endpoint:** `GET /financial-service-providers/code/:fspCode`

**Example:**
```bash
GET /financial-service-providers/code/VODACOM
```

**Response:** Same as "Get FSP by ID" above.

---

### 5. Update FSP

Update FSP details. Note: FSP code cannot be changed.

**Endpoint:** `PATCH /financial-service-providers/:id`

**Request Body (all fields optional):**
```json
{
  "name": "Vodacom Tanzania Limited",
  "phoneNumber": "+255712999999",
  "email": "support@vodacom.co.tz",
  "transactionFeePercentage": 2.0,
  "apiBaseUrl": "https://api-v2.vodacom.co.tz/v1"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "FSP updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fspCode": "VODACOM",
    "name": "Vodacom Tanzania Limited",
    "phoneNumber": "+255712999999",
    "email": "support@vodacom.co.tz",
    "transactionFeePercentage": 2.0,
    "apiBaseUrl": "https://api-v2.vodacom.co.tz/v1",
    "updatedAt": "2025-12-22T11:00:00.000Z"
  }
}
```

---

### 6. Activate FSP

Set FSP status to ACTIVE.

**Endpoint:** `POST /financial-service-providers/:id/activate`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "FSP activated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fspCode": "VODACOM",
    "name": "Vodacom Tanzania PLC",
    "status": "ACTIVE",
    "updatedAt": "2025-12-22T11:00:00.000Z"
  }
}
```

---

### 7. Deactivate FSP

Set FSP status to INACTIVE.

**Endpoint:** `POST /financial-service-providers/:id/deactivate`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "FSP deactivated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fspCode": "VODACOM",
    "name": "Vodacom Tanzania PLC",
    "status": "INACTIVE",
    "updatedAt": "2025-12-22T11:00:00.000Z"
  }
}
```

---

### 8. Suspend FSP

Suspend FSP operations with an optional reason.

**Endpoint:** `POST /financial-service-providers/:id/suspend`

**Request Body (optional):**
```json
{
  "reason": "Scheduled maintenance from 2025-12-23 to 2025-12-24"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "FSP suspended successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fspCode": "VODACOM",
    "name": "Vodacom Tanzania PLC",
    "status": "SUSPENDED",
    "metadata": {
      "suspensionReason": "Scheduled maintenance from 2025-12-23 to 2025-12-24",
      "suspendedAt": "2025-12-22T11:00:00.000Z"
    },
    "updatedAt": "2025-12-22T11:00:00.000Z"
  }
}
```

---

### 9. Delete FSP

Soft delete an FSP (sets `deletedAt` timestamp).

**Endpoint:** `DELETE /financial-service-providers/:id`

**Response (204 No Content)**

---

### 10. Get FSP Statistics

Get aggregated statistics for all FSPs.

**Endpoint:** `GET /financial-service-providers/statistics`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "byType": [
      { "type": "MNO", "count": 4 },
      { "type": "BANK", "count": 8 }
    ],
    "byStatus": [
      { "status": "ACTIVE", "count": 10 },
      { "status": "INACTIVE", "count": 1 },
      { "status": "SUSPENDED", "count": 1 }
    ],
    "totalTransactions": 125678,
    "totalVolume": 5234567890
  }
}
```

---

## General Ledger (GL) Accounts

Each FSP can have multiple GL accounts configured for different transaction types and financial flows. These accounts are used for accounting and reconciliation purposes.

### GL Account Types

| Account Type | Field Name | Purpose | Example |
|--------------|------------|---------|---------|
| **Main Account** | `glAccountNumber` | Primary GL account for the FSP | "1001-2000-3000" |
| **Account Name** | `glAccountName` | Description of the main GL account | "Vodacom M-Pesa Collections" |
| **Settlement Account** | `glSettlementAccount` | Where funds are settled to the FSP (T+N) | "1001-2000-3001" |
| **Commission Account** | `glCommissionAccount` | For transaction fees/commissions earned | "1001-2000-3002" |
| **Suspense Account** | `glSuspenseAccount` | For pending/unreconciled transactions | "1001-2000-3003" |
| **Revenue Account** | `glRevenueAccount` | Income from transaction fees | "4001-5000-6000" |
| **Charges Account** | `glChargesAccount` | Operating charges/expenses | "4001-5000-6001" |

### Example GL Account Setup for Vodacom M-Pesa

```json
{
  "glAccountNumber": "1001-2000-3000",
  "glAccountName": "Vodacom M-Pesa Collections",
  "glSettlementAccount": "1001-2000-3001",
  "glCommissionAccount": "1001-2000-3002",
  "glSuspenseAccount": "1001-2000-3003",
  "glRevenueAccount": "4001-5000-6000",
  "glChargesAccount": "4001-5000-6001"
}
```

### GL Account Flow Example

**Customer Payment Flow:**
1. **Collection** → `glAccountNumber` (Main account receives payment)
2. **Pending** → `glSuspenseAccount` (Held until confirmation)
3. **Confirmed** → `glSettlementAccount` (Ready for settlement to FSP)
4. **Commission** → `glCommissionAccount` (Transaction fee recorded)
5. **Revenue** → `glRevenueAccount` (Income recognized)

### Important Notes:

- All GL account fields are **optional** but recommended for proper accounting
- GL account numbers should follow your organization's chart of accounts format
- Each FSP can have unique GL account numbers
- GL accounts help with automated reconciliation and reporting
- Use consistent GL account numbering across FSPs for easier management

---

## Data Models

### Create FSP Request

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| fspCode | string(10) | Yes | Unique FSP code | "VODACOM" |
| name | string(200) | Yes | Full name | "Vodacom Tanzania PLC" |
| shortName | string(100) | No | Short name | "Vodacom" |
| type | enum | Yes | MNO or BANK | "MNO" |
| phoneNumber | string(15) | No | Contact phone | "+255712345678" |
| email | string(100) | No | Contact email | "support@vodacom.co.tz" |
| physicalAddress | text | No | Physical address | "Dar es Salaam" |
| website | string(100) | No | Website URL | "https://vodacom.co.tz" |
| swiftCode | string(20) | No | SWIFT code (banks) | "CRDBTZTZ" |
| bankCode | string(10) | No | Bank code | "01" |
| mnoCode | string(10) | No | MNO code | "VDC" |
| ussdCode | string(50) | No | USSD code | "*150#" |
| apiBaseUrl | text | No | API base URL | "https://api.vodacom.co.tz" |
| callbackUrl | text | No | Callback URL | "https://..." |
| webhookUrl | text | No | Webhook URL | "https://..." |
| apiKey | string(200) | No | API key (encrypted) | "ak_live_xxx" |
| apiSecret | text | No | API secret (encrypted) | "sk_live_xxx" |
| glAccountNumber | string(50) | No | Main GL account number | "1001-2000-3000" |
| glAccountName | string(200) | No | GL account name/description | "Vodacom M-Pesa Collections" |
| glSettlementAccount | string(50) | No | Settlement GL account | "1001-2000-3001" |
| glCommissionAccount | string(50) | No | Commission/fee GL account | "1001-2000-3002" |
| glSuspenseAccount | string(50) | No | Suspense GL account | "1001-2000-3003" |
| glRevenueAccount | string(50) | No | Revenue GL account | "4001-5000-6000" |
| glChargesAccount | string(50) | No | Charges/fees GL account | "4001-5000-6001" |
| transactionFeePercentage | decimal(5,2) | No | Fee % | 1.5 |
| transactionFeeFixed | decimal(10,2) | No | Fixed fee | 500 |
| settlementPeriodDays | integer | No | Days (default: 1) | 1 |
| logoUrl | text | No | Logo URL | "https://..." |
| description | text | No | Description | "M-Pesa services" |
| metadata | jsonb | No | Custom metadata | {} |

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["fspCode should not be empty", "type must be a valid enum value"],
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "FSP with ID '550e8400-e29b-41d4-a716-446655440000' not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "FSP with code 'VODACOM' already exists",
  "error": "Conflict"
}
```

---

## Example Use Cases

### Creating an MNO (Vodacom M-Pesa)

```bash
curl -X POST http://192.168.1.94:8000/api/v1/financial-service-providers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fspCode": "VODACOM",
    "name": "Vodacom Tanzania PLC",
    "shortName": "Vodacom",
    "type": "MNO",
    "mnoCode": "VDC",
    "ussdCode": "*150#",
    "glAccountNumber": "1001-2000-3000",
    "glAccountName": "Vodacom M-Pesa Collections",
    "glSettlementAccount": "1001-2000-3001",
    "glCommissionAccount": "1001-2000-3002",
    "glSuspenseAccount": "1001-2000-3003",
    "glRevenueAccount": "4001-5000-6000",
    "glChargesAccount": "4001-5000-6001",
    "transactionFeePercentage": 1.5,
    "settlementPeriodDays": 1
  }'
```

### Creating a Bank (CRDB)

```bash
curl -X POST http://192.168.1.94:8000/api/v1/financial-service-providers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fspCode": "CRDB",
    "name": "CRDB Bank PLC",
    "shortName": "CRDB",
    "type": "BANK",
    "swiftCode": "CRDBTZTZ",
    "bankCode": "01",
    "glAccountNumber": "2001-3000-4000",
    "glAccountName": "CRDB Bank Collections",
    "glSettlementAccount": "2001-3000-4001",
    "glCommissionAccount": "2001-3000-4002",
    "glSuspenseAccount": "2001-3000-4003",
    "glRevenueAccount": "5001-6000-7000",
    "glChargesAccount": "5001-6000-7001",
    "transactionFeePercentage": 0.5,
    "settlementPeriodDays": 2
  }'
```

### Listing All Active MNOs

```bash
curl -X GET "http://192.168.1.94:8000/api/v1/financial-service-providers?type=MNO&status=ACTIVE" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Common FSP Codes in Tanzania

### Mobile Network Operators (MNOs)
- **VODACOM** - Vodacom M-Pesa
- **AIRTEL** - Airtel Money
- **TIGO** - Tigo Pesa
- **HALOTEL** - Halotel Pesa

### Banks
- **CRDB** - CRDB Bank
- **NMB** - NMB Bank
- **NBC** - National Bank of Commerce
- **EQUITY** - Equity Bank
- **STANBIC** - Stanbic Bank
- **EXIM** - Exim Bank
- **DTB** - Diamond Trust Bank
- **AZANIA** - Azania Bank

---

## Notes for Frontend Developers

1. **Authentication Required:** All endpoints require a valid JWT token in the `Authorization` header.

2. **FSP Code is Immutable:** Once created, the `fspCode` cannot be changed. Use PATCH to update other fields.

3. **Soft Delete:** Deleted FSPs are not removed from the database; they're marked with `deletedAt` timestamp.

4. **Status Management:** Use the dedicated endpoints (`/activate`, `/deactivate`, `/suspend`) to change FSP status.

5. **Pagination:** Default pagination is 20 items per page. Adjust using `limit` parameter (max recommended: 100).

6. **Search:** The search parameter performs case-insensitive partial matching on name, shortName, and fspCode.

7. **Statistics:** Use the `/statistics` endpoint for dashboard displays and analytics.

8. **Type-Specific Fields:**
   - For MNOs: Use `mnoCode` and `ussdCode`
   - For Banks: Use `swiftCode` and `bankCode`

9. **Sensitive Data:** `apiKey` and `apiSecret` are stored encrypted and not returned in responses.

10. **Settlement Period:** T+N days (e.g., T+1 means next day settlement).

11. **GL Accounts:** Configure GL accounts for proper accounting and reconciliation. All 7 GL account fields are optional but recommended for financial tracking.

12. **GL Account Numbering:** Use your organization's chart of accounts format. Common formats include: "XXXX-XXXX-XXXX" or "XXXXXXXX".

---

## Swagger Documentation

Access interactive API documentation at:
```
http://192.168.1.94:8000/api/docs
```

Look for the **"Financial Service Providers"** tag.
