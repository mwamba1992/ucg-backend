# Service Provider Reference Generation API

## Overview

This API allows service providers (schools, hospitals, churches, etc.) to submit customer details to UCG and receive payment reference numbers that they can distribute to their customers for payment collection.

---

## Authentication

All API requests must include authentication headers:

```http
Authorization: Bearer {JWT_TOKEN}
X-SP-Code: {SERVICE_PROVIDER_CODE}
Content-Type: application/json
```

### Obtaining JWT Token

```http
POST /api/v1/auth/sp/login
Content-Type: application/json

{
  "email": "admin@mwangaschool.ac.tz",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "serviceProvider": {
    "id": "uuid",
    "spCode": "MWA",
    "businessName": "Mwanga Primary School"
  }
}
```

---

## API Endpoints

### 1. Generate Single Reference

**Endpoint:** `POST /api/v1/sp/references`

**Description:** Generate a single payment reference for a customer

**Request:**
```json
{
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "customerEmail": "john.doe@example.com",
  "amount": 50000,
  "currency": "TZS",
  "description": "School fees - Term 1 2025",
  "expiresInDays": 30,
  "metadata": {
    "studentId": "STD-2024-001",
    "grade": "Standard 5",
    "term": "Term 1",
    "academicYear": "2025"
  }
}
```

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
    "customerEmail": "john.doe@example.com",
    "amount": 50000,
    "currency": "TZS",
    "description": "School fees - Term 1 2025",
    "status": "ACTIVE",
    "expiresAt": "2025-12-07T23:59:59.000Z",
    "createdAt": "2025-11-07T10:30:00.000Z",
    "metadata": {
      "studentId": "STD-2024-001",
      "grade": "Standard 5",
      "term": "Term 1",
      "academicYear": "2025"
    },
    "serviceProvider": {
      "spCode": "MWA",
      "businessName": "Mwanga Primary School"
    }
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "customerPhone",
        "message": "Phone number must be in format +255XXXXXXXXX"
      },
      {
        "field": "amount",
        "message": "Amount must be greater than 1000 TZS"
      }
    ]
  }
}
```

---

### 2. Generate Multiple References (Bulk)

**Endpoint:** `POST /api/v1/sp/references/bulk`

**Description:** Generate multiple payment references in one request (max 1000)

**Use Case:** Schools generating references for all students at start of term

**Request:**
```json
{
  "references": [
    {
      "customerName": "John Doe",
      "customerPhone": "+255712345678",
      "amount": 50000,
      "description": "School fees - Term 1 2025",
      "metadata": {
        "studentId": "STD-2024-001",
        "grade": "Standard 5"
      }
    },
    {
      "customerName": "Jane Smith",
      "customerPhone": "+255723456789",
      "amount": 50000,
      "description": "School fees - Term 1 2025",
      "metadata": {
        "studentId": "STD-2024-002",
        "grade": "Standard 6"
      }
    }
  ],
  "defaultExpiryDays": 30,
  "notifyCustomers": true
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
    "estimatedCompletionTime": "2025-11-07T10:35:00.000Z",
    "webhookUrl": "https://mwangaschool.ac.tz/webhooks/ucg/bulk-complete"
  }
}
```

**Webhook Notification (When Complete):**
```http
POST {serviceProvider.webhookUrl}
Content-Type: application/json
X-UCG-Signature: sha256_hmac_signature

{
  "event": "BULK_REFERENCE_COMPLETE",
  "batchId": "batch-550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-11-07T10:35:00.000Z",
  "summary": {
    "totalRequested": 2,
    "successCount": 2,
    "failureCount": 0
  },
  "downloadUrl": "https://api.ucg.mhb.co.tz/api/v1/sp/references/bulk/batch-550e8400/download"
}
```

---

### 3. Get Bulk Generation Status

**Endpoint:** `GET /api/v1/sp/references/bulk/{batchId}`

**Description:** Check the status of a bulk reference generation

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch-550e8400-e29b-41d4-a716-446655440000",
    "status": "COMPLETED",
    "summary": {
      "totalRequested": 2,
      "successCount": 2,
      "failureCount": 0,
      "processingCount": 0
    },
    "startedAt": "2025-11-07T10:30:00.000Z",
    "completedAt": "2025-11-07T10:35:00.000Z",
    "downloadUrl": "https://api.ucg.mhb.co.tz/api/v1/sp/references/bulk/batch-550e8400/download"
  }
}
```

---

### 4. Download Bulk Results

**Endpoint:** `GET /api/v1/sp/references/bulk/{batchId}/download`

**Description:** Download bulk generation results as CSV or JSON

**Query Parameters:**
- `format` - csv or json (default: csv)

**Response (CSV format):**
```csv
Reference Number,Customer Name,Customer Phone,Amount,Status,Expires At,Error
MWA-0001234-A7B,John Doe,+255712345678,50000,SUCCESS,2025-12-07T23:59:59.000Z,
MWA-0001235-B8C,Jane Smith,+255723456789,50000,SUCCESS,2025-12-07T23:59:59.000Z,
```

**Response (JSON format):**
```json
{
  "batchId": "batch-550e8400-e29b-41d4-a716-446655440000",
  "results": [
    {
      "referenceNumber": "MWA-0001234-A7B",
      "customerName": "John Doe",
      "customerPhone": "+255712345678",
      "amount": 50000,
      "status": "SUCCESS",
      "expiresAt": "2025-12-07T23:59:59.000Z"
    },
    {
      "referenceNumber": "MWA-0001235-B8C",
      "customerName": "Jane Smith",
      "customerPhone": "+255723456789",
      "amount": 50000,
      "status": "SUCCESS",
      "expiresAt": "2025-12-07T23:59:59.000Z"
    }
  ]
}
```

---

### 5. Get Reference Details

**Endpoint:** `GET /api/v1/sp/references/{referenceNumber}`

**Description:** Get details of a specific reference

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "referenceNumber": "MWA-0001234-A7B",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "currency": "TZS",
    "description": "School fees - Term 1 2025",
    "status": "ACTIVE",
    "expiresAt": "2025-12-07T23:59:59.000Z",
    "createdAt": "2025-11-07T10:30:00.000Z",
    "usedAt": null,
    "transactionId": null,
    "validationAttempts": 0,
    "lastValidatedAt": null,
    "metadata": {
      "studentId": "STD-2024-001",
      "grade": "Standard 5"
    }
  }
}
```

---

### 6. List Service Provider References

**Endpoint:** `GET /api/v1/sp/references`

**Description:** List all references for authenticated service provider

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `status` - Filter by status (ACTIVE, USED, EXPIRED, CANCELLED)
- `startDate` - Filter from date (ISO 8601)
- `endDate` - Filter to date (ISO 8601)
- `search` - Search by customer name, phone, or reference number

**Example:**
```
GET /api/v1/sp/references?page=1&limit=20&status=ACTIVE&search=John
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "referenceNumber": "MWA-0001234-A7B",
        "customerName": "John Doe",
        "customerPhone": "+255712345678",
        "amount": 50000,
        "status": "ACTIVE",
        "expiresAt": "2025-12-07T23:59:59.000Z",
        "createdAt": "2025-11-07T10:30:00.000Z"
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

### 7. Get Reference Statistics

**Endpoint:** `GET /api/v1/sp/references/statistics`

**Description:** Get statistics for service provider references

**Query Parameters:**
- `startDate` - From date (default: 30 days ago)
- `endDate` - To date (default: today)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-10-08T00:00:00.000Z",
      "endDate": "2025-11-07T23:59:59.000Z"
    },
    "summary": {
      "totalGenerated": 1500,
      "active": 800,
      "used": 650,
      "expired": 30,
      "cancelled": 20
    },
    "amounts": {
      "totalAmount": 75000000,
      "collectedAmount": 32500000,
      "pendingAmount": 40000000,
      "expiredAmount": 1500000,
      "currency": "TZS"
    },
    "trends": {
      "generatedToday": 50,
      "collectedToday": 35,
      "averagePerDay": 50,
      "collectionRate": 43.33
    }
  }
}
```

---

### 8. Cancel Reference

**Endpoint:** `POST /api/v1/sp/references/{referenceNumber}/cancel`

**Description:** Cancel an active reference (cannot be used for payment after cancellation)

**Request:**
```json
{
  "reason": "Student left school"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reference cancelled successfully",
  "data": {
    "referenceNumber": "MWA-0001234-A7B",
    "status": "CANCELLED",
    "cancelledAt": "2025-11-07T11:00:00.000Z",
    "reason": "Student left school"
  }
}
```

---

### 9. Validate Reference (Before Customer Pays)

**Endpoint:** `GET /api/v1/sp/references/{referenceNumber}/validate`

**Description:** Validate a reference before giving to customer (optional check)

**Response:**
```json
{
  "success": true,
  "data": {
    "referenceNumber": "MWA-0001234-A7B",
    "isValid": true,
    "status": "ACTIVE",
    "expiresAt": "2025-12-07T23:59:59.000Z",
    "daysUntilExpiry": 30,
    "validationChecks": {
      "formatValid": true,
      "checksumValid": true,
      "notExpired": true,
      "notUsed": true,
      "notCancelled": true
    }
  }
}
```

**Invalid Reference Response:**
```json
{
  "success": false,
  "data": {
    "referenceNumber": "MWA-0001234-A7B",
    "isValid": false,
    "status": "USED",
    "reason": "This reference has already been used for payment",
    "usedAt": "2025-11-06T15:30:00.000Z",
    "transactionId": "TXN-550e8400"
  }
}
```

---

### 10. Extend Reference Expiry

**Endpoint:** `PATCH /api/v1/sp/references/{referenceNumber}/extend`

**Description:** Extend the expiry date of an active reference

**Request:**
```json
{
  "additionalDays": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reference expiry extended successfully",
  "data": {
    "referenceNumber": "MWA-0001234-A7B",
    "oldExpiryDate": "2025-12-07T23:59:59.000Z",
    "newExpiryDate": "2026-01-06T23:59:59.000Z",
    "extendedBy": 30,
    "extendedAt": "2025-11-07T11:00:00.000Z"
  }
}
```

---

## Webhook Notifications

UCG will send webhook notifications to service providers for important events.

### Configuring Webhook

Set webhook URL in service provider settings:
```json
{
  "webhookUrl": "https://mwangaschool.ac.tz/webhooks/ucg",
  "webhookSecret": "your_secret_key",
  "enabledEvents": [
    "PAYMENT_RECEIVED",
    "REFERENCE_EXPIRED",
    "BULK_REFERENCE_COMPLETE"
  ]
}
```

### Webhook Events

#### 1. Payment Received

```http
POST {serviceProvider.webhookUrl}
Content-Type: application/json
X-UCG-Signature: sha256_hmac_signature
X-UCG-Event: PAYMENT_RECEIVED

{
  "event": "PAYMENT_RECEIVED",
  "timestamp": "2025-11-07T12:00:00.000Z",
  "data": {
    "transactionId": "TXN-550e8400-e29b-41d4-a716-446655440000",
    "referenceNumber": "MWA-0001234-A7B",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "currency": "TZS",
    "channel": "VODACOM_MPESA",
    "externalTransactionId": "OFH1234567",
    "paidAt": "2025-11-07T12:00:00.000Z",
    "status": "SUCCESS",
    "metadata": {
      "studentId": "STD-2024-001",
      "grade": "Standard 5"
    }
  }
}
```

#### 2. Reference Expired

```http
POST {serviceProvider.webhookUrl}
Content-Type: application/json
X-UCG-Signature: sha256_hmac_signature
X-UCG-Event: REFERENCE_EXPIRED

{
  "event": "REFERENCE_EXPIRED",
  "timestamp": "2025-12-08T00:00:00.000Z",
  "data": {
    "referenceNumber": "MWA-0001234-A7B",
    "customerName": "John Doe",
    "amount": 50000,
    "expiresAt": "2025-12-07T23:59:59.000Z",
    "status": "EXPIRED",
    "metadata": {
      "studentId": "STD-2024-001"
    }
  }
}
```

#### 3. Bulk Generation Complete

```http
POST {serviceProvider.webhookUrl}
Content-Type: application/json
X-UCG-Signature: sha256_hmac_signature
X-UCG-Event: BULK_REFERENCE_COMPLETE

{
  "event": "BULK_REFERENCE_COMPLETE",
  "timestamp": "2025-11-07T10:35:00.000Z",
  "data": {
    "batchId": "batch-550e8400-e29b-41d4-a716-446655440000",
    "totalRequested": 1000,
    "successCount": 998,
    "failureCount": 2,
    "downloadUrl": "https://api.ucg.mhb.co.tz/api/v1/sp/references/bulk/batch-550e8400/download"
  }
}
```

### Verifying Webhook Signatures

```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    """Verify webhook signature"""
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)

# Usage
signature = request.headers.get('X-UCG-Signature')
payload = request.body
secret = 'your_webhook_secret'

if verify_webhook_signature(payload, signature, secret):
    # Process webhook
    pass
else:
    # Invalid signature
    return 401
```

---

## Rate Limits

```yaml
Reference Generation:
  Single: 100 requests/minute per SP
  Bulk: 10 requests/minute per SP
  Max References per Bulk: 1000

Reference Queries:
  List: 100 requests/minute per SP
  Get Details: 200 requests/minute per SP
  Statistics: 20 requests/minute per SP

Validation:
  100 requests/minute per SP
```

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1636272000
```

**Rate Limit Exceeded Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 seconds.",
    "retryAfter": 60
  }
}
```

---

## Integration Flow

### Scenario 1: School Generating References for Students

```
┌─────────────────┐
│  School Admin   │
│    (Desktop)    │
└────────┬────────┘
         │
         │ 1. Login
         ▼
┌─────────────────┐
│   School MIS    │ 2. Fetch student list
│    (Software)   │
└────────┬────────┘
         │
         │ 3. Generate references (bulk)
         ▼
┌─────────────────┐
│   UCG Backend   │ 4. Process batch
│                 │────────────┐
└────────┬────────┘            │
         │                     │ 5. Generate references
         │ 6. Return batch ID │
         │◄────────────────────┘
         │
         │ 7. Send webhook when complete
         ▼
┌─────────────────┐
│   School MIS    │ 8. Download results (CSV)
│                 │
└────────┬────────┘
         │
         │ 9. Send references to students
         ▼
┌─────────────────┐
│    Students     │ 10. Receive reference via SMS/Email
│  (Customers)    │
└─────────────────┘
```

### Scenario 2: Hospital Generating Reference for Patient

```
┌─────────────────┐
│  Hospital Staff │
└────────┬────────┘
         │ 1. Patient visits
         ▼
┌─────────────────┐
│  Hospital HMS   │ 2. Create bill
│   (Software)    │
└────────┬────────┘
         │
         │ 3. Generate reference (single)
         ▼
┌─────────────────┐
│   UCG Backend   │ 4. Generate reference
│                 │────────────┐
└────────┬────────┘            │
         │                     │ 5. Return reference
         │◄────────────────────┘
         │
         ▼
┌─────────────────┐
│  Hospital HMS   │ 6. Print bill with reference
│                 │
└────────┬────────┘
         │
         │ 7. Give to patient
         ▼
┌─────────────────┐
│     Patient     │ 8. Pays via mobile money
│   (Customer)    │
└─────────────────┘
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid request data | 400 |
| `AUTHENTICATION_FAILED` | Invalid credentials | 401 |
| `UNAUTHORIZED` | Missing or invalid token | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `REFERENCE_NOT_FOUND` | Reference does not exist | 404 |
| `DUPLICATE_REFERENCE` | Reference already exists | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `SP_INACTIVE` | Service provider not active | 403 |
| `INSUFFICIENT_BALANCE` | Not enough credit for operation | 402 |
| `INTERNAL_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily down | 503 |

---

## Best Practices

### 1. Bulk Generation for Multiple References

```python
# Good: Generate all references in one batch
references = []
for student in students:
    references.append({
        "customerName": student.name,
        "customerPhone": student.phone,
        "amount": student.fees,
        "metadata": {"studentId": student.id}
    })

response = ucg_api.bulk_generate(references)
```

### 2. Handle Webhook Asynchronously

```python
@app.route('/webhooks/ucg', methods=['POST'])
def handle_ucg_webhook():
    # Verify signature
    if not verify_signature(request):
        return 401

    # Queue for async processing
    queue.enqueue('process_ucg_webhook', request.json)

    # Return 200 immediately
    return {'success': True}, 200
```

### 3. Store References Locally

```python
# Store references in your system for quick lookup
def store_reference(reference):
    db.execute("""
        INSERT INTO payment_references
        (ucg_reference, student_id, amount, expires_at)
        VALUES (?, ?, ?, ?)
    """, (
        reference['referenceNumber'],
        reference['metadata']['studentId'],
        reference['amount'],
        reference['expiresAt']
    ))
```

### 4. Implement Retry Logic

```python
import requests
from tenacity import retry, wait_exponential, stop_after_attempt

@retry(
    wait=wait_exponential(multiplier=1, min=4, max=10),
    stop=stop_after_attempt(3)
)
def generate_reference(data):
    response = requests.post(
        'https://api.ucg.mhb.co.tz/api/v1/sp/references',
        headers={'Authorization': f'Bearer {token}'},
        json=data
    )
    response.raise_for_status()
    return response.json()
```

### 5. Monitor Reference Status

```python
# Poll for bulk job completion
def wait_for_bulk_completion(batch_id, timeout=300):
    start_time = time.time()

    while time.time() - start_time < timeout:
        status = ucg_api.get_bulk_status(batch_id)

        if status['status'] == 'COMPLETED':
            return ucg_api.download_results(batch_id)

        if status['status'] == 'FAILED':
            raise Exception("Bulk generation failed")

        time.sleep(5)

    raise TimeoutError("Bulk generation timed out")
```

---

## Sample Code Libraries

### Python SDK

```python
from ucg_sdk import UCGClient

# Initialize client
client = UCGClient(
    api_url='https://api.ucg.mhb.co.tz',
    email='admin@mwangaschool.ac.tz',
    password='secure_password'
)

# Generate single reference
reference = client.references.create(
    customer_name='John Doe',
    customer_phone='+255712345678',
    amount=50000,
    description='School fees - Term 1',
    metadata={'studentId': 'STD-2024-001'}
)
print(f"Reference: {reference.reference_number}")

# Generate bulk references
references = [
    {'customerName': 'John Doe', 'amount': 50000, ...},
    {'customerName': 'Jane Smith', 'amount': 50000, ...}
]
batch = client.references.bulk_create(references)
print(f"Batch ID: {batch.batch_id}")

# Wait for completion
results = client.references.wait_for_batch(batch.batch_id)
print(f"Generated {results.success_count} references")
```

### Node.js SDK

```javascript
const UCGClient = require('@ucg/sdk');

// Initialize client
const client = new UCGClient({
  apiUrl: 'https://api.ucg.mhb.co.tz',
  email: 'admin@mwangaschool.ac.tz',
  password: 'secure_password'
});

// Generate single reference
const reference = await client.references.create({
  customerName: 'John Doe',
  customerPhone: '+255712345678',
  amount: 50000,
  description: 'School fees - Term 1',
  metadata: { studentId: 'STD-2024-001' }
});
console.log(`Reference: ${reference.referenceNumber}`);

// Generate bulk references
const references = [
  { customerName: 'John Doe', amount: 50000, ... },
  { customerName: 'Jane Smith', amount: 50000, ... }
];
const batch = await client.references.bulkCreate(references);
console.log(`Batch ID: ${batch.batchId}`);
```

### PHP SDK

```php
<?php
use UCG\Client;

// Initialize client
$client = new Client([
    'api_url' => 'https://api.ucg.mhb.co.tz',
    'email' => 'admin@mwangaschool.ac.tz',
    'password' => 'secure_password'
]);

// Generate single reference
$reference = $client->references->create([
    'customerName' => 'John Doe',
    'customerPhone' => '+255712345678',
    'amount' => 50000,
    'description' => 'School fees - Term 1',
    'metadata' => ['studentId' => 'STD-2024-001']
]);
echo "Reference: {$reference->referenceNumber}\n";

// Generate bulk references
$references = [
    ['customerName' => 'John Doe', 'amount' => 50000, ...],
    ['customerName' => 'Jane Smith', 'amount' => 50000, ...]
];
$batch = $client->references->bulkCreate($references);
echo "Batch ID: {$batch->batchId}\n";
?>
```

---

## Testing

### Test Credentials (UAT Environment)

```yaml
UAT API: https://api-uat.ucg.mhb.co.tz
Email: test-sp@ucg-test.mhb.co.tz
Password: Test@123456
SP Code: TST
```

### Test Phone Numbers

```yaml
Valid Payment Test: +255700000001
Failed Payment Test: +255700000002
Timeout Test: +255700000003
```

### cURL Examples

```bash
# 1. Login
curl -X POST https://api-uat.ucg.mhb.co.tz/api/v1/auth/sp/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-sp@ucg-test.mhb.co.tz",
    "password": "Test@123456"
  }'

# 2. Generate Reference
curl -X POST https://api-uat.ucg.mhb.co.tz/api/v1/sp/references \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-SP-Code: TST" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "description": "Test payment"
  }'

# 3. Validate Reference
curl -X GET https://api-uat.ucg.mhb.co.tz/api/v1/sp/references/TST-0001234-A7B/validate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Support

### Documentation
- API Docs: https://docs.ucg.mhb.co.tz
- Swagger UI: https://api.ucg.mhb.co.tz/api/docs
- Postman Collection: https://www.postman.com/ucg-api

### Technical Support
- Email: support@ucg.mhb.co.tz
- Phone: +255 XXX XXX XXX
- Response Time: < 1 hour (business hours)

### Developer Portal
- Portal: https://developers.ucg.mhb.co.tz
- SDK Downloads: https://developers.ucg.mhb.co.tz/sdks
- Code Examples: https://github.com/ucg-tanzania/examples

---

**Document Version**: 1.0
**Last Updated**: November 7, 2025
**API Version**: v1
**Status**: READY FOR IMPLEMENTATION
