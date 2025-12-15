# Authentication & Authorization Testing Guide

## Overview

The UCG API has a complete auth system with:
- JWT-based authentication
- Role-based access control (RBAC)
- User management
- Token refresh functionality

## User Roles

- **SUPER_ADMIN** - Full system access
- **ADMIN** - Administrative access
- **MANAGER** - Management operations
- **OPERATOR** - Basic operations
- **VIEWER** - Read-only access

## Quick Start

### 1. Create Initial Admin User

Run this SQL to create a super admin:

```sql
INSERT INTO users (
  id,
  email,
  password,
  "firstName",
  "lastName",
  role,
  status,
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@ucg.co.tz',
  '$2b$10$YQj3VzW8qH4Y0xF1nZ7Svu6BV8kX9Y5N0uA1MZ8qD3v5V7W9X1Y2Z', -- password: Admin@123
  'System',
  'Administrator',
  'SUPER_ADMIN',
  'ACTIVE',
  true,
  NOW(),
  NOW()
);
```

**Credentials:**
- Email: `admin@ucg.co.tz`
- Password: `Admin@123`

### 2. Get Authentication Token

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ucg.co.tz",
    "password": "Admin@123"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "admin@ucg.co.tz",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "SUPER_ADMIN",
    "status": "ACTIVE",
    "isActive": true
  }
}
```

### 3. Use Token for Protected Endpoints

Add the token to the `Authorization` header:

```bash
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Complete API Endpoints

### Authentication Endpoints (Public)

#### 1. Register New User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "OPERATOR"
}
```

#### 2. Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@ucg.co.tz",
  "password": "Admin@123"
}
```

#### 3. Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "userId": "user-uuid",
  "refreshToken": "your-refresh-token"
}
```

### Protected Endpoints (Require JWT)

#### 4. Get Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer <access_token>
```

#### 5. Verify Token
```http
GET /api/v1/auth/verify
Authorization: Bearer <access_token>
```

#### 6. Change Password
```http
POST /api/v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "Admin@123",
  "newPassword": "NewSecure@456"
}
```

#### 7. Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

### User Management (Admin Only)

#### 8. Create User
```http
POST /api/v1/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePass@123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "OPERATOR",
  "phoneNumber": "+255712345678"
}
```

#### 9. Get All Users
```http
GET /api/v1/users?page=1&limit=10
Authorization: Bearer <access_token>
```

#### 10. Get User Statistics
```http
GET /api/v1/users/statistics
Authorization: Bearer <access_token>
```

#### 11. Get User by ID
```http
GET /api/v1/users/{userId}
Authorization: Bearer <access_token>
```

#### 12. Update User
```http
PATCH /api/v1/users/{userId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Updated",
  "lastName": "Name",
  "phoneNumber": "+255712345679"
}
```

#### 13. Update User Status
```http
PATCH /api/v1/users/{userId}/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "SUSPENDED"
}
```

#### 14. Soft Delete User
```http
DELETE /api/v1/users/{userId}
Authorization: Bearer <access_token>
```

#### 15. Hard Delete User (Super Admin Only)
```http
DELETE /api/v1/users/{userId}/hard
Authorization: Bearer <access_token>
```

## Testing All Protected Endpoints

Here's a script to test all major endpoints:

```bash
#!/bin/bash

# 1. Login and get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ucg.co.tz",
    "password": "Admin@123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

echo "Token: $TOKEN"

# 2. Test Service Providers (Protected)
echo "\n=== Testing Service Providers ==="
curl -X GET http://localhost:3000/api/v1/service-providers \
  -H "Authorization: Bearer $TOKEN"

# 3. Test References (Protected)
echo "\n=== Testing References ==="
curl -X GET http://localhost:3000/api/v1/references \
  -H "Authorization: Bearer $TOKEN"

# 4. Test Payments (Protected)
echo "\n=== Testing Payments ==="
curl -X GET http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $TOKEN"

# 5. Test Users (Protected)
echo "\n=== Testing Users ==="
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer $TOKEN"

# 6. Test Profile (Protected)
echo "\n=== Testing Profile ==="
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

## User Status Types

- **ACTIVE** - User can access the system
- **INACTIVE** - User temporarily disabled
- **SUSPENDED** - User account suspended
- **PENDING** - Awaiting approval

## Role Permissions

| Endpoint | Super Admin | Admin | Manager | Operator | Viewer |
|----------|-------------|-------|---------|----------|--------|
| Create User | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Users | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update User | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Hard Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Data | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Data | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update Data | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete Data | ✅ | ✅ | ✅ | ❌ | ❌ |

## Common Errors

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
**Solution:** Provide valid JWT token in Authorization header

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```
**Solution:** User role doesn't have permission for this endpoint

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "User with email already exists"
}
```
**Solution:** Use a different email address

## Postman Collection

Import this collection to Postman:

```json
{
  "info": {
    "name": "UCG API - Auth Testing",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api/v1"
    },
    {
      "key": "token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "1. Login",
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "const response = pm.response.json();",
              "pm.collectionVariables.set('token', response.accessToken);"
            ]
          }
        }
      ],
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"admin@ucg.co.tz\",\n  \"password\": \"Admin@123\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": "{{baseUrl}}/auth/login"
      }
    },
    {
      "name": "2. Get Profile",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/auth/profile"
      }
    },
    {
      "name": "3. Get All Users",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/users"
      }
    }
  ]
}
```

## Environment Variables

Set these in your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRATION=7d
```

## Testing Checklist

- [ ] Create super admin user via SQL
- [ ] Test login with admin credentials
- [ ] Verify token is returned
- [ ] Test protected endpoint with token
- [ ] Test protected endpoint without token (should fail)
- [ ] Test endpoint with wrong role (should fail 403)
- [ ] Create new user via API
- [ ] Test login with new user
- [ ] Test token refresh
- [ ] Test password change
- [ ] Test logout
- [ ] Test token after logout (should fail)

---

**Last Updated:** December 10, 2025
