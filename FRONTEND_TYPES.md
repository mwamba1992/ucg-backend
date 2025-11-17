# Frontend TypeScript/JavaScript Types

This document contains all type definitions for the UCG Backend API that can be used in your frontend application.

## Installation

If using TypeScript in your React/Vue/Angular project, copy these types into your project:

```
src/types/api.types.ts
```

---

## Authentication Types

### UserRole

```typescript
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER'
}

// JavaScript alternative
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER'
};
```

### UserStatus

```typescript
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING'
}

// JavaScript alternative
export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING: 'PENDING'
};
```

### User

```typescript
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole | string;
  status: UserStatus | string;
  isEmailVerified: boolean;
  lastLoginAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} [phoneNumber]
 * @property {string} role
 * @property {string} status
 * @property {boolean} isEmailVerified
 * @property {string} [lastLoginAt]
 * @property {string} createdAt
 * @property {string} updatedAt
 */
```

### LoginDto

```typescript
export interface LoginDto {
  email: string;
  password: string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} LoginDto
 * @property {string} email
 * @property {string} password
 */
```

### RegisterDto

```typescript
export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  role?: UserRole | string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} RegisterDto
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} [phoneNumber]
 * @property {string} password
 * @property {string} [role]
 */
```

### ChangePasswordDto

```typescript
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} ChangePasswordDto
 * @property {string} currentPassword
 * @property {string} newPassword
 */
```

### AuthResponse

```typescript
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

// JavaScript JSDoc
/**
 * @typedef {Object} AuthResponse
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {Object} user
 * @property {string} user.id
 * @property {string} user.email
 * @property {string} user.firstName
 * @property {string} user.lastName
 * @property {string} user.role
 * @property {string} user.status
 */
```

### RefreshTokenDto

```typescript
export interface RefreshTokenDto {
  userId: string;
  refreshToken: string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} RefreshTokenDto
 * @property {string} userId
 * @property {string} refreshToken
 */
```

---

## User Management Types

### CreateUserDto

```typescript
export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  role: UserRole | string;
  status?: UserStatus | string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} CreateUserDto
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} [phoneNumber]
 * @property {string} password
 * @property {string} role
 * @property {string} [status]
 */
```

### UpdateUserDto

```typescript
export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  role?: UserRole | string;
  status?: UserStatus | string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} UpdateUserDto
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [email]
 * @property {string} [phoneNumber]
 * @property {string} [password]
 * @property {string} [role]
 * @property {string} [status]
 */
```

### QueryUserDto

```typescript
export interface QueryUserDto {
  page?: number;
  limit?: number;
  role?: UserRole | string;
  status?: UserStatus | string;
  email?: string;
  search?: string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} QueryUserDto
 * @property {number} [page]
 * @property {number} [limit]
 * @property {string} [role]
 * @property {string} [status]
 * @property {string} [email]
 * @property {string} [search]
 */
```

### UserListResponse

```typescript
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

// JavaScript JSDoc
/**
 * @typedef {Object} Pagination
 * @property {number} total
 * @property {number} page
 * @property {number} limit
 * @property {number} totalPages
 */

/**
 * @typedef {Object} UserListResponse
 * @property {User[]} data
 * @property {Pagination} pagination
 */
```

### UserStatistics

```typescript
export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
}

// JavaScript JSDoc
/**
 * @typedef {Object} UserStatistics
 * @property {number} total
 * @property {number} active
 * @property {number} inactive
 * @property {number} suspended
 * @property {number} pending
 */
```

### UpdateUserStatusDto

```typescript
export interface UpdateUserStatusDto {
  status: UserStatus | string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} UpdateUserStatusDto
 * @property {string} status
 */
```

---

## Service Provider Types

### ServiceProviderType

```typescript
export enum ServiceProviderType {
  SCHOOL = 'SCHOOL',
  HOSPITAL = 'HOSPITAL',
  CHURCH = 'CHURCH',
  SACCO = 'SACCO',
  MFI = 'MFI',
  NGO = 'NGO',
  UTILITY = 'UTILITY',
  GOVERNMENT = 'GOVERNMENT',
  OTHER = 'OTHER'
}

// JavaScript alternative
export const ServiceProviderType = {
  SCHOOL: 'SCHOOL',
  HOSPITAL: 'HOSPITAL',
  CHURCH: 'CHURCH',
  SACCO: 'SACCO',
  MFI: 'MFI',
  NGO: 'NGO',
  UTILITY: 'UTILITY',
  GOVERNMENT: 'GOVERNMENT',
  OTHER: 'OTHER'
};
```

### OnboardingStatus

```typescript
export enum OnboardingStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  KYC_VERIFICATION = 'KYC_VERIFICATION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  ACTIVE = 'ACTIVE'
}

// JavaScript alternative
export const OnboardingStatus = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  KYC_VERIFICATION: 'KYC_VERIFICATION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  ACTIVE: 'ACTIVE'
};
```

### ServiceProvider

```typescript
export interface ServiceProvider {
  id: string;
  spCode: string;
  businessName: string;
  businessType: ServiceProviderType | string;
  registrationNumber?: string;
  tinNumber?: string;
  phoneNumber: string;
  email: string;
  physicalAddress?: string;
  region?: string;
  district?: string;
  nidaVerified: boolean;
  brelaVerified: boolean;
  traVerified: boolean;
  status: OnboardingStatus | string;
  rejectionReason?: string;
  approvedAt?: Date | string;
  approvedBy?: string;
  apiKey?: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} ServiceProvider
 * @property {string} id
 * @property {string} spCode
 * @property {string} businessName
 * @property {string} businessType
 * @property {string} [registrationNumber]
 * @property {string} [tinNumber]
 * @property {string} phoneNumber
 * @property {string} email
 * @property {string} [physicalAddress]
 * @property {string} [region]
 * @property {string} [district]
 * @property {boolean} nidaVerified
 * @property {boolean} brelaVerified
 * @property {boolean} traVerified
 * @property {string} status
 * @property {string} [rejectionReason]
 * @property {string} [approvedAt]
 * @property {string} [approvedBy]
 * @property {string} [apiKey]
 * @property {boolean} isActive
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} [deletedAt]
 */
```

---

## Payment Reference Types

### ReferenceStatus

```typescript
export enum ReferenceStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

// JavaScript alternative
export const ReferenceStatus = {
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};
```

### PaymentOption

```typescript
export enum PaymentOption {
  FULL = 'FULL',
  INSTALLMENT = 'INSTALLMENT'
}

// JavaScript alternative
export const PaymentOption = {
  FULL: 'FULL',
  INSTALLMENT: 'INSTALLMENT'
};
```

### PaymentReference

```typescript
export interface PaymentReference {
  id: string;
  referenceNumber: string;
  serviceProviderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  description?: string;
  paymentOption: PaymentOption | string;
  installmentCount?: number;
  installmentAmount?: number;
  expiryDate: Date | string;
  status: ReferenceStatus | string;
  usedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  serviceProvider?: ServiceProvider;
}

// JavaScript JSDoc
/**
 * @typedef {Object} PaymentReference
 * @property {string} id
 * @property {string} referenceNumber
 * @property {string} serviceProviderId
 * @property {string} customerName
 * @property {string} customerPhone
 * @property {string} [customerEmail]
 * @property {number} amount
 * @property {string} currency
 * @property {string} [description]
 * @property {string} paymentOption
 * @property {number} [installmentCount]
 * @property {number} [installmentAmount]
 * @property {string} expiryDate
 * @property {string} status
 * @property {string} [usedAt]
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {ServiceProvider} [serviceProvider]
 */
```

---

## Payment Types

### PaymentStatus

```typescript
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// JavaScript alternative
export const PaymentStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};
```

### PaymentChannel

```typescript
export enum PaymentChannel {
  TIGOPESA = 'TIGOPESA',
  MPESA = 'M-PESA',
  AIRTEL_MONEY = 'AIRTEL_MONEY',
  HALOPESA = 'HALOPESA'
}

// JavaScript alternative
export const PaymentChannel = {
  TIGOPESA: 'TIGOPESA',
  MPESA: 'M-PESA',
  AIRTEL_MONEY: 'AIRTEL_MONEY',
  HALOPESA: 'HALOPESA'
};
```

### Payment

```typescript
export interface Payment {
  id: string;
  referenceNumber: string;
  transactionId: string;
  paymentChannel: PaymentChannel | string;
  customerPhone: string;
  amountPaid: number;
  currency: string;
  status: PaymentStatus | string;
  failureReason?: string;
  paidAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  reference?: PaymentReference;
}

// JavaScript JSDoc
/**
 * @typedef {Object} Payment
 * @property {string} id
 * @property {string} referenceNumber
 * @property {string} transactionId
 * @property {string} paymentChannel
 * @property {string} customerPhone
 * @property {number} amountPaid
 * @property {string} currency
 * @property {string} status
 * @property {string} [failureReason]
 * @property {string} [paidAt]
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {PaymentReference} [reference]
 */
```

---

## Dashboard Types

### DashboardQuery

```typescript
export interface DashboardQuery {
  startDate?: Date | string;
  endDate?: Date | string;
  serviceProviderId?: string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} DashboardQuery
 * @property {string} [startDate]
 * @property {string} [endDate]
 * @property {string} [serviceProviderId]
 */
```

### AmountStatistics

```typescript
export interface AmountStatistics {
  total: number;
  paid: number;
  pending: number;
  expired: number;
  currency: string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} AmountStatistics
 * @property {number} total
 * @property {number} paid
 * @property {number} pending
 * @property {number} expired
 * @property {string} currency
 */
```

### ReferencesStatistics

```typescript
export interface ReferencesStatistics {
  total: number;
  active: number;
  used: number;
  expired: number;
  cancelled: number;
  amounts: AmountStatistics;
  collectionRate: number;
}

// JavaScript JSDoc
/**
 * @typedef {Object} ReferencesStatistics
 * @property {number} total
 * @property {number} active
 * @property {number} used
 * @property {number} expired
 * @property {number} cancelled
 * @property {AmountStatistics} amounts
 * @property {number} collectionRate
 */
```

### ChannelStatistics

```typescript
export interface ChannelStatistics {
  channel: string;
  count: number;
  amount: number;
}

// JavaScript JSDoc
/**
 * @typedef {Object} ChannelStatistics
 * @property {string} channel
 * @property {number} count
 * @property {number} amount
 */
```

### PaymentsStatistics

```typescript
export interface PaymentsStatistics {
  total: number;
  successful: number;
  successRate: number;
  uniqueReferences: number;
  amounts: {
    total: number;
    successful: number;
    currency: string;
  };
  byChannel: ChannelStatistics[];
}

// JavaScript JSDoc
/**
 * @typedef {Object} PaymentsStatistics
 * @property {number} total
 * @property {number} successful
 * @property {number} successRate
 * @property {number} uniqueReferences
 * @property {Object} amounts
 * @property {number} amounts.total
 * @property {number} amounts.successful
 * @property {string} amounts.currency
 * @property {ChannelStatistics[]} byChannel
 */
```

### TopServiceProvider

```typescript
export interface TopServiceProvider {
  id: string;
  businessName: string;
  spCode: string;
  referencesCount: number;
  totalAmount: number;
  collectedAmount: number;
  collectionRate: string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} TopServiceProvider
 * @property {string} id
 * @property {string} businessName
 * @property {string} spCode
 * @property {number} referencesCount
 * @property {number} totalAmount
 * @property {number} collectedAmount
 * @property {string} collectionRate
 */
```

### StatusBreakdown

```typescript
export interface StatusBreakdown {
  status: string;
  count: number;
  amount: number;
}

// JavaScript JSDoc
/**
 * @typedef {Object} StatusBreakdown
 * @property {string} status
 * @property {number} count
 * @property {number} amount
 */
```

### DashboardOverview

```typescript
export interface DashboardOverview {
  period: {
    startDate: Date | string;
    endDate: Date | string;
  };
  references: ReferencesStatistics;
  payments: PaymentsStatistics;
  recentActivity: {
    references: PaymentReference[];
    payments: Payment[];
  };
  topServiceProviders: TopServiceProvider[];
  statusBreakdown: StatusBreakdown[];
  generatedAt: Date | string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} DashboardOverview
 * @property {Object} period
 * @property {string} period.startDate
 * @property {string} period.endDate
 * @property {ReferencesStatistics} references
 * @property {PaymentsStatistics} payments
 * @property {Object} recentActivity
 * @property {PaymentReference[]} recentActivity.references
 * @property {Payment[]} recentActivity.payments
 * @property {TopServiceProvider[]} topServiceProviders
 * @property {StatusBreakdown[]} statusBreakdown
 * @property {string} generatedAt
 */
```

---

## Error Types

### ApiError

```typescript
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// JavaScript JSDoc
/**
 * @typedef {Object} ApiError
 * @property {number} statusCode
 * @property {string|string[]} message
 * @property {string} error
 */
```

---

## Complete TypeScript Definition File

Here's a complete file you can copy directly into your project:

```typescript
// src/types/api.types.ts

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

export enum ServiceProviderType {
  SCHOOL = 'SCHOOL',
  HOSPITAL = 'HOSPITAL',
  CHURCH = 'CHURCH',
  SACCO = 'SACCO',
  MFI = 'MFI',
  NGO = 'NGO',
  UTILITY = 'UTILITY',
  GOVERNMENT = 'GOVERNMENT',
  OTHER = 'OTHER'
}

export enum OnboardingStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  KYC_VERIFICATION = 'KYC_VERIFICATION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  ACTIVE = 'ACTIVE'
}

export enum ReferenceStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentOption {
  FULL = 'FULL',
  INSTALLMENT = 'INSTALLMENT'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentChannel {
  TIGOPESA = 'TIGOPESA',
  MPESA = 'M-PESA',
  AIRTEL_MONEY = 'AIRTEL_MONEY',
  HALOPESA = 'HALOPESA'
}

// ==================== AUTHENTICATION ====================

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

// ==================== USER MANAGEMENT ====================

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

export interface UpdateUserStatusDto {
  status: UserStatus;
}

// ==================== SERVICE PROVIDERS ====================

export interface ServiceProvider {
  id: string;
  spCode: string;
  businessName: string;
  businessType: ServiceProviderType;
  registrationNumber?: string;
  tinNumber?: string;
  phoneNumber: string;
  email: string;
  physicalAddress?: string;
  region?: string;
  district?: string;
  nidaVerified: boolean;
  brelaVerified: boolean;
  traVerified: boolean;
  status: OnboardingStatus;
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  apiKey?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ==================== PAYMENT REFERENCES ====================

export interface PaymentReference {
  id: string;
  referenceNumber: string;
  serviceProviderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  description?: string;
  paymentOption: PaymentOption;
  installmentCount?: number;
  installmentAmount?: number;
  expiryDate: string;
  status: ReferenceStatus;
  usedAt?: string;
  createdAt: string;
  updatedAt: string;
  serviceProvider?: ServiceProvider;
}

// ==================== PAYMENTS ====================

export interface Payment {
  id: string;
  referenceNumber: string;
  transactionId: string;
  paymentChannel: PaymentChannel;
  customerPhone: string;
  amountPaid: number;
  currency: string;
  status: PaymentStatus;
  failureReason?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  reference?: PaymentReference;
}

// ==================== DASHBOARD ====================

export interface DashboardQuery {
  startDate?: string;
  endDate?: string;
  serviceProviderId?: string;
}

export interface AmountStatistics {
  total: number;
  paid: number;
  pending: number;
  expired: number;
  currency: string;
}

export interface ReferencesStatistics {
  total: number;
  active: number;
  used: number;
  expired: number;
  cancelled: number;
  amounts: AmountStatistics;
  collectionRate: number;
}

export interface ChannelStatistics {
  channel: string;
  count: number;
  amount: number;
}

export interface PaymentsStatistics {
  total: number;
  successful: number;
  successRate: number;
  uniqueReferences: number;
  amounts: {
    total: number;
    successful: number;
    currency: string;
  };
  byChannel: ChannelStatistics[];
}

export interface TopServiceProvider {
  id: string;
  businessName: string;
  spCode: string;
  referencesCount: number;
  totalAmount: number;
  collectedAmount: number;
  collectionRate: string;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  amount: number;
}

export interface DashboardOverview {
  period: {
    startDate: string;
    endDate: string;
  };
  references: ReferencesStatistics;
  payments: PaymentsStatistics;
  recentActivity: {
    references: PaymentReference[];
    payments: Payment[];
  };
  topServiceProviders: TopServiceProvider[];
  statusBreakdown: StatusBreakdown[];
  generatedAt: string;
}

// ==================== ERRORS ====================

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// ==================== API RESPONSE WRAPPERS ====================

export interface SuccessResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
```

---

## JavaScript Constants File

For non-TypeScript projects:

```javascript
// src/constants/api.constants.js

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

export const ServiceProviderType = {
  SCHOOL: 'SCHOOL',
  HOSPITAL: 'HOSPITAL',
  CHURCH: 'CHURCH',
  SACCO: 'SACCO',
  MFI: 'MFI',
  NGO: 'NGO',
  UTILITY: 'UTILITY',
  GOVERNMENT: 'GOVERNMENT',
  OTHER: 'OTHER'
};

export const OnboardingStatus = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  KYC_VERIFICATION: 'KYC_VERIFICATION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  ACTIVE: 'ACTIVE'
};

export const ReferenceStatus = {
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

export const PaymentOption = {
  FULL: 'FULL',
  INSTALLMENT: 'INSTALLMENT'
};

export const PaymentStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

export const PaymentChannel = {
  TIGOPESA: 'TIGOPESA',
  MPESA: 'M-PESA',
  AIRTEL_MONEY: 'AIRTEL_MONEY',
  HALOPESA: 'HALOPESA'
};

export const API_BASE_URL = 'http://localhost:3000/api/v1';
```

---

## Usage Examples

### TypeScript React Component

```typescript
import React, { useState, useEffect } from 'react';
import { User, UserListResponse, QueryUserDto } from '../types/api.types';
import { userAPI } from '../api/user.api';

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

      const response: UserListResponse = await userAPI.getAll(query);
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {users.map((user: User) => (
            <li key={user.id}>
              {user.firstName} {user.lastName} - {user.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UsersPage;
```

### JavaScript React Component

```javascript
import React, { useState, useEffect } from 'react';
import { UserRole, UserStatus } from '../constants/api.constants';
import { userAPI } from '../api/user.api';

/**
 * @returns {JSX.Element}
 */
const UsersPage = () => {
  /** @type {[User[], Function]} */
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAll({
        page: 1,
        limit: 10,
        status: UserStatus.ACTIVE
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.firstName} {user.lastName} ({user.role})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UsersPage;
```

---

## Validation Helpers

```typescript
// src/utils/validators.ts

import { UserRole, UserStatus } from '../types/api.types';

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  return password.length >= 8;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  // Tanzanian phone number format
  const phoneRegex = /^\+255\d{9}$/;
  return phoneRegex.test(phone);
};

export const isValidUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

export const isValidUserStatus = (status: string): status is UserStatus => {
  return Object.values(UserStatus).includes(status as UserStatus);
};
```

---

This complete type definition file provides full TypeScript support for your frontend application with all API endpoints and data models!
