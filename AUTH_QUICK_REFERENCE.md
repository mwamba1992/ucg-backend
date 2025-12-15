# UCG API - Authentication Quick Reference

## 🚀 Quick Start (3 Steps)

### Step 1: Seed Users
```bash
psql -h localhost -U amtz -d amtz -f seed-users.sql
```

### Step 2: Get Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@ucg.co.tz","password":"Test@123"}'
```

### Step 3: Use Token
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/users
```

## 👥 Test Users

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| superadmin@ucg.co.tz | Test@123 | SUPER_ADMIN | Full access |
| admin@ucg.co.tz | Test@123 | ADMIN | Admin operations |
| manager@ucg.co.tz | Test@123 | MANAGER | Management ops |
| operator@ucg.co.tz | Test@123 | OPERATOR | Basic ops |
| viewer@ucg.co.tz | Test@123 | VIEWER | Read-only |

## 📝 Essential Endpoints

### Login
```bash
POST /api/v1/auth/login
{
  "email": "superadmin@ucg.co.tz",
  "password": "Test@123"
}
```

### Get Profile
```bash
GET /api/v1/auth/profile
Authorization: Bearer <token>
```

### Create User
```bash
POST /api/v1/users
Authorization: Bearer <token>
{
  "email": "new@example.com",
  "password": "Secure@123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "OPERATOR"
}
```

## 🧪 Run Tests
```bash
./test-auth.sh
```

## 🔑 Token Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ⏱️ Token Expiry
- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

## 🛡️ Protected Endpoints

All endpoints require `Authorization: Bearer <token>` header except:
- POST `/auth/login`
- POST `/auth/register`
- POST `/auth/refresh`

## 📊 Common HTTP Status Codes

- **200** - Success
- **201** - Created
- **401** - Unauthorized (no/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not found
- **409** - Conflict (duplicate)

## 🔍 Test Checklist

- [ ] Seed users in database
- [ ] Login as super admin
- [ ] Verify token works
- [ ] Test protected endpoint
- [ ] Test without token (should fail 401)
- [ ] Test with wrong role (should fail 403)
- [ ] Create new user
- [ ] Login with new user
- [ ] Change password
- [ ] Logout

## 📖 Full Documentation

See `AUTH_TESTING_GUIDE.md` for complete details.
