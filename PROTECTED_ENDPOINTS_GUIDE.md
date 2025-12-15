# Protected Endpoints - UCG API

## 🔒 ALL Endpoints Now Require Authentication

As of the latest update, **ALL API endpoints require a valid JWT token** except for:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`

## ⚡ Quick Start

### 1. Get Your Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@ucg.co.tz",
    "password": "Test@123"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

### 2. Use Token in All Requests
```bash
curl -X GET http://localhost:3000/api/v1/service-providers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## 📋 Protected Controllers

### ✅ Service Providers (`/api/v1/service-providers`)
**All endpoints require authentication**

- `POST /service-providers` - Create service provider
- `GET /service-providers` - List all
- `GET /service-providers/:id` - Get by ID
- `GET /service-providers/code/:spCode` - Get by code
- `PATCH /service-providers/:id` - Update
- `POST /service-providers/:id/approve` - Approve
- `POST /service-providers/:id/reject` - Reject
- `DELETE /service-providers/:id` - Delete
- All bank account endpoints

### ✅ References (`/api/v1/references`)
**All endpoints require authentication**

- `POST /references` - Create reference (sync)
- `POST /references/async` - Create reference (async)
- `POST /references/bulk` - Bulk create
- `GET /references` - List all
- `GET /references/statistics` - Get statistics
- `GET /references/validate/:referenceNumber` - Validate
- `GET /references/:id` - Get by ID
- `GET /references/number/:referenceNumber` - Get by number
- `PATCH /references/:id` - Update
- `POST /references/:id/cancel` - Cancel

### ✅ Payments (`/api/v1/payments`)
**All endpoints require authentication**

- `POST /payments` - Create payment
- `GET /payments/:referenceNumber` - Get by reference
- `GET /payments/:referenceNumber/summary` - Get summary

### ✅ Dashboard (`/api/v1/dashboard`)
**All endpoints require authentication**

- `GET /dashboard/overview` - Get overview
- `GET /dashboard/trends` - Get daily trends
- `GET /dashboard/analytics/references` - Reference analytics
- `GET /dashboard/service-provider/:id` - SP dashboard

### ✅ Workflows (`/api/v1/workflows`)
**All endpoints require authentication**

- `POST /workflows/start` - Start workflow
- `GET /workflows/my-tasks` - Get my tasks
- `GET /workflows/role-tasks/:role` - Get tasks by role
- `POST /workflows/tasks/:taskId/complete` - Complete task
- `GET /workflows/instances/:instanceId` - Get instance
- `GET /workflows/entity/:entityType/:entityId` - Get by entity
- `POST /workflows/instances/:instanceId/reject` - Reject
- `GET /workflows/statistics` - Get statistics

### ✅ Users (`/api/v1/users`)
**All endpoints require authentication + specific roles**

- `POST /users` - Create user (Admin+)
- `GET /users` - List users (Admin+)
- `GET /users/statistics` - Statistics (Admin+)
- `GET /users/:id` - Get user (Manager+)
- `PATCH /users/:id` - Update user (Admin+)
- `DELETE /users/:id` - Delete user (Super Admin)

## 🚫 Public Endpoints (No Token Required)

Only these 3 endpoints are public:

1. **Login**
   ```bash
   POST /api/v1/auth/login
   ```

2. **Register**
   ```bash
   POST /api/v1/auth/register
   ```

3. **Refresh Token**
   ```bash
   POST /api/v1/auth/refresh
   ```

## 🔑 Authorization Header Format

**Required for ALL protected endpoints:**

```
Authorization: Bearer <your-jwt-token>
```

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:3000/api/v1/references
```

## ⚠️ Common Errors

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Causes:**
- Missing `Authorization` header
- Invalid token
- Expired token
- Malformed token

**Solution:** Login again to get a new token

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

**Causes:**
- User role doesn't have permission for this endpoint
- User status is not ACTIVE

**Solution:** Contact admin to update your role/permissions

## 🧪 Testing with cURL

### Login & Save Token
```bash
# Login
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@ucg.co.tz",
    "password": "Test@123"
  }')

# Extract token (requires jq)
TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.accessToken')

# Use token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/service-providers
```

### Using Environment Variable
```bash
# Set token as environment variable
export UCG_TOKEN="your-token-here"

# Use in requests
curl -H "Authorization: Bearer $UCG_TOKEN" \
  http://localhost:3000/api/v1/references
```

## 📱 Postman Setup

### 1. Create Environment Variable
1. Go to Postman > Environments
2. Create variable: `token`
3. Set initial value: (empty)

### 2. Login Request
Create POST request to `/auth/login` with Test script:

```javascript
const response = pm.response.json();
pm.environment.set("token", response.accessToken);
```

### 3. Use Token in Requests
In Authorization tab:
- Type: Bearer Token
- Token: `{{token}}`

## 🔄 Token Lifecycle

### Access Token
- **Expires:** 15 minutes
- **Use for:** All API requests
- **Refresh:** Use refresh token when expired

### Refresh Token
- **Expires:** 7 days
- **Use for:** Getting new access token
- **Endpoint:** `POST /auth/refresh`

### Refresh Example
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "refreshToken": "your-refresh-token"
  }'
```

## 📊 Migration Guide

### Before (No Auth)
```bash
curl http://localhost:3000/api/v1/references
# ✓ Works
```

### After (Auth Required)
```bash
curl http://localhost:3000/api/v1/references
# ✗ Returns 401 Unauthorized

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/references
# ✓ Works
```

## 🎯 Best Practices

1. **Store Tokens Securely**
   - Don't commit tokens to git
   - Use environment variables
   - Rotate tokens regularly

2. **Handle Token Expiry**
   - Implement refresh logic
   - Re-login when refresh fails
   - Show user-friendly error messages

3. **Test with Different Roles**
   - Super Admin - Full access
   - Admin - Most operations
   - Manager - View & basic ops
   - Operator - Limited operations
   - Viewer - Read-only

## 🛠️ Automated Testing Script

Use the provided test script:

```bash
./test-auth.sh
```

This script will:
- ✓ Login as super admin
- ✓ Test all protected endpoints with token
- ✓ Test endpoint without token (should fail)
- ✓ Test with different user roles
- ✓ Display summary of results

## 📖 See Also

- `AUTH_TESTING_GUIDE.md` - Complete authentication guide
- `AUTH_QUICK_REFERENCE.md` - Quick reference card
- `seed-users.sql` - Create test users
- `test-auth.sh` - Automated testing script

---

**Updated:** December 10, 2025
**Status:** All endpoints protected ✅
