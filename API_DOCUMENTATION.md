# UCG Backend API Documentation

**Base URL:** `http://localhost:3000/api/v1`
**Production URL:** `https://your-domain.com/api/v1`

**Version:** 1.0.0
**Last Updated:** November 2025

---

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Service Providers](#service-providers)
4. [Payment References](#payment-references)
5. [Payments](#payments)
6. [Dashboard](#dashboard)
7. [Error Handling](#error-handling)
8. [Status Codes](#status-codes)

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer {your-access-token}
```

### Authentication Flow

1. Register or Login to get access token
2. Include token in all subsequent requests
3. Refresh token when access token expires (15 minutes)
4. Logout to invalidate refresh token

---

### 1. Register User

**Endpoint:** `POST /auth/register`
**Authentication:** Not required (Public)

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+255712345678",
  "password": "SecurePassword123!",
  "role": "VIEWER"
}
```

**Response (201 Created):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "VIEWER",
    "status": "PENDING"
  }
}
```

**JavaScript Example:**
```javascript
const response = await fetch('http://localhost:3000/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+255712345678',
    password: 'SecurePassword123!',
    role: 'VIEWER'
  })
});

const data = await response.json();
// Store accessToken and refreshToken
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
```

**Possible Errors:**
- `409 Conflict` - Email already exists
- `400 Bad Request` - Invalid input data

---

### 2. Login

**Endpoint:** `POST /auth/login`
**Authentication:** Not required (Public)

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN",
    "status": "ACTIVE"
  }
}
```

**JavaScript Example:**
```javascript
const login = async (email, password) => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();

    // Store tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

**Axios Example:**
```javascript
import axios from 'axios';

const login = async (email, password) => {
  const { data } = await axios.post('http://localhost:3000/api/v1/auth/login', {
    email,
    password
  });

  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);

  return data;
};
```

**Possible Errors:**
- `401 Unauthorized` - Invalid credentials or account not active
- `400 Bad Request` - Missing required fields

---

### 3. Get Current User Profile

**Endpoint:** `GET /auth/profile`
**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer {access-token}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+255712345678",
  "role": "ADMIN",
  "status": "ACTIVE",
  "isEmailVerified": true,
  "lastLoginAt": "2025-11-14T10:30:00.000Z",
  "createdAt": "2025-11-01T10:00:00.000Z",
  "updatedAt": "2025-11-14T10:30:00.000Z"
}
```

**JavaScript Example:**
```javascript
const getProfile = async () => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/v1/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
};
```

**Possible Errors:**
- `401 Unauthorized` - Invalid or expired token

---

### 4. Change Password

**Endpoint:** `POST /auth/change-password`
**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer {access-token}
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**JavaScript Example:**
```javascript
const changePassword = async (currentPassword, newPassword) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/v1/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      currentPassword,
      newPassword
    })
  });

  return await response.json();
};
```

**Possible Errors:**
- `400 Bad Request` - Current password is incorrect
- `401 Unauthorized` - Invalid or expired token

---

### 5. Refresh Access Token

**Endpoint:** `POST /auth/refresh`
**Authentication:** Not required (Public)

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**JavaScript Example (with Axios Interceptor):**
```javascript
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1'
});

// Request interceptor to add token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const userId = JSON.parse(localStorage.getItem('user')).id;

        const { data } = await axios.post(
          'http://localhost:3000/api/v1/auth/refresh',
          { userId, refreshToken }
        );

        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

**Possible Errors:**
- `401 Unauthorized` - Invalid refresh token

---

### 6. Logout

**Endpoint:** `POST /auth/logout`
**Authentication:** Required

**Request Headers:**
```
Authorization: Bearer {access-token}
```

**Response (204 No Content):**
No response body

**JavaScript Example:**
```javascript
const logout = async () => {
  const token = localStorage.getItem('accessToken');

  await fetch('http://localhost:3000/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // Clear local storage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  // Redirect to login
  window.location.href = '/login';
};
```

---

## User Management

All user management endpoints require authentication and appropriate role permissions.

### 7. Get All Users

**Endpoint:** `GET /users`
**Authentication:** Required
**Roles:** SUPER_ADMIN, ADMIN, MANAGER

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `role` (optional) - Filter by role (SUPER_ADMIN, ADMIN, MANAGER, OPERATOR, VIEWER)
- `status` (optional) - Filter by status (ACTIVE, INACTIVE, SUSPENDED, PENDING)
- `email` (optional) - Filter by email
- `search` (optional) - Search in firstName, lastName, email

**Request Example:**
```
GET /users?page=1&limit=10&role=ADMIN&status=ACTIVE&search=john
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+255712345678",
      "role": "ADMIN",
      "status": "ACTIVE",
      "isEmailVerified": true,
      "lastLoginAt": "2025-11-14T10:30:00.000Z",
      "createdAt": "2025-11-01T10:00:00.000Z",
      "updatedAt": "2025-11-14T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

**JavaScript Example:**
```javascript
const getUsers = async (params = {}) => {
  const token = localStorage.getItem('accessToken');
  const queryString = new URLSearchParams(params).toString();

  const response = await fetch(
    `http://localhost:3000/api/v1/users?${queryString}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
};

// Usage
const users = await getUsers({
  page: 1,
  limit: 20,
  role: 'ADMIN',
  status: 'ACTIVE'
});
```

**Possible Errors:**
- `401 Unauthorized` - Invalid or expired token
- `403 Forbidden` - Insufficient permissions

---

### 8. Get User by ID

**Endpoint:** `GET /users/:id`
**Authentication:** Required
**Roles:** SUPER_ADMIN, ADMIN, MANAGER, OPERATOR

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+255712345678",
  "role": "ADMIN",
  "status": "ACTIVE",
  "isEmailVerified": true,
  "lastLoginAt": "2025-11-14T10:30:00.000Z",
  "createdAt": "2025-11-01T10:00:00.000Z",
  "updatedAt": "2025-11-14T10:30:00.000Z"
}
```

**JavaScript Example:**
```javascript
const getUserById = async (userId) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    `http://localhost:3000/api/v1/users/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
};
```

**Possible Errors:**
- `404 Not Found` - User not found
- `401 Unauthorized` - Invalid or expired token
- `403 Forbidden` - Insufficient permissions

---

### 9. Create User

**Endpoint:** `POST /users`
**Authentication:** Required
**Roles:** SUPER_ADMIN, ADMIN

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phoneNumber": "+255712345678",
  "password": "SecurePassword123!",
  "role": "OPERATOR",
  "status": "ACTIVE"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phoneNumber": "+255712345678",
  "role": "OPERATOR",
  "status": "ACTIVE",
  "isEmailVerified": false,
  "createdAt": "2025-11-14T10:30:00.000Z",
  "updatedAt": "2025-11-14T10:30:00.000Z"
}
```

**JavaScript Example:**
```javascript
const createUser = async (userData) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });

  return await response.json();
};
```

**Possible Errors:**
- `409 Conflict` - Email already exists
- `400 Bad Request` - Invalid input data
- `403 Forbidden` - Insufficient permissions

---

### 10. Update User

**Endpoint:** `PATCH /users/:id`
**Authentication:** Required
**Roles:** SUPER_ADMIN, ADMIN

**Request Body (all fields optional):**
```json
{
  "firstName": "Jane",
  "lastName": "Smith Updated",
  "email": "jane.new@example.com",
  "phoneNumber": "+255712345679",
  "role": "MANAGER",
  "status": "ACTIVE"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "firstName": "Jane",
  "lastName": "Smith Updated",
  "email": "jane.new@example.com",
  "phoneNumber": "+255712345679",
  "role": "MANAGER",
  "status": "ACTIVE",
  "updatedAt": "2025-11-14T11:00:00.000Z"
}
```

**JavaScript Example:**
```javascript
const updateUser = async (userId, updates) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    `http://localhost:3000/api/v1/users/${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    }
  );

  return await response.json();
};
```

**Possible Errors:**
- `404 Not Found` - User not found
- `409 Conflict` - Email already exists
- `403 Forbidden` - Insufficient permissions

---

### 11. Update User Status

**Endpoint:** `PATCH /users/:id/status`
**Authentication:** Required
**Roles:** SUPER_ADMIN, ADMIN

**Request Body:**
```json
{
  "status": "ACTIVE"
}
```

**Valid Status Values:**
- `ACTIVE`
- `INACTIVE`
- `SUSPENDED`
- `PENDING`

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "status": "ACTIVE",
  "updatedAt": "2025-11-14T11:00:00.000Z"
}
```

**JavaScript Example:**
```javascript
const updateUserStatus = async (userId, status) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    `http://localhost:3000/api/v1/users/${userId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    }
  );

  return await response.json();
};
```

---

### 12. Delete User

**Endpoint:** `DELETE /users/:id`
**Authentication:** Required
**Roles:** SUPER_ADMIN

**Response (204 No Content):**
No response body

**JavaScript Example:**
```javascript
const deleteUser = async (userId) => {
  const token = localStorage.getItem('accessToken');

  await fetch(`http://localhost:3000/api/v1/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};
```

**Note:** This is a soft delete. The user is marked as deleted but not removed from the database.

---

### 13. Get User Statistics

**Endpoint:** `GET /users/statistics`
**Authentication:** Required
**Roles:** SUPER_ADMIN, ADMIN, MANAGER

**Response (200 OK):**
```json
{
  "total": 150,
  "active": 120,
  "inactive": 15,
  "suspended": 10,
  "pending": 5
}
```

**JavaScript Example:**
```javascript
const getUserStats = async () => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    'http://localhost:3000/api/v1/users/statistics',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
};
```

---

## Dashboard

### 14. Get Dashboard Overview

**Endpoint:** `GET /dashboard/overview`
**Authentication:** Required

**Query Parameters:**
- `startDate` (optional, ISO 8601 format) - Start date for filtering
- `endDate` (optional, ISO 8601 format) - End date for filtering
- `serviceProviderId` (optional, UUID) - Filter by service provider

**Request Example:**
```
GET /dashboard/overview?startDate=2025-11-01T00:00:00Z&endDate=2025-11-14T23:59:59Z
```

**Response (200 OK):**
```json
{
  "period": {
    "startDate": "2025-11-01T00:00:00.000Z",
    "endDate": "2025-11-14T23:59:59.000Z"
  },
  "references": {
    "total": 1000,
    "active": 250,
    "used": 600,
    "expired": 100,
    "cancelled": 50,
    "amounts": {
      "total": 50000000,
      "paid": 30000000,
      "pending": 15000000,
      "expired": 5000000,
      "currency": "TZS"
    },
    "collectionRate": 60.00
  },
  "payments": {
    "total": 600,
    "successful": 580,
    "successRate": 96.67,
    "uniqueReferences": 580,
    "amounts": {
      "total": 30500000,
      "successful": 30000000,
      "currency": "TZS"
    },
    "byChannel": [
      {
        "channel": "TIGOPESA",
        "count": 300,
        "amount": 15000000
      },
      {
        "channel": "M-PESA",
        "count": 280,
        "amount": 15000000
      }
    ]
  },
  "recentActivity": {
    "references": [...],
    "payments": [...]
  },
  "topServiceProviders": [
    {
      "id": "uuid",
      "businessName": "Example School",
      "spCode": "ESC",
      "referencesCount": 500,
      "totalAmount": 25000000,
      "collectedAmount": 20000000,
      "collectionRate": "80.00"
    }
  ],
  "statusBreakdown": [...],
  "generatedAt": "2025-11-14T12:00:00.000Z"
}
```

**JavaScript Example:**
```javascript
const getDashboardOverview = async (filters = {}) => {
  const token = localStorage.getItem('accessToken');
  const queryString = new URLSearchParams(filters).toString();

  const response = await fetch(
    `http://localhost:3000/api/v1/dashboard/overview?${queryString}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
};

// Usage
const overview = await getDashboardOverview({
  startDate: '2025-11-01T00:00:00Z',
  endDate: '2025-11-14T23:59:59Z'
});
```

---

## Data Models

### User Object

```typescript
{
  id: string;                    // UUID
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Auth Response Object

```typescript
{
  accessToken: string;           // JWT token (expires in 15 minutes)
  refreshToken: string;          // JWT token (expires in 7 days)
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  }
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Common Error Responses

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "User with ID abc123 not found",
  "error": "Not Found"
}
```

**409 Conflict:**
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200  | OK - Request successful |
| 201  | Created - Resource created successfully |
| 204  | No Content - Request successful, no content to return |
| 400  | Bad Request - Invalid input data |
| 401  | Unauthorized - Authentication required or failed |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Resource already exists |
| 500  | Internal Server Error - Server error |

---

## React Integration Example

Complete example of integrating authentication in a React app:

```javascript
// src/api/auth.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL
});

// Add token to requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Handle token refresh on 401
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const user = JSON.parse(localStorage.getItem('user'));

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          userId: user.id,
          refreshToken
        });

        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.clear();
  },

  getProfile: async () => {
    const { data } = await api.get('/auth/profile');
    return data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const { data } = await api.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return data;
  }
};

export const userAPI = {
  getAll: async (params) => {
    const { data } = await api.get('/users', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  create: async (userData) => {
    const { data } = await api.post('/users', userData);
    return data;
  },

  update: async (id, updates) => {
    const { data } = await api.patch(`/users/${id}`, updates);
    return data;
  },

  updateStatus: async (id, status) => {
    const { data } = await api.patch(`/users/${id}/status`, { status });
    return data;
  },

  delete: async (id) => {
    await api.delete(`/users/${id}`);
  },

  getStatistics: async () => {
    const { data } = await api.get('/users/statistics');
    return data;
  }
};

export const dashboardAPI = {
  getOverview: async (params) => {
    const { data } = await api.get('/dashboard/overview', { params });
    return data;
  }
};

export default api;
```

```javascript
// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await authAPI.register(userData);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

```javascript
// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ucg.com",
    "password": "Admin@123"
  }'
```

### Get Users
```bash
curl -X GET "http://localhost:3000/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create User
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "Password123!",
    "role": "VIEWER",
    "status": "ACTIVE"
  }'
```

---

## Support

For questions or issues, contact the backend development team.

**Last Updated:** November 14, 2025
**API Version:** 1.0.0
