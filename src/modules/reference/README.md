# Payment Reference Module

## Overview

The Payment Reference module manages the generation, validation, and lifecycle of payment references used in the UCG system. Each reference is a unique identifier that customers use to make payments.

## Reference Number Format

**Format**: `XXX-YYYYYYY-ZZZ`

- **XXX**: Service Provider Code (3 characters)
- **YYYYYYY**: Sequential number (7 digits, padded with zeros)
- **ZZZ**: Checksum for validation (3 characters)

**Example**: `MWA-0001234-A7B`

- `MWA` - Service Provider code (Mwanga School)
- `0001234` - Sequential reference number
- `A7B` - Checksum for validation

## Features

- ✅ **Generate References**: Create unique payment references
- ✅ **Bulk Creation**: Upload multiple references at once
- ✅ **Validation**: Verify reference format and status
- ✅ **Expiry Management**: Auto-expire old references
- ✅ **Status Tracking**: ACTIVE, USED, EXPIRED, CANCELLED
- ✅ **Search & Filter**: Find references by various criteria
- ✅ **Metadata Support**: Store additional custom data

## Database Schema

### payment_references Table

```sql
CREATE TABLE payment_references (
  id UUID PRIMARY KEY,
  reference_number VARCHAR(20) UNIQUE NOT NULL,
  service_provider_id UUID NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  customer_phone VARCHAR(15) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  currency VARCHAR(10) DEFAULT 'TZS',
  expires_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  metadata JSONB,
  used_at TIMESTAMP,
  transaction_id UUID,
  validation_attempts INT DEFAULT 0,
  last_validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (service_provider_id) REFERENCES service_providers(id)
);

CREATE INDEX idx_reference_number ON payment_references(reference_number);
CREATE INDEX idx_sp_status ON payment_references(service_provider_id, status);
CREATE INDEX idx_status ON payment_references(status);
```

## API Endpoints

### 1. Create Payment Reference

**POST** `/api/v1/references`

**Request Body**:
```json
{
  "serviceProviderId": "uuid-here",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000,
  "description": "School fees for Term 1",
  "currency": "TZS",
  "expiresAt": "2025-12-31T23:59:59Z",
  "metadata": {
    "studentId": "STD001",
    "class": "Form 1",
    "term": "1"
  }
}
```

**Response** (201):
```json
{
  "id": "ref-uuid",
  "referenceNumber": "MWA-0001234-A7B",
  "serviceProviderId": "sp-uuid",
  "serviceProviderName": "Mwanga Primary School",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000,
  "description": "School fees for Term 1",
  "currency": "TZS",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "status": "ACTIVE",
  "metadata": {
    "studentId": "STD001",
    "class": "Form 1"
  },
  "isValid": true,
  "isExpired": false,
  "createdAt": "2025-11-06T10:00:00.000Z",
  "updatedAt": "2025-11-06T10:00:00.000Z"
}
```

---

### 2. Bulk Create References

**POST** `/api/v1/references/bulk`

**Request Body**:
```json
{
  "references": [
    {
      "serviceProviderId": "uuid-here",
      "customerName": "John Doe",
      "customerPhone": "+255712345678",
      "amount": 50000,
      "description": "School fees"
    },
    {
      "serviceProviderId": "uuid-here",
      "customerName": "Jane Smith",
      "customerPhone": "+255723456789",
      "amount": 75000,
      "description": "School fees"
    }
  ]
}
```

**Response** (201):
```json
{
  "totalRequested": 2,
  "successCount": 2,
  "failureCount": 0,
  "createdReferences": [
    {
      "id": "ref-uuid-1",
      "referenceNumber": "MWA-0001234-A7B",
      "customerName": "John Doe",
      "amount": 50000
    },
    {
      "id": "ref-uuid-2",
      "referenceNumber": "MWA-0001235-B8C",
      "customerName": "Jane Smith",
      "amount": 75000
    }
  ],
  "errors": []
}
```

---

### 3. List References

**GET** `/api/v1/references`

**Query Parameters**:
- `serviceProviderId` (optional) - Filter by service provider
- `status` (optional) - Filter by status (ACTIVE, USED, EXPIRED, CANCELLED)
- `search` (optional) - Search by name, phone, or reference number
- `customerPhone` (optional) - Filter by phone number
- `includeExpired` (optional, default: false) - Include expired references
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page

**Example**:
```
GET /api/v1/references?serviceProviderId=uuid&status=ACTIVE&page=1&limit=20
```

**Response** (200):
```json
{
  "data": [
    {
      "id": "ref-uuid",
      "referenceNumber": "MWA-0001234-A7B",
      "customerName": "John Doe",
      "amount": 50000,
      "status": "ACTIVE",
      "isValid": true,
      "createdAt": "2025-11-06T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 4. Validate Reference

**GET** `/api/v1/references/validate/:referenceNumber`

**Example**:
```
GET /api/v1/references/validate/MWA-0001234-A7B
```

**Response** (200) - Valid:
```json
{
  "isValid": true,
  "referenceNumber": "MWA-0001234-A7B",
  "reference": {
    "id": "ref-uuid",
    "amount": 50000,
    "customerName": "John Doe",
    "status": "ACTIVE",
    "expiresAt": "2025-12-31T23:59:59.000Z"
  }
}
```

**Response** (200) - Invalid:
```json
{
  "isValid": false,
  "referenceNumber": "MWA-0001234-A7B",
  "reason": "Reference already used"
}
```

---

### 5. Get Reference by ID

**GET** `/api/v1/references/:id`

**Response** (200):
```json
{
  "id": "ref-uuid",
  "referenceNumber": "MWA-0001234-A7B",
  "serviceProviderId": "sp-uuid",
  "serviceProviderName": "Mwanga Primary School",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000,
  "description": "School fees for Term 1",
  "currency": "TZS",
  "status": "ACTIVE",
  "isValid": true,
  "createdAt": "2025-11-06T10:00:00.000Z"
}
```

---

### 6. Get Reference by Number

**GET** `/api/v1/references/number/:referenceNumber`

---

### 7. Get Service Provider References

**GET** `/api/v1/references/sp/:serviceProviderId`

---

### 8. Update Reference

**PATCH** `/api/v1/references/:id`

**Request Body**:
```json
{
  "amount": 60000,
  "description": "Updated school fees",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Note**: Cannot update USED references

---

### 9. Cancel Reference

**POST** `/api/v1/references/:id/cancel`

**Response** (200):
```json
{
  "id": "ref-uuid",
  "referenceNumber": "MWA-0001234-A7B",
  "status": "CANCELLED",
  "updatedAt": "2025-11-06T11:00:00.000Z"
}
```

---

### 10. Get Statistics

**GET** `/api/v1/references/statistics?serviceProviderId=uuid`

**Response** (200):
```json
{
  "total": 1000,
  "active": 750,
  "used": 200,
  "expired": 30,
  "cancelled": 20
}
```

---

### 11. Auto-Expire Old References (Admin)

**POST** `/api/v1/references/expire-old`

**Response** (200):
```json
{
  "message": "15 references expired",
  "count": 15
}
```

## Reference Statuses

| Status | Description | Can Update | Can Use |
|--------|-------------|------------|---------|
| **ACTIVE** | Reference is valid and can be used | ✅ Yes | ✅ Yes |
| **USED** | Reference has been used for payment | ❌ No | ❌ No |
| **EXPIRED** | Reference has passed expiry date | ❌ No | ❌ No |
| **CANCELLED** | Reference has been cancelled | ❌ No | ❌ No |

## Business Logic

### Reference Generation Algorithm

1. Extract SP code from service provider
2. Query last reference number for this SP
3. Increment sequence number
4. Generate checksum using MD5 hash of SP code + sequence
5. Format as: `{spCode}-{sequence}-{checksum}`

### Validation Rules

1. **Format Validation**: Must match pattern `^[A-Z0-9]{3}-\d{7}-[A-Z0-9]{3}$`
2. **Checksum Validation**: Verify checksum matches calculated value
3. **Status Check**: Must be ACTIVE
4. **Expiry Check**: If expiresAt is set, must be in future
5. **Existence Check**: Reference must exist in database

### Auto-Expiry

- References with `expiresAt` in the past are automatically marked as EXPIRED
- Can be triggered manually via `/references/expire-old` endpoint
- Recommended to run as a daily cron job

## Usage Examples

### Example 1: School Fee Collection

```typescript
// 1. School creates references for all students
const references = await fetch('/api/v1/references/bulk', {
  method: 'POST',
  body: JSON.stringify({
    references: students.map(student => ({
      serviceProviderId: 'school-uuid',
      customerName: student.name,
      customerPhone: student.parentPhone,
      amount: 50000,
      description: `School fees for ${student.name}`,
      metadata: {
        studentId: student.id,
        class: student.class,
        term: '1'
      }
    }))
  })
});

// 2. School sends reference number to parents via SMS

// 3. Parent validates reference before payment
const validation = await fetch('/api/v1/references/validate/MWA-0001234-A7B');

if (validation.isValid) {
  // Proceed with payment
}
```

### Example 2: Hospital Bill Payment

```typescript
// Hospital generates reference for patient bill
const reference = await fetch('/api/v1/references', {
  method: 'POST',
  body: JSON.stringify({
    serviceProviderId: 'hospital-uuid',
    customerName: 'John Doe',
    customerPhone: '+255712345678',
    amount: 150000,
    description: 'Medical consultation and lab tests',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    metadata: {
      patientId: 'P001',
      billNumber: 'BILL-2025-001'
    }
  })
});

// Reference: HOS-0000123-X9Y
```

## Integration with Transaction Module

When a payment is processed:

```typescript
// 1. Validate reference
const validation = await referenceService.validate(referenceNumber);

if (!validation.isValid) {
  throw new Error(validation.reason);
}

// 2. Process transaction
const transaction = await transactionService.create({
  referenceNumber,
  amount: validation.reference.amount,
  // ...
});

// 3. Mark reference as used
await referenceService.markAsUsed(validation.reference.id, transaction.id);
```

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| 400 | Invalid reference format | Check reference format |
| 404 | Reference not found | Verify reference exists |
| 409 | Reference already used | Cannot reuse reference |
| 400 | Reference expired | Generate new reference |
| 400 | Cannot update used reference | Create new reference instead |

## Best Practices

1. **Set Expiry Dates**: Always set reasonable expiry dates (e.g., 30 days)
2. **Validation Before Payment**: Always validate reference before processing payment
3. **Use Metadata**: Store additional context in metadata field
4. **Bulk Creation**: Use bulk endpoint for multiple references
5. **Monitor Statistics**: Regularly check reference statistics
6. **Auto-Expiry Cron**: Set up daily cron job to expire old references

## Testing

### Test Reference Generation

```bash
curl -X POST http://localhost:3000/api/v1/references \
  -H "Content-Type: application/json" \
  -d '{
    "serviceProviderId": "your-sp-uuid",
    "customerName": "Test Customer",
    "customerPhone": "+255712345678",
    "amount": 10000,
    "description": "Test payment"
  }'
```

### Test Validation

```bash
curl http://localhost:3000/api/v1/references/validate/MWA-0001234-A7B
```

## Future Enhancements

- [ ] QR code generation for references
- [ ] SMS notification integration
- [ ] Reference templates
- [ ] Recurring references
- [ ] Reference reservations (hold for X minutes)
- [ ] Reference analytics dashboard
- [ ] Export references to CSV/Excel

---

**Module Status**: ✅ Complete and Ready for Testing
**Dependencies**: Service Provider Module
**Next Module**: Transaction Module
