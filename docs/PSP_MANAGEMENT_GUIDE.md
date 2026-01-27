# PSP Management & Usage Guide

## Overview

This guide provides complete information for managing Payment Service Provider (PSP) users and integrating with the PSP API.

**Target Audience:**
- **Section 1-3**: Frontend developers (Admin Portal)
- **Section 4-5**: Third-party PSP integrators
- **Section 6**: Both

---

## Table of Contents

1. [PSP User Management (Admin Portal)](#1-psp-user-management-admin-portal)
2. [Admin Portal UI Requirements](#2-admin-portal-ui-requirements)
3. [Admin API Endpoints](#3-admin-api-endpoints)
4. [PSP API Usage (Third-Party Systems)](#4-psp-api-usage-third-party-systems)
5. [Integration Testing](#5-integration-testing)
6. [Security Best Practices](#6-security-best-practices)

---

## 1. PSP User Management (Admin Portal)

### What is a PSP User?

**PSP (Payment Service Provider) User** is an API-only user type that allows external third-party systems to:
- Submit payments on behalf of customers
- Verify payment references
- Check payment status

**Key Characteristics:**
- ❌ Cannot login to any portal (Admin or SP)
- ❌ No email/password authentication
- ✅ Uses API key for all requests
- ✅ API key sent via SMS when created
- ✅ API key never expires (unless regenerated)

### User Types Comparison

| User Type | Portal Access | Auth Method | Purpose |
|-----------|---------------|-------------|---------|
| **ADMIN** | Admin Portal | Email/Password (JWT) | UCG staff managing system |
| **SERVICE_PROVIDER** | SP Portal | Email/Password (JWT) | Institutions creating references |
| **PSP** | ❌ None | API Key only | Third-party payment systems |

---

## 2. Admin Portal UI Requirements

### 2.1 PSP User List Page

**Route:** `/admin/psp-users`

**Page Elements:**

```
+----------------------------------------------------------+
| PSP Users Management                          [+ Create] |
+----------------------------------------------------------+
| Filter: [Search by name/email]  Status: [All v]  [Search]|
+----------------------------------------------------------+
|  Name          | Email              | Phone        | Status  | Created   | Actions     |
|----------------|--------------------|--------------|---------|-----------|--------------
|  External Sys  | psp@external.com   | +2557123456  | Active  | Jan 20    | [View] [••• ]
|  Payment Corp  | api@payment.com    | +2557654321  | Active  | Jan 19    | [View] [••• ]
|  Third Party   | pay@third.com      | +2557999888  | Inactive| Jan 18    | [View] [••• ]
+----------------------------------------------------------+
```

**Actions Menu (•••):**
- View Details
- Regenerate API Key
- Deactivate User
- Delete User (optional)

---

### 2.2 Create PSP User Form

**Route:** `/admin/psp-users/create`

**Form Fields:**

```jsx
<Form onSubmit={handleCreatePspUser}>
  <FormField label="First Name *" required>
    <Input name="firstName" placeholder="e.g., External" />
  </FormField>

  <FormField label="Last Name *" required>
    <Input name="lastName" placeholder="e.g., System" />
  </FormField>

  <FormField label="Email *" required>
    <Input type="email" name="email" placeholder="psp@example.com" />
  </FormField>

  <FormField label="Phone Number *" required>
    <Input name="phoneNumber" placeholder="+255712345678" />
    <HelpText>API key will be sent to this number via SMS</HelpText>
  </FormField>

  <FormField label="Organization Name">
    <Input name="organizationName" placeholder="Third Party Payment Corp" />
    <HelpText>Optional. Used in SMS notification</HelpText>
  </FormField>

  <Alert type="info">
    <strong>Note:</strong> The API key will be sent via SMS to the provided phone number.
    Make sure the phone number is correct and accessible.
  </Alert>

  <ButtonGroup>
    <Button type="submit" variant="primary">Create PSP User</Button>
    <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
  </ButtonGroup>
</Form>
```

**Success Response Handling:**

```jsx
// After successful creation
const onSuccess = (response) => {
  const { data } = response;

  // Show success modal with API key
  showModal({
    title: "PSP User Created Successfully",
    type: "success",
    content: (
      <>
        <p>API key has been sent via SMS to {data.phoneNumber}</p>

        <Alert type="warning">
          <strong>Important:</strong> Save this API key securely.
          It will only be displayed once.
        </Alert>

        <CopyableField label="API Key" value={data.apiKey} />

        <InfoBox>
          <strong>User Details:</strong>
          <ul>
            <li>Email: {data.email}</li>
            <li>User Type: {data.userType}</li>
            <li>Status: {data.status}</li>
          </ul>
        </InfoBox>
      </>
    ),
    buttons: [
      { label: "Copy API Key", onClick: () => copyToClipboard(data.apiKey) },
      { label: "Done", onClick: () => navigate('/admin/psp-users') }
    ]
  });
};
```

---

### 2.3 PSP User Details Page

**Route:** `/admin/psp-users/:userId`

**Page Layout:**

```
+----------------------------------------------------------+
| PSP User Details                         [Regenerate API Key] [Deactivate]
+----------------------------------------------------------+
| Basic Information                                         |
| -------------------------------------------------------- |
| First Name:        External                              |
| Last Name:         System                                |
| Email:             psp@external.com                      |
| Phone:             +255712345678                         |
| Organization:      Third Party Corp                      |
|                                                          |
| Account Status                                           |
| -------------------------------------------------------- |
| User Type:         PSP (API Only)                        |
| Status:            Active                                |
| Created:           Jan 20, 2026 10:30 AM                |
| Last API Access:   Jan 21, 2026 2:15 PM                 |
|                                                          |
| API Key Information                                      |
| -------------------------------------------------------- |
| API Key:           ucg_psp_****************************  |
|                    [Show Full Key] (Admin only)          |
| Key Status:        Active                                |
| Created:           Jan 20, 2026 10:30 AM                |
| Last Regenerated:  Never                                 |
|                                                          |
| Recent API Activity                                      |
| -------------------------------------------------------- |
| [Chart showing API calls per day]                        |
|                                                          |
| Last 10 API Requests:                                    |
| Jan 21 14:15  POST /psp/payments          200 OK        |
| Jan 21 14:10  GET /psp/references/HO1-001 200 OK        |
| Jan 21 14:05  POST /psp/payments          400 Bad Req   |
+----------------------------------------------------------+
```

---

### 2.4 Regenerate API Key Flow

**Button:** "Regenerate API Key"

**Confirmation Dialog:**

```jsx
<ConfirmDialog
  title="Regenerate API Key?"
  type="warning"
  message={
    <>
      <p>This will generate a new API key and invalidate the old one.</p>
      <Alert type="danger">
        <strong>Warning:</strong> The third-party system will need to
        update their configuration with the new API key. The old key
        will stop working immediately.
      </Alert>
      <p>A new API key will be sent via SMS to: <strong>{user.phoneNumber}</strong></p>
    </>
  }
  onConfirm={handleRegenerateApiKey}
  onCancel={closeDialog}
  confirmText="Yes, Regenerate"
  cancelText="Cancel"
/>
```

**Success Response:**

```jsx
const onRegenerateSuccess = (response) => {
  showModal({
    title: "API Key Regenerated",
    type: "success",
    content: (
      <>
        <Alert type="success">
          New API key has been sent via SMS to {user.phoneNumber}
        </Alert>

        <Alert type="warning">
          <strong>Important:</strong> The old API key is no longer valid.
        </Alert>

        <CopyableField label="New API Key" value={response.data.apiKey} />

        <p>Please share this new API key with the third-party system securely.</p>
      </>
    ),
    buttons: [
      { label: "Copy New Key", onClick: () => copyToClipboard(response.data.apiKey) },
      { label: "Done", onClick: closeModal }
    ]
  });
};
```

---

### 2.5 Deactivate PSP User Flow

**Button:** "Deactivate"

**Confirmation Dialog:**

```jsx
<ConfirmDialog
  title="Deactivate PSP User?"
  type="warning"
  message={
    <>
      <p>This will immediately disable API access for this user.</p>
      <Alert type="danger">
        <strong>Impact:</strong> All API requests using this API key
        will be rejected with 401 Unauthorized.
      </Alert>
      <p>User: <strong>{user.firstName} {user.lastName}</strong></p>
      <p>Email: <strong>{user.email}</strong></p>
    </>
  }
  onConfirm={handleDeactivate}
  onCancel={closeDialog}
  confirmText="Yes, Deactivate"
  cancelText="Cancel"
/>
```

---

## 3. Admin API Endpoints

### 3.1 Create PSP User

**Endpoint:** `POST /api/v1/admin/psp-users`

**Request:**

```javascript
const createPspUser = async (data) => {
  try {
    const response = await axios.post('/api/v1/admin/psp-users', {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      organizationName: data.organizationName // optional
    }, {
      headers: {
        'Authorization': `Bearer ${adminJwtToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    handleError(error);
  }
};
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "PSP user created successfully. API key has been sent via SMS.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "psp@external.com",
    "apiKey": "ucg_psp_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7",
    "userType": "PSP",
    "status": "ACTIVE"
  }
}
```

**Error Responses:**

```json
// 409 - User exists
{
  "statusCode": 409,
  "message": "User with this email already exists"
}

// 401 - Unauthorized
{
  "statusCode": 401,
  "message": "Unauthorized"
}

// 403 - Forbidden (not admin)
{
  "statusCode": 403,
  "message": "Forbidden - Admin access required"
}
```

---

### 3.2 Regenerate API Key

**Endpoint:** `PUT /api/v1/admin/psp-users/:userId/regenerate-api-key`

**Request:**

```javascript
const regenerateApiKey = async (userId) => {
  try {
    const response = await axios.put(
      `/api/v1/admin/psp-users/${userId}/regenerate-api-key`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${adminJwtToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    handleError(error);
  }
};
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "API key regenerated successfully. New API key has been sent via SMS.",
  "data": {
    "apiKey": "ucg_psp_9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g9f8e7d6c5b4a3"
  }
}
```

---

### 3.3 Deactivate PSP User

**Endpoint:** `PUT /api/v1/admin/psp-users/:userId/deactivate`

**Request:**

```javascript
const deactivatePspUser = async (userId) => {
  try {
    const response = await axios.put(
      `/api/v1/admin/psp-users/${userId}/deactivate`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${adminJwtToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    handleError(error);
  }
};
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "PSP user deactivated successfully"
}
```

---

### 3.4 Get PSP Users List

**Note:** Use existing user list endpoint with filter

**Endpoint:** `GET /api/v1/admin/users?userType=PSP`

**Request:**

```javascript
const getPspUsers = async (filters = {}) => {
  try {
    const params = new URLSearchParams({
      userType: 'PSP',
      page: filters.page || 1,
      limit: filters.limit || 10,
      status: filters.status || '',
      search: filters.search || ''
    });

    const response = await axios.get(`/api/v1/admin/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${adminJwtToken}`
      }
    });

    return response.data;
  } catch (error) {
    handleError(error);
  }
};
```

---

### 3.5 Get Single PSP User

**Endpoint:** `GET /api/v1/admin/users/:userId`

**Request:**

```javascript
const getPspUser = async (userId) => {
  try {
    const response = await axios.get(`/api/v1/admin/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${adminJwtToken}`
      }
    });

    return response.data;
  } catch (error) {
    handleError(error);
  }
};
```

---

## 4. PSP API Usage (Third-Party Systems)

### 4.1 Authentication

All PSP API requests require API key authentication:

```javascript
const apiKey = 'ucg_psp_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7';

const headers = {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json'
};
```

**Important:**
- No login required
- API key never expires (unless regenerated)
- Store API key in environment variables/config
- Never commit API key to version control

---

### 4.2 Submit Payment

**Endpoint:** `POST /api/v1/psp/payments`

**Request:**

```javascript
const submitPayment = async (paymentData) => {
  try {
    const response = await axios.post(
      'https://ucg-api.example.com/api/v1/psp/payments',
      {
        referenceNumber: paymentData.referenceNumber,
        payerName: paymentData.payerName,
        payerPhone: paymentData.payerPhone,
        amountPaid: paymentData.amountPaid,
        paymentChannel: paymentData.paymentChannel, // e.g., "MPESA"
        fspCode: paymentData.fspCode, // e.g., "VODACOM"
        currency: paymentData.currency || 'TZS',
        transactionId: paymentData.transactionId, // optional
        description: paymentData.description // optional
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Payment submission failed:', error.response?.data || error.message);
    throw error;
  }
};

// Usage
const result = await submitPayment({
  referenceNumber: 'HO1-0000001-123',
  payerName: 'John Doe',
  payerPhone: '+255712345678',
  amountPaid: 50000,
  paymentChannel: 'MPESA',
  fspCode: 'VODACOM'
});
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "id": "payment-uuid",
    "referenceNumber": "HO1-0000001-123",
    "amountPaid": 50000,
    "payerName": "John Doe",
    "payerPhone": "+255712345678",
    "paymentChannel": "MPESA",
    "fspCode": "VODACOM",
    "status": "SUCCESS",
    "paidAt": "2026-01-21T10:30:00Z",
    "currency": "TZS"
  }
}
```

---

### 4.3 Verify Reference

**Endpoint:** `GET /api/v1/psp/references/:referenceNumber`

**Request:**

```javascript
const verifyReference = async (referenceNumber) => {
  try {
    const response = await axios.get(
      `https://ucg-api.example.com/api/v1/psp/references/${referenceNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Reference verification failed:', error.response?.data || error.message);
    throw error;
  }
};

// Usage
const reference = await verifyReference('HO1-0000001-123');

// Check if reference is valid before payment
if (reference.data.status === 'ACTIVE' && reference.data.remainingAmount > 0) {
  // Proceed with payment
  await submitPayment({ ... });
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "referenceNumber": "HO1-0000001-123",
    "amount": 50000,
    "totalPaid": 0,
    "remainingAmount": 50000,
    "currency": "TZS",
    "paymentOption": "COMPLETE",
    "status": "ACTIVE",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "description": "School fees payment",
    "expiryDate": "2026-12-31T23:59:59Z",
    "serviceProvider": {
      "spCode": "HO1",
      "businessName": "Hope International School",
      "email": "accounts@hopeschool.com"
    }
  }
}
```

---

### 4.4 Get Payment Summary

**Endpoint:** `GET /api/v1/psp/payments/reference/:referenceNumber`

**Request:**

```javascript
const getPaymentSummary = async (referenceNumber) => {
  try {
    const response = await axios.get(
      `https://ucg-api.example.com/api/v1/psp/payments/reference/${referenceNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to get payment summary:', error.response?.data || error.message);
    throw error;
  }
};

// Usage
const summary = await getPaymentSummary('HO1-0000001-123');
console.log(`Total Paid: ${summary.data.totalPaid}`);
console.log(`Remaining: ${summary.data.remainingAmount}`);
```

---

### 4.5 Complete Integration Example

```javascript
class UCGPaymentService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Step 1: Verify reference exists and is valid
  async verifyReference(referenceNumber) {
    const response = await axios.get(
      `${this.baseUrl}/psp/references/${referenceNumber}`,
      { headers: this.headers }
    );

    const reference = response.data.data;

    // Validate reference
    if (reference.status !== 'ACTIVE') {
      throw new Error(`Reference is ${reference.status}`);
    }

    if (reference.remainingAmount <= 0) {
      throw new Error('Reference is fully paid');
    }

    if (reference.expiryDate && new Date(reference.expiryDate) < new Date()) {
      throw new Error('Reference has expired');
    }

    return reference;
  }

  // Step 2: Validate payment amount
  validatePaymentAmount(reference, amountPaid) {
    const { paymentOption, amount, remainingAmount } = reference;

    switch (paymentOption) {
      case 'COMPLETE':
      case 'PRECISE':
        if (amountPaid !== amount) {
          throw new Error(`Exact amount required: ${amount}`);
        }
        break;

      case 'PARTIAL':
        if (amountPaid < 100 || amountPaid > remainingAmount) {
          throw new Error(`Amount must be between 100 and ${remainingAmount}`);
        }
        break;

      case 'LIMITED':
        const minAmount = reference.minimumAmount || 100;
        if (amountPaid < minAmount || amountPaid > remainingAmount) {
          throw new Error(`Amount must be between ${minAmount} and ${remainingAmount}`);
        }
        break;
    }

    return true;
  }

  // Step 3: Submit payment
  async submitPayment(paymentData) {
    // Verify reference first
    const reference = await this.verifyReference(paymentData.referenceNumber);

    // Validate amount
    this.validatePaymentAmount(reference, paymentData.amountPaid);

    // Submit payment
    const response = await axios.post(
      `${this.baseUrl}/psp/payments`,
      paymentData,
      { headers: this.headers }
    );

    return response.data;
  }

  // Step 4: Verify payment was recorded
  async verifyPayment(referenceNumber) {
    const response = await axios.get(
      `${this.baseUrl}/psp/payments/reference/${referenceNumber}`,
      { headers: this.headers }
    );

    return response.data.data;
  }
}

// Usage
const ucg = new UCGPaymentService(
  process.env.UCG_API_KEY,
  'https://ucg-api.example.com/api/v1'
);

try {
  // Complete payment flow
  const payment = await ucg.submitPayment({
    referenceNumber: 'HO1-0000001-123',
    payerName: 'John Doe',
    payerPhone: '+255712345678',
    amountPaid: 50000,
    paymentChannel: 'MPESA',
    fspCode: 'VODACOM',
    transactionId: 'MPESA123456'
  });

  console.log('Payment successful:', payment.data.id);

  // Verify payment
  const summary = await ucg.verifyPayment('HO1-0000001-123');
  console.log('Payment verified:', summary);

} catch (error) {
  console.error('Payment failed:', error.message);
}
```

---

## 5. Integration Testing

### 5.1 Test Environment Setup

**Test API Endpoint:**
```
https://test-api.ucg.co.tz/api/v1
```

**Test API Key:**
Request from UCG admin team

**Test References:**
UCG will provide test reference numbers for integration testing.

---

### 5.2 Test Scenarios

#### Test 1: COMPLETE Payment
```javascript
// Reference: TEST-COMPLETE-001
// Amount: 50000 TZS
// Payment Option: COMPLETE

const result = await ucg.submitPayment({
  referenceNumber: 'TEST-COMPLETE-001',
  payerName: 'Test User',
  payerPhone: '+255712345678',
  amountPaid: 50000, // Must be exact amount
  paymentChannel: 'MPESA',
  fspCode: 'VODACOM'
});

// Expected: Success
```

#### Test 2: PARTIAL Payment
```javascript
// Reference: TEST-PARTIAL-001
// Amount: 100000 TZS
// Payment Option: PARTIAL

// First payment
await ucg.submitPayment({
  referenceNumber: 'TEST-PARTIAL-001',
  amountPaid: 40000, // Partial
  ...
});

// Second payment
await ucg.submitPayment({
  referenceNumber: 'TEST-PARTIAL-001',
  amountPaid: 60000, // Remaining
  ...
});

// Expected: Both succeed
```

#### Test 3: Invalid Amount
```javascript
// Reference: TEST-COMPLETE-001
// Amount: 50000 TZS
// Payment Option: COMPLETE

const result = await ucg.submitPayment({
  referenceNumber: 'TEST-COMPLETE-001',
  amountPaid: 30000, // Wrong amount
  ...
});

// Expected: Error - "Amount must be exactly 50000"
```

#### Test 4: Invalid API Key
```javascript
const badUcg = new UCGPaymentService('invalid_key', baseUrl);

await badUcg.submitPayment({ ... });

// Expected: 401 Unauthorized
```

---

## 6. Security Best Practices

### 6.1 Admin Portal Security

**API Key Display:**
```jsx
// Only show partial key by default
<ApiKeyDisplay value={apiKey} mode="masked" />
// Output: ucg_psp_****************************

// Show full key only when admin clicks "Show"
<Button onClick={() => setShowFullKey(true)}>Show Full Key</Button>
{showFullKey && <ApiKeyDisplay value={apiKey} mode="full" />}
```

**API Key Storage:**
- ❌ Never log API keys in browser console
- ❌ Never store API keys in localStorage
- ✅ Only display API key once after creation
- ✅ Provide copy-to-clipboard functionality
- ✅ Clear API key from state after modal closes

**Audit Logging:**
- Log all PSP user creation events
- Log all API key regeneration events
- Log all deactivation events
- Include admin user who performed action

---

### 6.2 PSP Integration Security

**API Key Storage:**
```javascript
// ✅ Good: Environment variables
const apiKey = process.env.UCG_API_KEY;

// ❌ Bad: Hardcoded
const apiKey = 'ucg_psp_abc123...';
```

**API Key Protection:**
- Store API key in secure environment variables
- Never commit API key to version control
- Add `.env` to `.gitignore`
- Use different API keys for test/production
- Rotate API keys periodically (e.g., every 6 months)

**Request Security:**
- Always use HTTPS
- Implement request timeout (e.g., 30 seconds)
- Implement retry logic for failed requests
- Log all API errors for monitoring
- Implement rate limiting on your side

**Error Handling:**
```javascript
// Don't expose API key in error logs
try {
  await axios.post(url, data, { headers });
} catch (error) {
  // ❌ Bad: API key exposed in logs
  console.error('Request failed:', error.config);

  // ✅ Good: Sanitize headers
  const sanitizedError = {
    ...error,
    config: {
      ...error.config,
      headers: { Authorization: '[REDACTED]' }
    }
  };
  console.error('Request failed:', sanitizedError);
}
```

---

## 7. Error Handling Reference

### Common Error Codes

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | Invalid reference number | Reference doesn't exist | Verify reference number is correct |
| 400 | Reference is not valid | Reference expired/cancelled | Check reference status first |
| 400 | Payment not allowed | Amount validation failed | Check payment option rules |
| 401 | Invalid API key | API key wrong/deactivated | Verify API key or regenerate |
| 404 | Not found | Reference not found | Double-check reference number |
| 429 | Too many requests | Rate limit exceeded | Implement backoff/retry logic |
| 500 | Internal server error | Server error | Retry request or contact support |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Payment not allowed: Amount must be exactly 50000 for PRECISE payment option"
  }
}
```

---

## 8. Support & Resources

### Documentation
- Full API docs: [PSP_ENDPOINTS.md](./PSP_ENDPOINTS.md)
- Third-party integration specs: [THIRD_PARTY_API_SPECIFICATIONS.md](./THIRD_PARTY_API_SPECIFICATIONS.md)

### Contact
- **Admin Support:** admin@ucg.co.tz
- **API Support:** api-support@ucg.co.tz
- **Technical Issues:** tech-support@ucg.co.tz

### Testing
- **Test Environment:** https://test-api.ucg.co.tz
- **Request Test API Key:** Contact admin team
- **Test References:** Provided upon request

---

## 9. Frontend Implementation Checklist

### Admin Portal Pages

- [ ] PSP Users list page (`/admin/psp-users`)
  - [ ] Table with user list
  - [ ] Search/filter functionality
  - [ ] Status filter (Active/Inactive)
  - [ ] Pagination
  - [ ] Actions menu per user

- [ ] Create PSP User page (`/admin/psp-users/create`)
  - [ ] Form with all required fields
  - [ ] Phone number validation (international format)
  - [ ] Email validation
  - [ ] Success modal with API key display
  - [ ] Copy to clipboard functionality
  - [ ] SMS notification confirmation

- [ ] PSP User detail page (`/admin/psp-users/:id`)
  - [ ] Display all user information
  - [ ] Show masked API key (full key on click)
  - [ ] Last API access timestamp
  - [ ] Regenerate API key button
  - [ ] Deactivate user button

- [ ] Regenerate API Key flow
  - [ ] Confirmation dialog with warning
  - [ ] Success modal with new API key
  - [ ] Copy to clipboard functionality

- [ ] Deactivate User flow
  - [ ] Confirmation dialog
  - [ ] Success notification
  - [ ] Update user status in UI

### API Integration

- [ ] Create PSP user API call
- [ ] Regenerate API key API call
- [ ] Deactivate user API call
- [ ] Get PSP users list API call
- [ ] Get single PSP user API call
- [ ] Error handling for all endpoints
- [ ] Loading states for all actions
- [ ] Success/error toast notifications

### Security

- [ ] Mask API keys by default
- [ ] Never log API keys
- [ ] Clear API key from state after display
- [ ] Require admin authentication
- [ ] Implement role-based access control (SUPER_ADMIN, ADMIN only)

---

**End of Guide**

This guide should provide everything needed for both frontend implementation and third-party PSP integration!
