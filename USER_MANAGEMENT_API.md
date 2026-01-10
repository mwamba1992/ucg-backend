# User Management API Documentation

## Base URL
```
http://192.168.1.94:8000/api/v1
```

## Authentication
All endpoints require JWT Bearer token authentication.

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Table of Contents
1. [User Roles & Permissions](#user-roles--permissions)
2. [User Status](#user-status)
3. [Endpoints](#endpoints)
   - [Create User](#1-create-user)
   - [List Users](#2-list-users)
   - [Get User Statistics](#3-get-user-statistics)
   - [Get User by ID](#4-get-user-by-id)
   - [Update User](#5-update-user)
   - [Update User Status](#6-update-user-status)
   - [Soft Delete User](#7-soft-delete-user)
   - [Hard Delete User](#8-hard-delete-user)

---

## User Roles & Permissions

### Available Roles
```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',  // Full system access
  ADMIN = 'ADMIN',               // Administrative access
  MANAGER = 'MANAGER',           // Management access
  OPERATOR = 'OPERATOR',         // Operational access
  VIEWER = 'VIEWER'              // Read-only access
}
```

### Role Permissions Matrix
| Endpoint | SUPER_ADMIN | ADMIN | MANAGER | OPERATOR | VIEWER |
|----------|-------------|-------|---------|----------|--------|
| Create User | ✅ | ✅ | ❌ | ❌ | ❌ |
| List Users | ✅ | ✅ | ✅ | ❌ | ❌ |
| Get Statistics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Get User | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update User | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update Status | ✅ | ✅ | ❌ | ❌ | ❌ |
| Soft Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| Hard Delete | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## User Status

```typescript
enum UserStatus {
  ACTIVE = 'ACTIVE',         // User can log in and use the system
  INACTIVE = 'INACTIVE',     // User account is inactive
  SUSPENDED = 'SUSPENDED',   // User account is suspended
  PENDING = 'PENDING'        // User account pending approval
}
```

---

## Endpoints

### 1. Create User

Create a new user in the system.

**Endpoint:** `POST /users`

**Required Role:** `SUPER_ADMIN`, `ADMIN`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+255712345678",
  "password": "Password123!",
  "role": "VIEWER",
  "status": "ACTIVE"
}
```

**Field Validation:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| firstName | string | Yes | Not empty |
| lastName | string | Yes | Not empty |
| email | string | Yes | Valid email format, unique |
| phoneNumber | string | No | Valid phone number |
| password | string | Yes | Minimum 8 characters |
| role | enum | Yes | One of: SUPER_ADMIN, ADMIN, MANAGER, OPERATOR, VIEWER |
| status | enum | No | One of: ACTIVE, INACTIVE, SUSPENDED, PENDING (default: PENDING) |

**Success Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+255712345678",
  "role": "VIEWER",
  "status": "ACTIVE",
  "isEmailVerified": false,
  "lastLoginAt": null,
  "createdAt": "2025-12-15T10:30:00.000Z",
  "updatedAt": "2025-12-15T10:30:00.000Z",
  "createdBy": "admin-user-id",
  "updatedBy": null
}
```

**Error Responses:**
- **409 Conflict:** User with email already exists
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

---

### 2. List Users

Get paginated list of users with filtering and search.

**Endpoint:** `GET /users`

**Required Role:** `SUPER_ADMIN`, `ADMIN`, `MANAGER`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |
| role | enum | No | - | Filter by role (SUPER_ADMIN, ADMIN, etc.) |
| status | enum | No | - | Filter by status (ACTIVE, INACTIVE, etc.) |
| search | string | No | - | Search by name or email |

**Example Request:**
```http
GET /users?page=1&limit=20&status=ACTIVE&search=john
```

**Success Response (200):**
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
      "lastLoginAt": "2025-12-15T09:30:00.000Z",
      "createdAt": "2025-12-01T10:30:00.000Z",
      "updatedAt": "2025-12-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

### 3. Get User Statistics

Get overall user statistics.

**Endpoint:** `GET /users/statistics`

**Required Role:** `SUPER_ADMIN`, `ADMIN`, `MANAGER`

**Success Response (200):**
```json
{
  "total": 250,
  "active": 180,
  "inactive": 30,
  "suspended": 5,
  "pending": 35,
  "byRole": {
    "SUPER_ADMIN": 2,
    "ADMIN": 10,
    "MANAGER": 25,
    "OPERATOR": 50,
    "VIEWER": 163
  }
}
```

---

### 4. Get User by ID

Get detailed information about a specific user.

**Endpoint:** `GET /users/:id`

**Required Role:** `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `OPERATOR`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | User ID |

**Example Request:**
```http
GET /users/550e8400-e29b-41d4-a716-446655440000
```

**Success Response (200):**
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
  "lastLoginAt": "2025-12-15T09:30:00.000Z",
  "createdAt": "2025-12-01T10:30:00.000Z",
  "updatedAt": "2025-12-15T10:30:00.000Z",
  "createdBy": "admin-user-id",
  "updatedBy": "admin-user-id"
}
```

**Error Responses:**
- **404 Not Found:** User not found
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

---

### 5. Update User

Update user information.

**Endpoint:** `PATCH /users/:id`

**Required Role:** `SUPER_ADMIN`, `ADMIN`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | User ID |

**Request Body (All fields optional):**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phoneNumber": "+255712345679",
  "password": "NewPassword123!",
  "role": "MANAGER",
  "status": "ACTIVE"
}
```

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phoneNumber": "+255712345679",
  "role": "MANAGER",
  "status": "ACTIVE",
  "isEmailVerified": true,
  "lastLoginAt": "2025-12-15T09:30:00.000Z",
  "createdAt": "2025-12-01T10:30:00.000Z",
  "updatedAt": "2025-12-15T11:00:00.000Z",
  "updatedBy": "admin-user-id"
}
```

**Error Responses:**
- **404 Not Found:** User not found
- **409 Conflict:** Email already in use by another user

---

### 6. Update User Status

Update only the status of a user.

**Endpoint:** `PATCH /users/:id/status`

**Required Role:** `SUPER_ADMIN`, `ADMIN`

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | User ID |

**Request Body:**
```json
{
  "status": "SUSPENDED"
}
```

**Available Status Values:**
- `ACTIVE`
- `INACTIVE`
- `SUSPENDED`
- `PENDING`

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "status": "SUSPENDED",
  "updatedAt": "2025-12-15T11:15:00.000Z"
}
```

---

### 7. Soft Delete User

Soft delete a user (marks as deleted but keeps record).

**Endpoint:** `DELETE /users/:id`

**Required Role:** `SUPER_ADMIN` only

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | User ID |

**Success Response (204):**
```
No Content
```

**Note:** The user record is not removed from the database, only marked as deleted with a `deletedAt` timestamp. The user cannot log in after soft deletion.

---

### 8. Hard Delete User

Permanently delete a user from the database.

**Endpoint:** `DELETE /users/:id/hard`

**Required Role:** `SUPER_ADMIN` only

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | User ID |

**Success Response (204):**
```
No Content
```

**⚠️ Warning:** This action is irreversible. The user record is permanently removed from the database.

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["firstName should not be empty", "email must be an email"],
  "error": "Bad Request"
}
```

---

## Frontend Implementation Examples

### TypeScript Types

```typescript
// Enums
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING'
}

// User Interface
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// DTOs
export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserListResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
  byRole: Record<UserRole, number>;
}
```

### API Service Example (React/Next.js)

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.94:8000/api/v1';

// Create axios instance with auth
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// User API Service
export const userApi = {
  // Create user
  async createUser(data: CreateUserDto): Promise<User> {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  // List users
  async listUsers(params?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  }): Promise<UserListResponse> {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  // Get statistics
  async getStatistics(): Promise<UserStatistics> {
    const response = await apiClient.get('/users/statistics');
    return response.data;
  },

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  // Update user
  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    const response = await apiClient.patch(`/users/${id}`, data);
    return response.data;
  },

  // Update user status
  async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    const response = await apiClient.patch(`/users/${id}/status`, { status });
    return response.data;
  },

  // Soft delete user
  async softDeleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },

  // Hard delete user
  async hardDeleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}/hard`);
  },
};
```

### React Component Example

```typescript
import { useState, useEffect } from 'react';
import { userApi } from './services/userApi';

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    loadStatistics();
  }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.listUsers({ page, limit: 20 });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await userApi.getStatistics();
      setStats(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleCreateUser = async (data: CreateUserDto) => {
    try {
      await userApi.createUser(data);
      loadUsers(); // Reload list
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateStatus = async (id: string, status: UserStatus) => {
    try {
      await userApi.updateUserStatus(id, status);
      loadUsers(); // Reload list
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Component JSX...
}
```

---

## Best Practices

1. **Always use HTTPS in production**
2. **Store JWT tokens securely** (httpOnly cookies recommended)
3. **Implement token refresh mechanism** for better UX
4. **Handle 401 responses** by redirecting to login
5. **Implement proper error handling** and user feedback
6. **Use role-based UI rendering** to hide unauthorized actions
7. **Validate input on frontend** before sending to API
8. **Implement confirmation dialogs** for delete operations
9. **Cache user lists** and statistics where appropriate
10. **Implement proper loading states** for better UX

---

## Support

For issues or questions, contact the backend development team.

**API Version:** v1
**Last Updated:** January 2026
