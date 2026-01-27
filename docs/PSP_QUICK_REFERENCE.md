# PSP Quick Reference

## For Frontend Developers

### Admin API Endpoints

| Action | Method | Endpoint | Body |
|--------|--------|----------|------|
| Create PSP User | POST | `/admin/psp-users` | `{ firstName, lastName, email, phoneNumber, organizationName }` |
| Regenerate API Key | PUT | `/admin/psp-users/:userId/regenerate-api-key` | `{}` |
| Deactivate User | PUT | `/admin/psp-users/:userId/deactivate` | `{}` |
| List PSP Users | GET | `/admin/users?userType=PSP` | - |
| Get PSP User | GET | `/admin/users/:userId` | - |

**Auth:** All require Admin JWT token
**Roles:** SUPER_ADMIN or ADMIN only

---

### Required Frontend Pages

1. **`/admin/psp-users`** - List all PSP users
2. **`/admin/psp-users/create`** - Create new PSP user
3. **`/admin/psp-users/:id`** - View PSP user details

---

### Create PSP User Response

```json
{
  "success": true,
  "message": "PSP user created successfully. API key has been sent via SMS.",
  "data": {
    "id": "uuid",
    "email": "psp@example.com",
    "apiKey": "ucg_psp_...",  // Show once, allow copy
    "userType": "PSP",
    "status": "ACTIVE"
  }
}
```

**Important:**
- Display API key in success modal
- Allow copy to clipboard
- SMS sent automatically to phone number
- API key shown only once

---

### Regenerate API Key Response

```json
{
  "success": true,
  "message": "API key regenerated successfully. New API key has been sent via SMS.",
  "data": {
    "apiKey": "ucg_psp_..."  // New key
  }
}
```

**Important:**
- Old API key immediately invalidated
- New API key sent via SMS
- Display new key in modal with copy option

---

## For PSP Integrators (Third-Party)

### PSP API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Submit Payment | POST | `/psp/payments` |
| Verify Reference | GET | `/psp/references/:referenceNumber` |
| Payment Summary | GET | `/psp/payments/reference/:referenceNumber` |

**Auth:** API Key (Bearer token)
**No Login Required**

---

### Submit Payment Example

```bash
curl -X POST https://api.ucg.co.tz/api/v1/psp/payments \
  -H "Authorization: Bearer ucg_psp_..." \
  -H "Content-Type: application/json" \
  -d '{
    "referenceNumber": "HO1-0000001-123",
    "payerName": "John Doe",
    "payerPhone": "+255712345678",
    "amountPaid": 50000,
    "paymentChannel": "MPESA",
    "fspCode": "VODACOM"
  }'
```

---

### Payment Options

| Option | Description | Amount Rules |
|--------|-------------|--------------|
| COMPLETE | Full amount, single payment | Exact amount required |
| PARTIAL | Multiple payments allowed | Any amount ≥ 100, until total reached |
| PRECISE | Exact amount, no partial | Exact amount only |
| LIMITED | Partial with minimum | Amount ≥ minimum amount |
| PERPETUAL | Unlimited payments | Any amount ≥ 100 |

---

### FSP Codes

| FSP Code | Name | Channel |
|----------|------|---------|
| VODACOM | Vodacom M-PESA | MPESA |
| TIGO | Tigo Pesa | TIGOPESA |
| AIRTEL | Airtel Money | AIRTEL |
| CRDB | CRDB Bank | Bank |
| NMB | NMB Bank | Bank |

---

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request data |
| 401 | Unauthorized | Check API key |
| 404 | Not Found | Check reference number |
| 429 | Rate Limited | Retry with backoff |
| 500 | Server Error | Retry or contact support |

---

## Key Differences

| Feature | Admin/SP Users | PSP Users |
|---------|---------------|-----------|
| **Login** | ✅ Email/Password | ❌ No Login |
| **Portal Access** | ✅ Web Portal | ❌ API Only |
| **Auth Token** | JWT (expires 60min) | API Key (permanent) |
| **Token Format** | `eyJhbGci...` | `ucg_psp_...` |
| **Refresh** | Must refresh/login | Not needed |
| **Delivery** | Password via SMS | API Key via SMS |

---

## Security Reminders

**Frontend:**
- ✅ Mask API keys by default (show on click)
- ✅ Display API key only once after creation
- ✅ Provide copy-to-clipboard
- ❌ Never log API keys
- ❌ Never store API keys in localStorage

**PSP Integration:**
- ✅ Store API key in environment variables
- ✅ Use HTTPS only
- ✅ Implement retry logic
- ❌ Never commit API key to git
- ❌ Never hardcode API key

---

## Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `PSP_MANAGEMENT_GUIDE.md` | Complete guide with UI mockups | Frontend developers |
| `PSP_ENDPOINTS.md` | Full API documentation | PSP integrators |
| `THIRD_PARTY_API_SPECIFICATIONS.md` | External system requirements | Third-party systems |
| `PSP_QUICK_REFERENCE.md` | Quick lookup (this file) | Everyone |

---

## Support Contacts

- **Admin Support:** admin@ucg.co.tz
- **API Support:** api-support@ucg.co.tz
- **Technical Support:** tech-support@ucg.co.tz

**Test Environment:** https://test-api.ucg.co.tz
