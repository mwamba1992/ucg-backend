# User Management API - Frontend Documentation

Complete API documentation and TypeScript types for User Management module.

**Base URL:** `http://localhost:3000/api/v1`

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [TypeScript Types](#typescript-types)
3. [API Endpoints](#api-endpoints)
4. [React Integration](#react-integration)
5. [Error Handling](#error-handling)

---

## Quick Start

### Installation & Setup

1. **Copy TypeScript types** to your project:
```bash
# Create types file
touch src/types/user.types.ts
```

2. **Configure Axios** with interceptors for authentication

3. **Import and use** in your components

---

## TypeScript Types

### Complete Type Definitions

```typescript
// src/types/user.types.ts

// ==================== ENUMS ====================

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

// ==================== INTERFACES ====================

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
}

// ==================== AUTH DTOs ====================

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  role?: UserRole;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  };
}

export interface RefreshTokenDto {
  userId: string;
  refreshToken: string;
}

// ==================== USER MANAGEMENT DTOs ====================

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

export interface QueryUserDto {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  email?: string;
  search?: string;
}

export interface UpdateUserStatusDto {
  status: UserStatus;
}

// ==================== RESPONSE TYPES ====================

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserListResponse {
  data: User[];
  pagination: Pagination;
}

export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface MessageResponse {
  message: string;
}
```

### JavaScript Constants (for non-TypeScript projects)

```javascript
// src/constants/user.constants.js

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER'
};

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING: 'PENDING'
};

export const API_BASE_URL = 'http://localhost:3000/api/v1';
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Register User

```typescript
POST /auth/register
```

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

**Response (201):**
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

**TypeScript Example:**
```typescript
import { RegisterDto, AuthResponse } from '../types/user.types';

const register = async (data: RegisterDto): Promise<AuthResponse> => {
  const response = await fetch('http://localhost:3000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error('Registration failed');
  return response.json();
};
```

---

#### 2. Login

```typescript
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
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

**TypeScript Example:**
```typescript
import { LoginDto, AuthResponse } from '../types/user.types';

const login = async (credentials: LoginDto): Promise<AuthResponse> => {
  const response = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) throw new Error('Login failed');

  const data: AuthResponse = await response.json();

  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data;
};
```

---

#### 3. Get Profile

```typescript
GET /auth/profile
Authorization: Bearer {access-token}
```

**Response (200):**
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

**TypeScript Example:**
```typescript
import { User } from '../types/user.types';

const getProfile = async (): Promise<User> => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/v1/auth/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
};
```

---

#### 4. Change Password

```typescript
POST /auth/change-password
Authorization: Bearer {access-token}
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**TypeScript Example:**
```typescript
import { ChangePasswordDto, MessageResponse } from '../types/user.types';

const changePassword = async (data: ChangePasswordDto): Promise<MessageResponse> => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/v1/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error('Failed to change password');
  return response.json();
};
```

---

#### 5. Logout

```typescript
POST /auth/logout
Authorization: Bearer {access-token}
```

**Response (204):** No content

**TypeScript Example:**
```typescript
const logout = async (): Promise<void> => {
  const token = localStorage.getItem('accessToken');

  await fetch('http://localhost:3000/api/v1/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  // Clear storage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};
```

---

#### 6. Refresh Token

```typescript
POST /auth/refresh
```

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**TypeScript Example:**
```typescript
import { RefreshTokenDto } from '../types/user.types';

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refreshToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const response = await fetch('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      refreshToken
    })
  });

  if (!response.ok) throw new Error('Token refresh failed');

  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);

  return data.accessToken;
};
```

---

### User Management Endpoints

#### 7. Get All Users (Paginated)

```typescript
GET /users?page=1&limit=10&role=ADMIN&status=ACTIVE&search=john
Authorization: Bearer {access-token}
Roles: SUPER_ADMIN, ADMIN, MANAGER
```

**Query Parameters:**
- `page` (number, optional, default: 1)
- `limit` (number, optional, default: 10)
- `role` (UserRole, optional)
- `status` (UserStatus, optional)
- `email` (string, optional)
- `search` (string, optional) - searches firstName, lastName, email

**Response (200):**
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

**TypeScript Example:**
```typescript
import { QueryUserDto, UserListResponse } from '../types/user.types';

const getUsers = async (query: QueryUserDto = {}): Promise<UserListResponse> => {
  const token = localStorage.getItem('accessToken');
  const params = new URLSearchParams(
    Object.entries(query).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  );

  const response = await fetch(
    `http://localhost:3000/api/v1/users?${params}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

// Usage
const users = await getUsers({
  page: 1,
  limit: 20,
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  search: 'john'
});
```

---

#### 8. Get User by ID

```typescript
GET /users/:id
Authorization: Bearer {access-token}
Roles: SUPER_ADMIN, ADMIN, MANAGER, OPERATOR
```

**Response (200):**
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

**TypeScript Example:**
```typescript
import { User } from '../types/user.types';

const getUserById = async (userId: string): Promise<User> => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    `http://localhost:3000/api/v1/users/${userId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
};
```

---

#### 9. Create User

```typescript
POST /users
Authorization: Bearer {access-token}
Roles: SUPER_ADMIN, ADMIN
```

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

**Response (201):**
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

**TypeScript Example:**
```typescript
import { CreateUserDto, User } from '../types/user.types';

const createUser = async (data: CreateUserDto): Promise<User> => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error('Failed to create user');
  return response.json();
};
```

---

#### 10. Update User

```typescript
PATCH /users/:id
Authorization: Bearer {access-token}
Roles: SUPER_ADMIN, ADMIN
```

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

**Response (200):**
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

**TypeScript Example:**
```typescript
import { UpdateUserDto, User } from '../types/user.types';

const updateUser = async (userId: string, data: UpdateUserDto): Promise<User> => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    `http://localhost:3000/api/v1/users/${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) throw new Error('Failed to update user');
  return response.json();
};
```

---

#### 11. Update User Status

```typescript
PATCH /users/:id/status
Authorization: Bearer {access-token}
Roles: SUPER_ADMIN, ADMIN
```

**Request Body:**
```json
{
  "status": "ACTIVE"
}
```

**Valid Status Values:** `ACTIVE`, `INACTIVE`, `SUSPENDED`, `PENDING`

**Response (200):**
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

**TypeScript Example:**
```typescript
import { UpdateUserStatusDto, User, UserStatus } from '../types/user.types';

const updateUserStatus = async (
  userId: string,
  status: UserStatus
): Promise<User> => {
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

  if (!response.ok) throw new Error('Failed to update user status');
  return response.json();
};
```

---

#### 12. Delete User (Soft Delete)

```typescript
DELETE /users/:id
Authorization: Bearer {access-token}
Roles: SUPER_ADMIN
```

**Response (204):** No content

**TypeScript Example:**
```typescript
const deleteUser = async (userId: string): Promise<void> => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    `http://localhost:3000/api/v1/users/${userId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!response.ok) throw new Error('Failed to delete user');
};
```

---

#### 13. Get User Statistics

```typescript
GET /users/statistics
Authorization: Bearer {access-token}
Roles: SUPER_ADMIN, ADMIN, MANAGER
```

**Response (200):**
```json
{
  "total": 150,
  "active": 120,
  "inactive": 15,
  "suspended": 10,
  "pending": 5
}
```

**TypeScript Example:**
```typescript
import { UserStatistics } from '../types/user.types';

const getUserStatistics = async (): Promise<UserStatistics> => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(
    'http://localhost:3000/api/v1/users/statistics',
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!response.ok) throw new Error('Failed to fetch statistics');
  return response.json();
};
```

---

## React Integration

### Complete API Service

```typescript
// src/services/auth.service.ts
import axios, { AxiosInstance } from 'axios';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  AuthResponse,
  User,
  MessageResponse
} from '../types/user.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class AuthService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add token to requests
    this.api.interceptors.request.use(
      config => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Handle token refresh
    this.api.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginDto): Promise<AuthResponse> {
    const { data } = await this.api.post<AuthResponse>('/auth/login', credentials);
    this.setAuthData(data);
    return data;
  }

  async register(userData: RegisterDto): Promise<AuthResponse> {
    const { data } = await this.api.post<AuthResponse>('/auth/register', userData);
    this.setAuthData(data);
    return data;
  }

  async getProfile(): Promise<User> {
    const { data } = await this.api.get<User>('/auth/profile');
    return data;
  }

  async changePassword(passwordData: ChangePasswordDto): Promise<MessageResponse> {
    const { data } = await this.api.post<MessageResponse>(
      '/auth/change-password',
      passwordData
    );
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } finally {
      this.clearAuthData();
    }
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      userId: user.id,
      refreshToken
    });

    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  }

  private setAuthData(authResponse: AuthResponse): void {
    localStorage.setItem('accessToken', authResponse.accessToken);
    localStorage.setItem('refreshToken', authResponse.refreshToken);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
  }

  private clearAuthData(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
}

export default new AuthService();
```

```typescript
// src/services/user.service.ts
import axios, { AxiosInstance } from 'axios';
import {
  User,
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  UserListResponse,
  UserStatistics,
  UserStatus
} from '../types/user.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class UserService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL
    });

    this.api.interceptors.request.use(config => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async getAll(query: QueryUserDto = {}): Promise<UserListResponse> {
    const { data } = await this.api.get<UserListResponse>('/users', { params: query });
    return data;
  }

  async getById(id: string): Promise<User> {
    const { data } = await this.api.get<User>(`/users/${id}`);
    return data;
  }

  async create(userData: CreateUserDto): Promise<User> {
    const { data } = await this.api.post<User>('/users', userData);
    return data;
  }

  async update(id: string, userData: UpdateUserDto): Promise<User> {
    const { data } = await this.api.patch<User>(`/users/${id}`, userData);
    return data;
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const { data } = await this.api.patch<User>(`/users/${id}/status`, { status });
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/users/${id}`);
  }

  async getStatistics(): Promise<UserStatistics> {
    const { data } = await this.api.get<UserStatistics>('/users/statistics');
    return data;
  }
}

export default new UserService();
```

### React Context

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginDto, RegisterDto } from '../types/user.types';
import authService from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  register: (userData: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = async (credentials: LoginDto) => {
    const response = await authService.login(credentials);
    setUser(response.user as User);
  };

  const register = async (userData: RegisterDto) => {
    const response = await authService.register(userData);
    setUser(response.user as User);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const updatedUser = await authService.getProfile();
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Protected Route Component

```typescript
// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/user.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

### Example Components

```typescript
// src/pages/UsersPage.tsx
import React, { useState, useEffect } from 'react';
import { User, QueryUserDto, UserStatus, UserRole } from '../types/user.types';
import userService from '../services/user.service';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const query: QueryUserDto = {
        page: pagination.page,
        limit: pagination.limit
      };

      const response = await userService.getAll(query);
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, status: UserStatus) => {
    try {
      await userService.updateStatus(userId, status);
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.delete(userId);
        fetchUsers(); // Refresh list
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Users</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.firstName} {user.lastName}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.status}</td>
              <td>
                <button onClick={() => handleStatusChange(
                  user.id,
                  user.status === UserStatus.ACTIVE
                    ? UserStatus.INACTIVE
                    : UserStatus.ACTIVE
                )}>
                  Toggle Status
                </button>
                <button onClick={() => handleDeleteUser(user.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div>
        <button
          disabled={pagination.page === 1}
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
        >
          Previous
        </button>
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <button
          disabled={pagination.page === pagination.totalPages}
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default UsersPage;
```

```typescript
// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginDto } from '../types/user.types';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState<LoginDto>({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(credentials);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={credentials.email}
          onChange={e => setCredentials({ ...credentials, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={credentials.password}
          onChange={e => setCredentials({ ...credentials, password: e.target.value })}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
```

---

## Error Handling

### Error Response Format

```typescript
{
  statusCode: number;
  message: string | string[];
  error: string;
}
```

### Common HTTP Status Codes

| Code | Meaning | When It Happens |
|------|---------|----------------|
| 200  | OK | Request successful |
| 201  | Created | Resource created successfully |
| 204  | No Content | Request successful, no body returned |
| 400  | Bad Request | Invalid input data |
| 401  | Unauthorized | Authentication failed or token expired |
| 403  | Forbidden | Insufficient permissions |
| 404  | Not Found | Resource not found |
| 409  | Conflict | Duplicate resource (e.g., email exists) |
| 500  | Internal Server Error | Server error |

### Error Handling Example

```typescript
// src/utils/errorHandler.ts
import { ApiError } from '../types/user.types';

export const handleApiError = (error: any): string => {
  if (error.response?.data) {
    const apiError: ApiError = error.response.data;

    if (Array.isArray(apiError.message)) {
      return apiError.message.join(', ');
    }

    return apiError.message || 'An error occurred';
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

// Usage in component
try {
  await userService.create(userData);
} catch (error) {
  const errorMessage = handleApiError(error);
  setError(errorMessage);
}
```

---

## Testing with cURL

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ucg.com","password":"Admin@123"}'

# Get Users
curl -X GET "http://localhost:3000/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create User
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "firstName":"Test",
    "lastName":"User",
    "email":"test@example.com",
    "password":"Password123!",
    "role":"VIEWER",
    "status":"ACTIVE"
  }'
```

---

## Getting Started

1. **Copy types** from this document to `src/types/user.types.ts`
2. **Copy services** to `src/services/`
3. **Copy context** to `src/contexts/AuthContext.tsx`
4. **Wrap your app** with `AuthProvider`
5. **Use hooks** in your components: `useAuth()`
6. **Protect routes** with `ProtectedRoute` component

That's it! You're ready to integrate user management into your frontend application.
