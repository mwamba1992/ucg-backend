# Payment Reference API

## Authentication

All requests require a Bearer token. The service provider is identified from the token.

```
Authorization: Bearer <your_api_key>
```

---

## 1. Create Payment Reference

`POST /api/v1/sp/references`

### Mandatory fields

| Field | Type | Rule |
|-------|------|------|
| `customerName` | string | max 200 chars |
| `customerPhone` | string | max 15 chars |
| `amount` | number | minimum 100 |

### Optional fields

| Field | Type | Notes |
|-------|------|-------|
| `customerEmail` | string | valid email |
| `customerId` | string | National ID / Passport, etc. |
| `customerIdType` | string | 1=National ID, 2=Passport, 3=Driving License |
| `customerAccount` | string | account with the provider |
| `paymentOption` | enum | `COMPLETE` (default) \| `PARTIAL` \| `PRECISE` \| `LIMITED` \| `PERPETUAL` |
| `minPaymentAmount` | number | for partial payments only |
| `currency` | string | default `TZS` |
| `exchangeRate` | number | default `1.0` |
| `referenceNumber` | string | auto-generated if omitted |
| `expiresAt` | string | ISO 8601; no expiry if omitted |
| `description` | string | payment purpose |
| `metadata` | object | free-form key/values |
| `lineItems` | array | service breakdown |
| `callbackUrl` | string | webhook for async responses |

### Example

```bash
curl -X POST "https://your-system.com/api/v1/sp/references" \
  -H "Authorization: Bearer <your_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000.00,
    "currency": "TZS",
    "paymentOption": "COMPLETE",
    "description": "School fees for Term 1"
  }'
```

---

## 2. Get Single Payment Reference

`GET /api/v1/sp/references/{referenceNumber}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `referenceNumber` | string | yes | format `XXX-YYYYYYY-ZZZ` |

### Example

```bash
curl -X GET "https://your-system.com/api/v1/sp/references/ABC-1234567-001" \
  -H "Authorization: Bearer <your_api_key>"
```

### Response

```json
{
  "id": "uuid",
  "referenceNumber": "ABC-1234567-001",
  "serviceProviderId": "uuid",
  "serviceProviderName": "ABC Institution",
  "customerName": "John Doe",
  "customerPhone": "+255712345678",
  "amount": 50000.00,
  "currency": "TZS",
  "status": "ACTIVE",
  "isValid": true,
  "isExpired": false,
  "description": "School fees for Term 1",
  "expiresAt": "2026-12-31T23:59:59Z",
  "metadata": {},
  "usedAt": null,
  "transactionId": null,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

### Field notes

- Always present: `id`, `referenceNumber`, `serviceProviderId`, `customerName`, `customerPhone`, `amount`, `currency`, `status`, `isValid`, `isExpired`, `createdAt`, `updatedAt`.
- May be `null`: `serviceProviderName`, `description`, `expiresAt`, `metadata`, `usedAt`, `transactionId`.
- `status`: `ACTIVE` \| `USED` \| `EXPIRED` \| `CANCELLED`.

### Status codes

- `200` success
- `401` missing/invalid token
- `404` reference not found
- `500` server error
