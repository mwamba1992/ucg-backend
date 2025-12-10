# Using spCode for Reference Creation - Simple Guide

## What Changed?

You can now use **`spCode`** (3-character code like `TES`) instead of the long UUID!

## Comparison

### Before (Complicated UUID)
```json
{
  "serviceProviderId": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000
}
```

### Now (Simple spCode) ✨
```json
{
  "spCode": "TES",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000
}
```

## How It Works

The system will:
1. Look up the service provider by `spCode`
2. Automatically resolve it to the UUID
3. Create the reference using the resolved UUID

**Both methods still work!** Use whichever is easier for you.

## Complete Examples

### 1. Minimal with spCode
```json
{
  "spCode": "TES",
  "customerName": "Jane Doe",
  "customerPhone": "+255723456789",
  "amount": 50000
}
```

### 2. Full Payload with spCode
```json
{
  "spCode": "TES",
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
      "paymentPriority": 1
    },
    {
      "serviceDepartment": "3002",
      "serviceType": "140354565432",
      "serviceReference": "BOARDING-2025-T1",
      "serviceDescription": "Boarding fees",
      "serviceAmount": 50000,
      "paymentPriority": 2
    }
  ]
}
```

### 3. With UUID (Still Works!)
```json
{
  "serviceProviderId": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000
}
```

## Validation Rules

### You must provide ONE of:
- `spCode` (3 characters, case-insensitive)
- `serviceProviderId` (UUID format)

### Error if BOTH are missing:
```json
{
  "message": "Either serviceProviderId or spCode must be provided",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Error if spCode not found:
```json
{
  "message": "Service provider with code XYZ not found",
  "error": "Not Found",
  "statusCode": 404
}
```

### Error if UUID not found:
```json
{
  "message": "Service provider with ID 123e4567-... not found",
  "error": "Not Found",
  "statusCode": 404
}
```

## Getting Your spCode

### Option 1: Database Query
```sql
SELECT "spCode", "businessName", id
FROM service_providers
WHERE "isActive" = true;
```

Result:
```
spCode | businessName      | id
-------+-------------------+--------------------------------------
TES    | Test School Ltd   | 58bfe4aa-0843-47ea-8a19-467f702aebc4
```

### Option 2: API Call
```bash
GET /api/v1/service-providers
```

Response:
```json
{
  "data": [
    {
      "id": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
      "spCode": "TES",
      "businessName": "Test School Ltd",
      "isActive": true
    }
  ]
}
```

## API Endpoints

### Synchronous (Immediate Response)
**POST** `/api/v1/references`

```bash
curl -X POST http://your-server/api/v1/references \
  -H "Content-Type: application/json" \
  -d '{
    "spCode": "TES",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000
  }'
```

### Asynchronous (Background Processing)
**POST** `/api/v1/references/async`

```bash
curl -X POST http://your-server/api/v1/references/async \
  -H "Content-Type: application/json" \
  -d '{
    "spCode": "TES",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000
  }'
```

Response:
```json
{
  "status": "QUEUED",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Reference creation queued. Processing will complete shortly."
}
```

## Bulk Generation with spCode

Since the SP Reference controller extracts `serviceProviderId` from JWT, bulk generation doesn't need either field:

**POST** `/api/v1/sp/references/bulk`

```json
{
  "references": [
    {
      "customerName": "Student One",
      "customerPhone": "+255712000001",
      "amount": 100000
    },
    {
      "customerName": "Student Two",
      "customerPhone": "+255712000002",
      "amount": 120000
    }
  ],
  "defaultExpiryDays": 30
}
```

## Case Sensitivity

**spCode is case-insensitive!**

All these work:
```json
{ "spCode": "TES" }
{ "spCode": "tes" }
{ "spCode": "Tes" }
```

They all resolve to the same service provider.

## Benefits of Using spCode

✅ **Simpler** - Just 3 characters vs 36-character UUID
✅ **Memorable** - Easy to remember and communicate
✅ **Human-friendly** - Can be spoken/written easily
✅ **Less error-prone** - Shorter = fewer typos
✅ **Backwards compatible** - UUID still works

## Common Use Cases

### Use spCode when:
- Building simple integrations
- Manual testing via Postman/cURL
- Integrating with non-technical systems
- Building user-facing forms
- Creating mobile apps

### Use UUID when:
- You already have the UUID from a previous API call
- Working with database exports
- System-to-system integrations where UUIDs are standard
- You need guaranteed uniqueness across systems

## Technical Details

### How Resolution Works

1. **Request comes in** with `spCode: "TES"`
2. **System queries** database: `SELECT * FROM service_providers WHERE spCode = 'TES'`
3. **Gets UUID**: `58bfe4aa-0843-47ea-8a19-467f702aebc4`
4. **Proceeds** with reference creation using the UUID

### Performance Impact

- **Negligible** - Single indexed database lookup
- **spCode is indexed** - Query is very fast
- **Same validation** - SP validation happens before queuing (for async)

### Security

- **No security difference** - Both methods validate SP exists
- **Same permissions** - Both require valid SP in database
- **Same rate limiting** - Applied equally to both methods

## Migration Guide

If you have existing code using UUID:

### Option 1: Keep Using UUID
```json
{
  "serviceProviderId": "58bfe4aa-0843-47ea-8a19-467f702aebc4",
  ...
}
```
**No changes needed!**

### Option 2: Switch to spCode
```json
{
  "spCode": "TES",
  ...
}
```
**Just replace the field!**

### Option 3: Support Both
```javascript
// Your integration can accept either
const payload = {
  [useSpCode ? 'spCode' : 'serviceProviderId']: identifier,
  customerName: "John Doe",
  customerPhone: "+255712345678",
  amount: 50000
};
```

## Swagger Documentation

The API docs at `/api/docs` show both fields:

- `serviceProviderId` (optional) - UUID format
- `spCode` (optional) - 3 characters max

**At least one must be provided!**

## Summary

| Feature | spCode | serviceProviderId |
|---------|--------|-------------------|
| Format | 3 chars | UUID |
| Example | `"TES"` | `"58bfe4aa-0843-47ea-8a19-467f702aebc4"` |
| Case Sensitive | No | Yes |
| Validation | Database lookup | Database lookup |
| Speed | Fast (indexed) | Fast (indexed) |
| Recommended for | New integrations | System-to-system |

**Both work perfectly - choose what's easier for you!**

---

**Last Updated:** December 10, 2025
**Version:** 1.0.0
