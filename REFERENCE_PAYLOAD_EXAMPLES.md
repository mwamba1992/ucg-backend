# Payment Reference Creation - JSON Payload Examples

## Service Provider ID

**IMPORTANT:** Always use a valid Service Provider UUID from your database.

Current valid Service Provider in database:
- **ID:** `58bfe4aa-0843-47ea-8a19-467f702aebc4`
- **SP Code:** `TES`
- **Business Name:** `Test School Ltd`

## 1. Minimal Required Payload

```json
{
  "serviceProviderId": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000
}
```

## 2. Complete Payload (All Fields) - SYNCHRONOUS

**Endpoint:** `POST /api/v1/references`

```json
{
  "serviceProviderId": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
  "customerName": "Jane Doe",
  "customerPhone": "+255723456789",
  "customerEmail": "jane.doe@example.com",
  "customerId": "19900505-12345-67890-12",
  "customerIdType": "1",
  "customerAccount": "ACC-2025-00456",
  "amount": 150000,
  "minPaymentAmount": 50000,
  "description": "School fees for Term 1 2025",
  "currency": "TZS",
  "exchangeRate": 1.0,
  "paymentOption": "PARTIAL",
  "workstation": "TERMINAL-002",
  "issuedBy": "Jane Smith",
  "approvedBy": "John Manager",
  "metadata": {
    "studentId": "STD-2025-001",
    "class": "Form 4",
    "term": "1",
    "academicYear": "2025"
  },
  "lineItems": [
    {
      "serviceDepartment": "3001",
      "serviceType": "140354565431",
      "serviceReference": "TUITION-2025-T1",
      "serviceDescription": "Tuition fees",
      "serviceAmount": 100000,
      "paymentPriority": 1,
      "metadata": {
        "category": "academic"
      }
    },
    {
      "serviceDepartment": "3002",
      "serviceType": "140354565432",
      "serviceReference": "BOARDING-2025-T1",
      "serviceDescription": "Boarding fees",
      "serviceAmount": 50000,
      "paymentPriority": 2,
      "metadata": {
        "category": "accommodation"
      }
    }
  ],
  "callbackUrl": "https://school-system.com/webhooks/reference-created"
}
```

## 3. ASYNC Reference Creation

**Endpoint:** `POST /api/v1/references/async`

Same payload as above, but returns immediately with:

```json
{
  "status": "QUEUED",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Reference creation queued. Processing will complete shortly."
}
```

**Note:** Service Provider validation happens BEFORE queuing, so you'll get immediate error if SP doesn't exist.

## 4. Bulk Reference Generation

**Endpoint:** `POST /api/v1/sp/references/bulk`

```json
{
  "references": [
    {
      "customerName": "Student One",
      "customerPhone": "+255712000001",
      "customerEmail": "student1@example.com",
      "amount": 100000,
      "description": "School fees - Term 1",
      "metadata": {
        "studentId": "STD001"
      }
    },
    {
      "customerName": "Student Two",
      "customerPhone": "+255712000002",
      "customerEmail": "student2@example.com",
      "amount": 120000,
      "description": "School fees - Term 1",
      "metadata": {
        "studentId": "STD002"
      }
    },
    {
      "customerName": "Student Three",
      "customerPhone": "+255712000003",
      "amount": 95000,
      "description": "School fees - Term 1",
      "metadata": {
        "studentId": "STD003"
      }
    }
  ],
  "defaultExpiryDays": 30,
  "notifyCustomers": false
}
```

## Field Validation Rules

### Required Fields
- `serviceProviderId`: Valid UUID (must exist in database)
- `customerName`: String, max 200 characters
- `customerPhone`: String, max 15 characters (international format: +255...)
- `amount`: Number, minimum 100

### Optional Fields
- `customerEmail`: Valid email, max 100 characters
- `customerId`: String, max 50 characters
- `customerIdType`: String, max 20 characters (1=National ID, 2=Passport, 3=License, 4=Tax ID)
- `customerAccount`: String, max 100 characters
- `minPaymentAmount`: Number >= 0
- `description`: Text
- `currency`: String, max 10 characters (default: "TZS")
- `exchangeRate`: Number >= 0 (default: 1.0)
- `paymentOption`: Enum (default: "COMPLETE")
  - `COMPLETE`: Single payment >= invoice amount
  - `PARTIAL`: Allow first payment of any amount, final payment must cover remaining
  - `PRECISE`: Single payment must be exactly = invoice amount
  - `LIMITED`: Multiple payments, each <= remaining, final must be exact
  - `PERPETUAL`: Any number of payments with any amount
- `workstation`: String, max 50 characters
- `issuedBy`: String, max 100 characters
- `approvedBy`: String, max 100 characters
- `expiresAt`: ISO 8601 date string (e.g., "2025-12-31T23:59:59Z" or "2025-12-31")
  - **If omitted, defaults to 30 days from now**
- `metadata`: JSON object
- `callbackUrl`: Valid URL (for async notifications)

### Line Items (Optional)
Each line item requires:
- `serviceDepartment`: Required string
- `serviceType`: Required string
- `serviceAmount`: Required number >= 0
- `serviceReference`: Optional string
- `serviceDescription`: Optional string
- `paymentPriority`: Optional number (default: 1)
- `metadata`: Optional object

**Note:** If line items are provided, their total amount will override the main `amount` field.

## Expiry Date Handling

### Option 1: Omit expiresAt (Recommended)
System automatically sets expiry to 30 days from creation:
```json
{
  "amount": 50000,
  ...
  // No expiresAt field
}
```

### Option 2: Provide ISO 8601 Date
```json
{
  "amount": 50000,
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

### Option 3: Just Date (defaults to midnight)
```json
{
  "amount": 50000,
  "expiresAt": "2025-12-31"
}
```

## Common Errors

### 1. Service Provider Not Found
```json
{
  "message": "Service provider with ID 123e4567-e89b-12d3-a456-426614174000 not found",
  "error": "Not Found",
  "statusCode": 404
}
```
**Solution:** Use a valid service provider UUID from your database.

### 2. Invalid Date Format
```json
{
  "message": ["expiresAt must be a valid ISO 8601 date string"],
  "error": "Bad Request",
  "statusCode": 400
}
```
**Solution:** Either omit `expiresAt` or use format: `"2025-12-31T23:59:59Z"`

### 3. Amount Too Low
```json
{
  "message": ["amount must not be less than 100"],
  "error": "Bad Request",
  "statusCode": 400
}
```
**Solution:** Ensure amount is at least 100.

## Getting Valid Service Provider IDs

Query your database:
```sql
SELECT id, "spCode", "businessName"
FROM service_providers
WHERE "isActive" = true
LIMIT 10;
```

Or use the API:
```bash
GET /api/v1/service-providers
```

## Async vs Sync Reference Creation

### Synchronous (Default)
- **Endpoint:** `POST /api/v1/references`
- **Pros:** Immediate response with reference number
- **Cons:** Slower for bulk operations
- **Use when:** Creating single reference and need immediate confirmation

### Asynchronous (RabbitMQ)
- **Endpoint:** `POST /api/v1/references/async`
- **Pros:** Immediate response, background processing
- **Cons:** Need to handle callbacks or poll for results
- **Use when:** High volume, fire-and-forget operations
- **Note:** Service Provider validation still happens immediately before queuing

## Testing Examples

### Using cURL (Sync)
```bash
curl -X POST http://192.168.1.94:3000/api/v1/references \
  -H "Content-Type: application/json" \
  -d '{
    "serviceProviderId": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
    "customerName": "Test Customer",
    "customerPhone": "+255712345678",
    "amount": 50000
  }'
```

### Using cURL (Async)
```bash
curl -X POST http://192.168.1.94:3000/api/v1/references/async \
  -H "Content-Type: application/json" \
  -d '{
    "serviceProviderId": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
    "customerName": "Test Customer",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "callbackUrl": "https://your-app.com/webhooks/reference-callback"
  }'
```

## Improvements Made

✅ **Service Provider validation before queuing** - Prevents invalid messages from entering the queue
✅ **Better error handling in consumer** - Validation errors are not requeued
✅ **Callback notifications on failure** - Service providers get notified even when reference creation fails
✅ **Proper date handling** - Supports ISO 8601 format or auto-defaults to 30 days
✅ **Line items support** - Detailed service breakdown with automatic amount calculation

---

**Generated:** December 10, 2025
**API Version:** 1.0.0
