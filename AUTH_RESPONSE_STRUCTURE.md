# Authentication Response Structure

## Overview

When users login or register, the API returns their user information including the new `userType` and `role` fields.

---

## Login Response

### Endpoint
```
POST /api/v1/auth/login
```

### Request Body
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### Response Structure
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@ucg.co.tz",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "ADMIN",
    "role": "FINANCE_MANAGER",
    "status": "ACTIVE"
  }
}
```

---

## Register Response

### Endpoint
```
POST /api/v1/auth/register
```

### Request Body
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@ucg.co.tz",
  "phoneNumber": "+255712345678",
  "password": "SecurePassword123!",
  "userType": "ADMIN",
  "role": "ANALYST"
}
```

### Response Structure
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "email": "jane.smith@ucg.co.tz",
    "firstName": "Jane",
    "lastName": "Smith",
    "userType": "ADMIN",
    "role": "ANALYST",
    "status": "PENDING"
  }
}
```

---

## Get Profile Response

### Endpoint
```
GET /api/v1/auth/profile
```

### Headers
```
Authorization: Bearer {accessToken}
```

### Response Structure (UserResponseDto)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@ucg.co.tz",
  "phoneNumber": "+255712345678",
  "userType": "ADMIN",
  "role": "FINANCE_MANAGER",
  "status": "ACTIVE",
  "isEmailVerified": true,
  "lastLoginAt": "2025-01-06T10:30:00.000Z",
  "createdAt": "2024-12-01T08:00:00.000Z",
  "updatedAt": "2025-01-06T10:30:00.000Z"
}
```

---

## JWT Token Payload

The JWT token contains the following information:

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@ucg.co.tz",
  "userType": "ADMIN",
  "role": "FINANCE_MANAGER",
  "iat": 1704532200,
  "exp": 1704535800
}
```

---

## Frontend Usage Examples

### TypeScript Interface

```typescript
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: 'ADMIN' | 'SERVICE_PROVIDER';
    role: string;
    status: string;
  };
}
```

### React - Login Example

```tsx
import { useState } from 'react';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await axios.post('/api/v1/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken, user } = response.data;

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Store user info
      localStorage.setItem('user', JSON.stringify(user));

      // Check user type and redirect accordingly
      if (user.userType === 'ADMIN') {
        // Redirect to admin portal
        window.location.href = '/admin/dashboard';
      } else if (user.userType === 'SERVICE_PROVIDER') {
        // Redirect to SP portal
        window.location.href = '/sp/dashboard';
      }

      // You can also check role for granular permissions
      console.log('User role:', user.role);
      console.log('User type:', user.userType);

    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### React - Protected Route Example

```tsx
import { Navigate } from 'react-router-dom';

function ProtectedRoute({
  children,
  requiredUserType,
  requiredRoles
}: {
  children: React.ReactNode;
  requiredUserType?: 'ADMIN' | 'SERVICE_PROVIDER';
  requiredRoles?: string[];
}) {
  const userStr = localStorage.getItem('user');

  if (!userStr) {
    return <Navigate to="/login" />;
  }

  const user = JSON.parse(userStr);

  // Check user type
  if (requiredUserType && user.userType !== requiredUserType) {
    return <Navigate to="/unauthorized" />;
  }

  // Check role
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}

// Usage
<Route
  path="/admin/finance"
  element={
    <ProtectedRoute
      requiredUserType="ADMIN"
      requiredRoles={['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER']}
    >
      <FinancePage />
    </ProtectedRoute>
  }
/>
```

### Vue - Auth Store Example

```typescript
// stores/auth.ts
import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    accessToken: null as string | null,
  }),

  getters: {
    isAdmin: (state) => state.user?.userType === 'ADMIN',
    isServiceProvider: (state) => state.user?.userType === 'SERVICE_PROVIDER',
    userRole: (state) => state.user?.role,

    hasRole: (state) => (roles: string[]) => {
      return state.user && roles.includes(state.user.role);
    },

    hasPermission: (state) => (permission: string) => {
      // Implement your permission checking logic
      const rolePermissions = {
        SUPER_ADMIN: ['*'],
        FINANCE_MANAGER: ['payments:*', 'reconciliation:*'],
        // ... add more
      };

      const userPermissions = rolePermissions[state.user?.role] || [];
      return userPermissions.includes('*') || userPermissions.includes(permission);
    },
  },

  actions: {
    async login(email: string, password: string) {
      const response = await axios.post('/api/v1/auth/login', {
        email,
        password,
      });

      this.accessToken = response.data.accessToken;
      this.user = response.data.user;

      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      return response.data;
    },

    logout() {
      this.user = null;
      this.accessToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
  },
});
```

---

## User Object Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `id` | string (UUID) | Unique user identifier | `550e8400-...` |
| `email` | string | User's email address | `john@example.com` |
| `firstName` | string | User's first name | `John` |
| `lastName` | string | User's last name | `Doe` |
| `userType` | enum | Portal type | `ADMIN` or `SERVICE_PROVIDER` |
| `role` | enum | User's role | `FINANCE_MANAGER`, `SP_ADMIN`, etc. |
| `status` | enum | Account status | `ACTIVE`, `PENDING`, `SUSPENDED` |
| `phoneNumber` | string | Phone number | `+255712345678` |
| `isEmailVerified` | boolean | Email verification status | `true` or `false` |
| `lastLoginAt` | timestamp | Last login time | `2025-01-06T10:30:00.000Z` |
| `createdAt` | timestamp | Account creation time | `2024-12-01T08:00:00.000Z` |
| `updatedAt` | timestamp | Last update time | `2025-01-06T10:30:00.000Z` |

---

## Common Use Cases

### 1. Redirect After Login Based on User Type

```typescript
function redirectAfterLogin(user: any) {
  if (user.userType === 'ADMIN') {
    window.location.href = '/admin/dashboard';
  } else if (user.userType === 'SERVICE_PROVIDER') {
    window.location.href = '/sp/dashboard';
  }
}
```

### 2. Show/Hide UI Elements Based on Role

```tsx
function FinancialReport() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const canViewFinancials = [
    'SUPER_ADMIN',
    'ADMIN',
    'FINANCE_MANAGER',
    'SP_ADMIN',
    'SP_FINANCE'
  ].includes(user.role);

  if (!canViewFinancials) {
    return <div>Access Denied</div>;
  }

  return <div>Financial Report Content...</div>;
}
```

### 3. API Request with User Context

```typescript
async function fetchUserData() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('accessToken');

  // The backend will also validate from JWT token
  const response = await axios.get('/api/v1/users', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      userType: user.userType, // Optional filtering
    },
  });

  return response.data;
}
```

---

## Security Notes

1. **Token Storage**: Store tokens securely (use httpOnly cookies in production)
2. **Token Validation**: Backend validates the JWT on every request
3. **User Type**: Included in JWT to prevent cross-portal access
4. **Role Checking**: Always validate on backend; frontend is for UX only
5. **Token Expiry**: Access tokens expire after 60 minutes

---

## Troubleshooting

### Issue: User object missing userType

**Cause**: Old tokens issued before the update
**Solution**: User needs to login again to get new token with userType

### Issue: Role shows as undefined

**Cause**: User was created before migration ran
**Solution**: Update user record in database or have user re-register

### Issue: Permission denied errors

**Check:**
1. User has correct `userType`
2. User's `role` is appropriate for the action
3. JWT token is valid and not expired
4. Backend guards are properly configured
