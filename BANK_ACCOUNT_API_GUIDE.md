# Bank Account CRUD API Guide

## Overview

Complete CRUD operations have been added for managing service provider bank accounts. These endpoints allow you to add, view, update, and delete bank accounts associated with service providers.

## Features

- ✅ List all bank accounts for a service provider
- ✅ Get a specific bank account by ID
- ✅ Add new bank accounts to a service provider
- ✅ Update existing bank account details
- ✅ Set a bank account as primary (for settlements)
- ✅ Soft delete (deactivate) bank accounts
- ✅ Automatic primary account management
- ✅ Validation to prevent deletion of the only active account

## API Endpoints

### 1. Get All Bank Accounts

Retrieve all bank accounts for a specific service provider, ordered by primary status and creation date.

```http
GET /api/service-providers/{id}/bank-accounts
```

**Parameters:**
- `id` (path) - Service provider UUID

**Response:**
```json
[
  {
    "id": "account-uuid-1",
    "serviceProviderId": "sp-uuid",
    "bankName": "CRDB Bank",
    "accountNumber": "0150123456789",
    "accountName": "Mwanga Primary School",
    "swiftCode": "CORUTZTZ",
    "branchName": "Dar es Salaam Branch",
    "branchCode": "001",
    "accountType": "SAVINGS",
    "isPrimary": true,
    "isActive": true,
    "createdAt": "2025-11-10T08:00:00Z",
    "updatedAt": "2025-11-10T08:00:00Z"
  },
  {
    "id": "account-uuid-2",
    "serviceProviderId": "sp-uuid",
    "bankName": "NMB Bank",
    "accountNumber": "12340056789",
    "accountName": "Mwanga Primary School",
    "swiftCode": "NLIBTZTZ",
    "branchName": "Kinondoni Branch",
    "accountType": "CURRENT",
    "isPrimary": false,
    "isActive": true,
    "createdAt": "2025-11-10T09:00:00Z",
    "updatedAt": "2025-11-10T09:00:00Z"
  }
]
```

### 2. Get a Specific Bank Account

Retrieve details of a single bank account.

```http
GET /api/service-providers/{id}/bank-accounts/{accountId}
```

**Parameters:**
- `id` (path) - Service provider UUID
- `accountId` (path) - Bank account UUID

**Response:**
```json
{
  "id": "account-uuid-1",
  "serviceProviderId": "sp-uuid",
  "bankName": "CRDB Bank",
  "accountNumber": "0150123456789",
  "accountName": "Mwanga Primary School",
  "swiftCode": "CORUTZTZ",
  "branchName": "Dar es Salaam Branch",
  "branchCode": "001",
  "accountType": "SAVINGS",
  "isPrimary": true,
  "isActive": true,
  "createdAt": "2025-11-10T08:00:00Z",
  "updatedAt": "2025-11-10T08:00:00Z"
}
```

### 3. Add a New Bank Account

Add a new bank account to a service provider.

```http
POST /api/service-providers/{id}/bank-accounts
Content-Type: application/json
```

**Parameters:**
- `id` (path) - Service provider UUID

**Request Body:**
```json
{
  "bankName": "NMB Bank",
  "accountNumber": "12340056789",
  "accountName": "Mwanga Primary School",
  "swiftCode": "NLIBTZTZ",
  "branchName": "Kinondoni Branch",
  "branchCode": "002",
  "accountType": "CURRENT",
  "isPrimary": false
}
```

**Field Descriptions:**
- `bankName` (required) - Name of the bank (max 100 chars)
- `accountNumber` (required) - Bank account number (max 50 chars)
- `accountName` (required) - Account holder name (max 100 chars)
- `swiftCode` (optional) - SWIFT/BIC code (max 20 chars)
- `branchName` (optional) - Bank branch name (max 100 chars)
- `branchCode` (optional) - Branch code (max 100 chars)
- `accountType` (optional) - Account type, defaults to "SAVINGS" (max 20 chars)
- `isPrimary` (optional) - Mark as primary account, defaults to false (or true if it's the first account)

**Response:**
```json
{
  "id": "new-account-uuid",
  "serviceProviderId": "sp-uuid",
  "bankName": "NMB Bank",
  "accountNumber": "12340056789",
  "accountName": "Mwanga Primary School",
  "swiftCode": "NLIBTZTZ",
  "branchName": "Kinondoni Branch",
  "branchCode": "002",
  "accountType": "CURRENT",
  "isPrimary": false,
  "isActive": true,
  "createdAt": "2025-11-10T10:00:00Z",
  "updatedAt": "2025-11-10T10:00:00Z"
}
```

**Business Rules:**
- If this is the first bank account for the service provider, it will automatically be set as primary
- If `isPrimary` is set to `true`, all other accounts will be set to non-primary
- At least one active account must exist at all times

### 4. Update a Bank Account

Update an existing bank account's details.

```http
PATCH /api/service-providers/{id}/bank-accounts/{accountId}
Content-Type: application/json
```

**Parameters:**
- `id` (path) - Service provider UUID
- `accountId` (path) - Bank account UUID

**Request Body (all fields optional):**
```json
{
  "bankName": "CRDB Bank PLC",
  "accountNumber": "0150123456789",
  "accountName": "Mwanga Primary School - Main",
  "swiftCode": "CORUTZTZ",
  "branchName": "Dar es Salaam Main Branch",
  "branchCode": "001",
  "accountType": "CURRENT",
  "isPrimary": true,
  "isActive": true
}
```

**Response:**
```json
{
  "id": "account-uuid",
  "serviceProviderId": "sp-uuid",
  "bankName": "CRDB Bank PLC",
  "accountNumber": "0150123456789",
  "accountName": "Mwanga Primary School - Main",
  "swiftCode": "CORUTZTZ",
  "branchName": "Dar es Salaam Main Branch",
  "branchCode": "001",
  "accountType": "CURRENT",
  "isPrimary": true,
  "isActive": true,
  "createdAt": "2025-11-10T08:00:00Z",
  "updatedAt": "2025-11-10T10:30:00Z"
}
```

**Business Rules:**
- If `isPrimary` is set to `true`, all other accounts will automatically be set to non-primary
- You can update any field independently

### 5. Set a Bank Account as Primary

Set a specific bank account as the primary account for settlements.

```http
POST /api/service-providers/{id}/bank-accounts/{accountId}/set-primary
```

**Parameters:**
- `id` (path) - Service provider UUID
- `accountId` (path) - Bank account UUID

**Response:**
```json
{
  "id": "account-uuid",
  "serviceProviderId": "sp-uuid",
  "bankName": "NMB Bank",
  "accountNumber": "12340056789",
  "accountName": "Mwanga Primary School",
  "isPrimary": true,
  "isActive": true,
  "createdAt": "2025-11-10T09:00:00Z",
  "updatedAt": "2025-11-10T11:00:00Z"
}
```

**Business Rules:**
- All other bank accounts will automatically be set to non-primary
- Only one account can be primary at a time

### 6. Delete (Deactivate) a Bank Account

Soft delete a bank account by deactivating it.

```http
DELETE /api/service-providers/{id}/bank-accounts/{accountId}
```

**Parameters:**
- `id` (path) - Service provider UUID
- `accountId` (path) - Bank account UUID

**Response:**
```
204 No Content
```

**Business Rules:**
- Cannot delete the only active bank account (must add another one first)
- If deleting the primary account, another active account will automatically be set as primary
- This is a soft delete - the account is deactivated but not removed from the database

**Error Response (if trying to delete the only active account):**
```json
{
  "statusCode": 400,
  "message": "Cannot delete the only active bank account. Add another account first.",
  "error": "Bad Request"
}
```

## Usage Examples

### Example 1: Adding Multiple Bank Accounts

```bash
# Service Provider has no bank accounts yet

# 1. Add first account (automatically becomes primary)
POST /api/service-providers/sp-uuid/bank-accounts
{
  "bankName": "CRDB Bank",
  "accountNumber": "0150123456789",
  "accountName": "My Business",
  "accountType": "SAVINGS"
}
# Response: isPrimary = true (automatically set)

# 2. Add second account (non-primary)
POST /api/service-providers/sp-uuid/bank-accounts
{
  "bankName": "NMB Bank",
  "accountNumber": "12340056789",
  "accountName": "My Business",
  "accountType": "CURRENT"
}
# Response: isPrimary = false

# 3. Add third account and make it primary
POST /api/service-providers/sp-uuid/bank-accounts
{
  "bankName": "NBC Bank",
  "accountNumber": "98760056789",
  "accountName": "My Business",
  "accountType": "CURRENT",
  "isPrimary": true
}
# Response: isPrimary = true
# Effect: First two accounts are now non-primary
```

### Example 2: Switching Primary Account

```bash
# Current state: Account A is primary

# Get all accounts
GET /api/service-providers/sp-uuid/bank-accounts
# Shows Account A with isPrimary: true

# Set Account B as primary
POST /api/service-providers/sp-uuid/bank-accounts/account-b-uuid/set-primary

# Now Account B is primary, Account A is automatically non-primary
```

### Example 3: Updating Account Details

```bash
# Update only specific fields
PATCH /api/service-providers/sp-uuid/bank-accounts/account-uuid
{
  "branchName": "New Branch Location",
  "swiftCode": "NEWCODE1"
}
# Only the specified fields are updated
```

### Example 4: Handling Account Deletion

```bash
# Scenario: Service provider has 2 active accounts

# Try to delete the primary account
DELETE /api/service-providers/sp-uuid/bank-accounts/primary-account-uuid
# Success: Primary account deactivated, other account automatically becomes primary

# Try to delete the last remaining active account
DELETE /api/service-providers/sp-uuid/bank-accounts/last-account-uuid
# Error 400: "Cannot delete the only active bank account. Add another account first."
```

## Integration with Service Provider Creation

When creating a new service provider, at least one bank account must be provided:

```bash
POST /api/service-providers
{
  "businessName": "Mwanga Primary School",
  "businessType": "SCHOOL",
  "email": "info@mwanga.co.tz",
  "phoneNumber": "+255712345678",
  "contact": { ... },
  "bankAccounts": [
    {
      "bankName": "CRDB Bank",
      "accountNumber": "0150123456789",
      "accountName": "Mwanga Primary School",
      "swiftCode": "CORUTZTZ",
      "accountType": "SAVINGS"
    }
  ]
}
```

The first account in the array will automatically be set as primary.

## Common Bank Names in Tanzania

For reference, here are common bank names you might use:

- CRDB Bank
- NMB Bank
- NBC Bank
- Stanbic Bank
- Standard Chartered Bank
- Exim Bank Tanzania
- DTB Bank Tanzania
- Bank of Baroda Tanzania
- Equity Bank Tanzania
- KCB Bank Tanzania
- Access Bank Tanzania
- Azania Bank
- Diamond Trust Bank (DTB)

## Validation Rules

### Bank Name
- Required when creating
- Maximum 100 characters
- Cannot be empty

### Account Number
- Required when creating
- Maximum 50 characters
- Should be unique per bank (not enforced at DB level)

### Account Name
- Required when creating
- Maximum 100 characters
- Usually matches or relates to the business name

### SWIFT Code
- Optional
- Maximum 20 characters
- Format: 8 or 11 alphanumeric characters (not validated)

### Account Type
- Optional (defaults to "SAVINGS")
- Maximum 20 characters
- Common values: SAVINGS, CURRENT, CHECKING

### Primary Account
- Only one account can be primary at a time
- System automatically manages primary flag transitions
- First account is always primary

### Active Status
- All new accounts are active by default
- Deletion sets isActive to false (soft delete)
- At least one active account must exist

## Error Responses

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Service Provider with ID {id} not found",
  "error": "Not Found"
}
```

### 404 Bank Account Not Found
```json
{
  "statusCode": 404,
  "message": "Bank account with ID {accountId} not found for this service provider",
  "error": "Not Found"
}
```

### 400 Cannot Delete Last Account
```json
{
  "statusCode": 400,
  "message": "Cannot delete the only active bank account. Add another account first.",
  "error": "Bad Request"
}
```

### 400 Validation Error
```json
{
  "statusCode": 400,
  "message": [
    "bankName should not be empty",
    "accountNumber should not be empty"
  ],
  "error": "Bad Request"
}
```

## Testing the API

### Using cURL

```bash
# Get all bank accounts
curl -X GET http://localhost:3000/api/service-providers/{sp-id}/bank-accounts

# Add a new bank account
curl -X POST http://localhost:3000/api/service-providers/{sp-id}/bank-accounts \
  -H "Content-Type: application/json" \
  -d '{
    "bankName": "CRDB Bank",
    "accountNumber": "0150123456789",
    "accountName": "My Business",
    "accountType": "SAVINGS"
  }'

# Update bank account
curl -X PATCH http://localhost:3000/api/service-providers/{sp-id}/bank-accounts/{account-id} \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "New Branch"
  }'

# Set as primary
curl -X POST http://localhost:3000/api/service-providers/{sp-id}/bank-accounts/{account-id}/set-primary

# Delete bank account
curl -X DELETE http://localhost:3000/api/service-providers/{sp-id}/bank-accounts/{account-id}
```

## Files Modified/Created

### New Files
- `src/modules/service-provider/dto/update-bank-account.dto.ts` - DTO for updating bank accounts

### Modified Files
- `src/modules/service-provider/service-provider.service.ts` - Added 6 bank account methods
- `src/modules/service-provider/service-provider.controller.ts` - Added 6 bank account endpoints

## Summary

The bank account CRUD API provides complete management capabilities for service provider bank accounts with:

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Automatic primary account management
- ✅ Soft delete functionality
- ✅ Validation to prevent data integrity issues
- ✅ RESTful API design
- ✅ Swagger/OpenAPI documentation
- ✅ Proper error handling

All endpoints are nested under the service provider resource (`/api/service-providers/{id}/bank-accounts`) following REST conventions.
