# Third-Party Payment Integration Guide

## Overview

This document describes the requirements for third-party systems to integrate with the UCG Payment Gateway for processing payments.

**Version**: 1.0
**Last Updated**: January 2026
**Base URL**: `https://api.ucg.mhb.co.tz/api/v1`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Payment Options](#payment-options)
3. [Payment Reference Structure](#payment-reference-structure)
4. [API Endpoint](#api-endpoint)
5. [Required Data Fields](#required-data-fields)
6. [Payment Workflow](#payment-workflow)
7. [Response Codes](#response-codes)
8. [Examples](#examples)
9. [Testing](#testing)

---

## Authentication

### API Key Authentication

All API requests must include an API key in the request headers:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**How to get an API Key:**
- Contact UCG administrator
- Provide your organization details
- API key will be generated upon approval

---

## Payment Options

UCG supports multiple payment options that determine how payments can be made against a reference:

| Payment Option | Code | Description | Use Case |
|---------------|------|-------------|----------|
| **COMPLETE** | `COMPLETE` | Single payment ≥ invoice amount | Full payment or overpayment allowed |
| **PARTIAL** | `PARTIAL` | Multiple payments allowed, last payment ≥ remaining | Installment payments with flexible amounts |
| **PRECISE** | `PRECISE` | Single payment exactly = invoice amount | Exact amount required, no more/less |
| **LIMITED** | `LIMITED` | Multiple payments ≤ invoice, last = exact remaining | Controlled installments |
| **PERPETUAL** | `PERPETUAL` | Any number of payments, any amount | Ongoing payments (e.g., donations) |

### Payment Option Examples:

**COMPLETE** - Invoice: 100,000 TZS
- ✅ Pay 100,000 (complete)
- ✅ Pay 150,000 (overpayment allowed)
- ❌ Pay 50,000 (insufficient)

**PRECISE** - Invoice: 100,000 TZS
- ✅ Pay 100,000 (exact match)
- ❌ Pay 99,999 or 100,001 (must be exact)

**PARTIAL** - Invoice: 100,000 TZS
- ✅ Pay 30,000 (first installment)
- ✅ Pay 40,000 (second installment)
- ✅ Pay 30,000 or more (final payment must clear remaining)

**LIMITED** - Invoice: 100,000 TZS
- ✅ Pay 30,000 (first installment)
- ✅ Pay 40,000 (second installment)
- ✅ Pay 30,000 exactly (final payment must be exact remaining)

---

## Payment Reference Structure

Payment references use the format: `XXX-YYYYYYY-ZZZ`

- `XXX`: Service Provider Code (3 characters)
- `YYYYYYY`: Sequential number (7 digits)
- `ZZZ`: Checksum (3 characters)

**Example**: `UCG-0001234-A7B`

### Reference Validation

Before making a payment, validate the reference:

**Endpoint**: `GET /references/validate/{referenceNumber}`

**Response**:
```json
{
  "isValid": true,
  "referenceNumber": "UCG-0001234-A7B",
  "status": "ACTIVE",
  "expiresAt": "2026-02-15T23:59:59.000Z",
  "daysUntilExpiry": 25,
  "reason": "Valid reference",
  "validationChecks": {
    "formatValid": true,
    "checksumValid": true,
    "notExpired": true,
    "notUsed": true,
    "notCancelled": true
  }
}
```

---

## API Endpoint

### Make Payment

**Endpoint**: `POST /payments`
**Method**: `POST`
**Authentication**: Required (API Key)

---

## Required Data Fields

### Request Body Schema

```json
{
  "referenceNumber": "string (required, max 100 chars)",
  "payerName": "string (required, max 200 chars)",
  "payerPhone": "string (required, max 15 chars, format: +255XXXXXXXXX)",
  "amountPaid": "number (required, min: 100)",
  "currency": "string (optional, default: TZS, max 10 chars)",
  "paymentChannel": "string (required, max 10 chars)",
  "fspCode": "string (required, max 50 chars)",
  "transactionId": "string (optional)",
  "description": "string (optional, max 255 chars)"
}
```

### Field Descriptions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `referenceNumber` | String | **Yes** | UCG payment reference number | `UCG-0001234-A7B` |
| `payerName` | String | **Yes** | Full name of person making payment | `John Doe` |
| `payerPhone` | String | **Yes** | Phone number in international format | `+255712345678` |
| `amountPaid` | Number | **Yes** | Amount paid in minor units (e.g., cents) | `50000` (500.00 TZS) |
| `currency` | String | No | ISO currency code | `TZS`, `USD`, `EUR` |
| `paymentChannel` | String | **Yes** | Payment method used | `MPESA`, `TIGOPESA`, `AIRTEL`, `Bank` |
| `fspCode` | String | **Yes** | Financial service provider code | `VODACOM`, `TIGO`, `AIRTEL`, `CRDB` |
| `transactionId` | String | No | External transaction reference | `TXN123456789` |
| `description` | String | No | Payment purpose or notes | `School fees payment` |

### Supported Payment Channels

| Channel | Code | Description |
|---------|------|-------------|
| Mobile Money - Vodacom M-Pesa | `MPESA` | Vodacom M-Pesa payments |
| Mobile Money - Tigo Pesa | `TIGOPESA` | Tigo Pesa payments |
| Mobile Money - Airtel Money | `AIRTEL` | Airtel Money payments |
| Bank Transfer | `Bank` | Direct bank transfers |

### Supported FSP Codes

| FSP Name | Code |
|----------|------|
| Vodacom (M-Pesa) | `VODACOM` |
| Tigo (Tigo Pesa) | `TIGO` |
| Airtel (Airtel Money) | `AIRTEL` |
| CRDB Bank | `CRDB` |
| NMB Bank | `NMB` |
| NBC Bank | `NBC` |

---

## Payment Workflow

```
┌─────────────────────────────────────────────────────────┐
│ Third-Party System                                       │
└───────────────┬─────────────────────────────────────────┘
                │
                │ 1. Validate Reference
                ├───────────────────────────────────────►
                │   GET /references/validate/{ref}
                │
                │ 2. Reference Validation Response
                ◄───────────────────────────────────────┤
                │   { isValid: true, status: "ACTIVE" }
                │
                │ 3. Submit Payment
                ├───────────────────────────────────────►
                │   POST /payments
                │   { referenceNumber, amountPaid, ... }
                │
                │ 4. Payment Processing
                │   - Validate payment amount
                │   - Check payment option rules
                │   - Execute CBS transfer (if enabled)
                │   - Send notifications
                │
                │ 5. Payment Response
                ◄───────────────────────────────────────┤
                │   { id, status: "SUCCESS", ... }
                │
                │ 6. Query Payment Status (Optional)
                ├───────────────────────────────────────►
                │   GET /payments/{referenceNumber}
                │
                │ 7. Payment Details Response
                ◄───────────────────────────────────────┤
                │   { totalPaid, paymentCount, ... }
                │
```

---

## Response Codes

### Success Response (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "referenceNumber": "UCG-0001234-A7B",
  "payerName": "John Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 50000,
  "currency": "TZS",
  "paymentChannel": "MPESA",
  "fspCode": "VODACOM",
  "transactionId": "TXN123456789",
  "status": "SUCCESS",
  "paidAt": "2026-01-21T10:30:00.000Z",
  "createdAt": "2026-01-21T10:30:00.000Z",
  "updatedAt": "2026-01-21T10:30:00.000Z"
}
```

### Error Responses

#### 400 Bad Request - Invalid Reference

```json
{
  "statusCode": 400,
  "message": "Invalid reference number",
  "error": "Bad Request"
}
```

#### 400 Bad Request - Invalid Amount

```json
{
  "statusCode": 400,
  "message": "Payment not allowed: PRECISE option requires payment exactly = 50000",
  "error": "Bad Request"
}
```

#### 400 Bad Request - Reference Expired

```json
{
  "statusCode": 400,
  "message": "Reference is not valid. Status: EXPIRED",
  "error": "Bad Request"
}
```

#### 400 Bad Request - Already Fully Paid

```json
{
  "statusCode": 400,
  "message": "Reference has been fully paid. No further payments accepted.",
  "error": "Bad Request"
}
```

#### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### 404 Not Found - Reference Not Found

```json
{
  "statusCode": 404,
  "message": "Invalid reference number",
  "error": "Not Found"
}
```

---

## Examples

### Example 1: Complete Payment (COMPLETE Option)

**Request**:
```bash
curl -X POST https://api.ucg.mhb.co.tz/api/v1/payments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceNumber": "UCG-0001234-A7B",
    "payerName": "John Doe",
    "payerPhone": "+255712345678",
    "amountPaid": 100000,
    "currency": "TZS",
    "paymentChannel": "MPESA",
    "fspCode": "VODACOM",
    "transactionId": "MP20260121001",
    "description": "School fees payment"
  }'
```

**Response** (201 Created):
```json
{
  "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "referenceNumber": "UCG-0001234-A7B",
  "payerName": "John Doe",
  "payerPhone": "+255712345678",
  "amountPaid": 100000,
  "currency": "TZS",
  "paymentChannel": "MPESA",
  "fspCode": "VODACOM",
  "transactionId": "MP20260121001",
  "status": "SUCCESS",
  "paidAt": "2026-01-21T10:30:00.000Z"
}
```

### Example 2: First Installment (PARTIAL Option)

**Request**:
```bash
curl -X POST https://api.ucg.mhb.co.tz/api/v1/payments \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceNumber": "UCG-0002345-B8C",
    "payerName": "Jane Smith",
    "payerPhone": "+255723456789",
    "amountPaid": 30000,
    "currency": "TZS",
    "paymentChannel": "TIGOPESA",
    "fspCode": "TIGO",
    "transactionId": "TP20260121002",
    "description": "First installment - School fees"
  }'
```

**Response** (201 Created):
```json
{
  "id": "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
  "referenceNumber": "UCG-0002345-B8C",
  "payerName": "Jane Smith",
  "payerPhone": "+255723456789",
  "amountPaid": 30000,
  "currency": "TZS",
  "paymentChannel": "TIGOPESA",
  "fspCode": "TIGO",
  "transactionId": "TP20260121002",
  "status": "SUCCESS",
  "paidAt": "2026-01-21T11:15:00.000Z"
}
```

### Example 3: Query Payment Status

**Request**:
```bash
curl -X GET https://api.ucg.mhb.co.tz/api/v1/payments/UCG-0002345-B8C \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "referenceNumber": "UCG-0002345-B8C",
    "payments": [
      {
        "id": "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
        "amountPaid": 30000,
        "payerName": "Jane Smith",
        "payerPhone": "+255723456789",
        "paymentChannel": "TIGOPESA",
        "status": "SUCCESS",
        "currency": "TZS",
        "paidAt": "2026-01-21T11:15:00.000Z"
      }
    ],
    "totalPaid": 30000,
    "paymentCount": 1
  }
}
```

### Example 4: Get Payment Summary

**Request**:
```bash
curl -X GET https://api.ucg.mhb.co.tz/api/v1/payments/UCG-0002345-B8C/summary \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response** (200 OK):
```json
{
  "referenceNumber": "UCG-0002345-B8C",
  "invoiceAmount": 100000,
  "totalPaid": 30000,
  "remainingAmount": 70000,
  "installmentCount": 1,
  "paymentOption": "PARTIAL",
  "isFullyPaid": false,
  "status": "ACTIVE",
  "payments": [
    {
      "id": "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
      "amountPaid": 30000,
      "payerName": "Jane Smith",
      "paymentChannel": "TIGOPESA",
      "fspCode": "TIGO",
      "paidAt": "2026-01-21T11:15:00.000Z",
      "status": "SUCCESS"
    }
  ]
}
```

---

## Testing

### Test Environment

**Base URL**: `https://test-api.ucg.mhb.co.tz/api/v1`
**Test API Key**: Contact UCG for test credentials

### Test References

Use these test references for integration testing:

| Reference | Amount | Payment Option | Description |
|-----------|--------|----------------|-------------|
| `TEST-0000001-ABC` | 50,000 TZS | COMPLETE | Single full payment |
| `TEST-0000002-DEF` | 100,000 TZS | PARTIAL | Multiple installments |
| `TEST-0000003-GHI` | 75,000 TZS | PRECISE | Exact amount only |
| `TEST-0000004-JKL` | 200,000 TZS | LIMITED | Controlled installments |

### Test Payment Scenarios

#### Scenario 1: Successful Full Payment
```json
{
  "referenceNumber": "TEST-0000001-ABC",
  "payerName": "Test User",
  "payerPhone": "+255700000001",
  "amountPaid": 50000,
  "paymentChannel": "MPESA",
  "fspCode": "VODACOM"
}
```
**Expected**: 201 Created, payment SUCCESS

#### Scenario 2: Invalid Reference
```json
{
  "referenceNumber": "INVALID-REF",
  "payerName": "Test User",
  "payerPhone": "+255700000001",
  "amountPaid": 50000,
  "paymentChannel": "MPESA",
  "fspCode": "VODACOM"
}
```
**Expected**: 400 Bad Request, "Invalid reference number"

#### Scenario 3: Insufficient Amount (PRECISE)
```json
{
  "referenceNumber": "TEST-0000003-GHI",
  "payerName": "Test User",
  "payerPhone": "+255700000001",
  "amountPaid": 70000,
  "paymentChannel": "MPESA",
  "fspCode": "VODACOM"
}
```
**Expected**: 400 Bad Request, "PRECISE option requires payment exactly = 75000"

---

## Data Requirements Summary for Third-Party Systems

### Minimum Required Data to Prepare:

1. **Payment Reference Number** - Obtained from UCG or service provider
2. **Payer Information**:
   - Full name (as per national ID or official document)
   - Phone number (international format: +255XXXXXXXXX)
3. **Payment Details**:
   - Amount to pay (in minor units, e.g., cents)
   - Currency (default: TZS)
4. **Transaction Information**:
   - Payment channel used (MPESA, TIGOPESA, AIRTEL, Bank)
   - FSP code (VODACOM, TIGO, AIRTEL, CRDB, etc.)
   - Your system's transaction ID (for reconciliation)
5. **Optional**:
   - Payment description/purpose

### Integration Checklist

- [ ] Obtain API credentials from UCG
- [ ] Implement reference validation before payment
- [ ] Handle all payment options (COMPLETE, PARTIAL, PRECISE, LIMITED, PERPETUAL)
- [ ] Implement proper error handling
- [ ] Store transaction IDs for reconciliation
- [ ] Test with test references in test environment
- [ ] Implement payment status checking
- [ ] Set up monitoring and logging
- [ ] Prepare reconciliation reports

---

## Support

For technical support or questions:

**Email**: support@ucg.mhb.co.tz
**Phone**: +255 XXX XXX XXX
**Documentation**: https://docs.ucg.mhb.co.tz

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-21 | Initial documentation |

