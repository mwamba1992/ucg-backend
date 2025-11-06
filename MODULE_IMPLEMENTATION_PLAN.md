# UCG Module Implementation Plan

## Modules Implementation Order

Based on the technical architecture and dependencies, here's the recommended order for implementing modules:

## ✅ Phase 1: Foundation (COMPLETED)

### 1. Service Provider Module ✅
**Status**: Complete
**Tables**: 4 tables (service_providers, contacts, bank_accounts, settings)
**Features**:
- CRUD operations
- Onboarding workflow
- KYC verification tracking
- Approval/rejection
- Statistics

---

## 🚀 Phase 2: Core Payment Features

### 2. Reference Management Module ✅
**Priority**: HIGH (Required for payments)
**Purpose**: Generate and manage payment references
**Status**: COMPLETED

**Tables to Create**:
```sql
- payment_references
  - id (UUID)
  - referenceNumber (VARCHAR) - Format: XXX-YYYYYYY-ZZZ
  - serviceProviderId (UUID FK)
  - customerName (VARCHAR)
  - customerPhone (VARCHAR)
  - amount (DECIMAL)
  - description (TEXT)
  - expiresAt (TIMESTAMP)
  - status (ENUM: ACTIVE, USED, EXPIRED, CANCELLED)
  - metadata (JSONB)
  - createdAt, updatedAt
```

**Endpoints**:
- POST `/references` - Generate reference
- GET `/references` - List references
- GET `/references/:id` - Get by ID
- GET `/references/number/:refNumber` - Get by reference number
- PATCH `/references/:id/validate` - Validate reference
- PATCH `/references/:id/cancel` - Cancel reference
- GET `/references/sp/:spId` - Get SP's references

**Business Logic**:
- Auto-generate reference in format: XXX-YYYYYYY-ZZZ
- Validate reference structure
- Check expiry
- Prevent duplicate usage

---

### 3. Transaction Module
**Priority**: HIGH (Core feature)
**Purpose**: Handle payment transactions

**Tables to Create**:
```sql
- transactions
  - id (UUID)
  - transactionReference (VARCHAR UNIQUE)
  - paymentReferenceId (UUID FK)
  - serviceProviderId (UUID FK)
  - amount (DECIMAL)
  - currency (VARCHAR) - Default: TZS
  - channel (ENUM: VODACOM, AIRTEL, TIGO, HALOTEL, TTCL, TIPS)
  - externalTransactionId (VARCHAR) - From MNO
  - customerPhone (VARCHAR)
  - customerName (VARCHAR)
  - status (ENUM: PENDING, PROCESSING, SUCCESS, FAILED, REVERSED)
  - statusReason (TEXT)
  - initiatedAt (TIMESTAMP)
  - completedAt (TIMESTAMP)
  - metadata (JSONB)
  - createdAt, updatedAt

- transaction_events
  - id (UUID)
  - transactionId (UUID FK)
  - event (VARCHAR) - INITIATED, PROCESSING, SUCCESS, FAILED
  - description (TEXT)
  - metadata (JSONB)
  - createdAt
```

**Endpoints**:
- POST `/transactions` - Initiate payment
- GET `/transactions` - List transactions
- GET `/transactions/:id` - Get by ID
- GET `/transactions/reference/:refNumber` - Get by reference
- POST `/transactions/:id/callback` - Handle MNO callback
- GET `/transactions/sp/:spId` - Get SP's transactions
- GET `/transactions/statistics` - Transaction stats

---

### 4. Collection Module
**Priority**: MEDIUM
**Purpose**: Track expected collections vs actual payments

**Tables to Create**:
```sql
- collections
  - id (UUID)
  - serviceProviderId (UUID FK)
  - paymentReferenceId (UUID FK)
  - transactionId (UUID FK) - NULL until paid
  - expectedAmount (DECIMAL)
  - paidAmount (DECIMAL) - NULL until paid
  - status (ENUM: PENDING, PARTIAL, PAID, OVERDUE)
  - dueDate (TIMESTAMP)
  - paidAt (TIMESTAMP)
  - metadata (JSONB)
  - createdAt, updatedAt

- collection_reminders
  - id (UUID)
  - collectionId (UUID FK)
  - reminderType (ENUM: SMS, EMAIL, PUSH)
  - sentAt (TIMESTAMP)
  - status (ENUM: SENT, FAILED)
```

**Endpoints**:
- POST `/collections` - Create expected collection
- POST `/collections/bulk` - Bulk upload
- GET `/collections` - List collections
- GET `/collections/:id` - Get by ID
- GET `/collections/overdue` - Get overdue
- POST `/collections/:id/remind` - Send reminder

---

## 🔧 Phase 3: Integration & Settlement

### 5. MNO Integration Module
**Priority**: HIGH
**Purpose**: Integrate with Mobile Network Operators

**Tables to Create**:
```sql
- mno_configurations
  - id (UUID)
  - mno (ENUM: VODACOM, AIRTEL, TIGO, HALOTEL, TTCL)
  - apiEndpoint (VARCHAR)
  - apiKey (VARCHAR ENCRYPTED)
  - apiSecret (VARCHAR ENCRYPTED)
  - isActive (BOOLEAN)
  - metadata (JSONB)
  - createdAt, updatedAt

- mno_transaction_logs
  - id (UUID)
  - transactionId (UUID FK)
  - mno (VARCHAR)
  - requestPayload (JSONB)
  - responsePayload (JSONB)
  - statusCode (INT)
  - responseTime (INT) - milliseconds
  - createdAt
```

**Endpoints**:
- POST `/mno/vodacom/callback` - Vodacom callback
- POST `/mno/airtel/callback` - Airtel callback
- POST `/mno/tigo/callback` - Tigo callback
- POST `/mno/halotel/callback` - Halotel callback
- POST `/mno/ttcl/callback` - TTCL callback
- GET `/mno/status/:transactionId` - Check MNO status

**Implementation**:
- Adapter pattern for each MNO
- Abstract base class for common logic
- Individual adapters for MNO-specific logic

---

### 6. Settlement Module
**Priority**: MEDIUM
**Purpose**: Manage settlements to service providers

**Tables to Create**:
```sql
- settlements
  - id (UUID)
  - serviceProviderId (UUID FK)
  - settlementReference (VARCHAR UNIQUE)
  - totalAmount (DECIMAL)
  - commissionAmount (DECIMAL)
  - netAmount (DECIMAL)
  - transactionCount (INT)
  - bankAccountId (UUID FK)
  - status (ENUM: PENDING, PROCESSING, COMPLETED, FAILED)
  - scheduledAt (TIMESTAMP)
  - processedAt (TIMESTAMP)
  - metadata (JSONB)
  - createdAt, updatedAt

- settlement_items
  - id (UUID)
  - settlementId (UUID FK)
  - transactionId (UUID FK)
  - amount (DECIMAL)
  - commission (DECIMAL)
  - createdAt

- settlement_schedules
  - id (UUID)
  - serviceProviderId (UUID FK)
  - frequency (ENUM: DAILY, WEEKLY, MONTHLY)
  - dayOfWeek (INT) - For weekly
  - dayOfMonth (INT) - For monthly
  - time (TIME)
  - isActive (BOOLEAN)
  - createdAt, updatedAt
```

**Endpoints**:
- POST `/settlements` - Create settlement
- POST `/settlements/auto-generate` - Auto-generate settlements
- GET `/settlements` - List settlements
- GET `/settlements/:id` - Get by ID
- POST `/settlements/:id/process` - Process settlement
- GET `/settlements/sp/:spId` - Get SP's settlements
- GET `/settlements/statistics` - Settlement stats

---

### 7. Reconciliation Module
**Priority**: MEDIUM
**Purpose**: Match transactions with MNO reports

**Tables to Create**:
```sql
- reconciliation_batches
  - id (UUID)
  - batchDate (DATE)
  - mno (VARCHAR)
  - totalTransactions (INT)
  - matchedCount (INT)
  - unmatchedCount (INT)
  - discrepancyAmount (DECIMAL)
  - status (ENUM: PENDING, IN_PROGRESS, COMPLETED)
  - createdAt, updatedAt

- reconciliation_discrepancies
  - id (UUID)
  - batchId (UUID FK)
  - transactionId (UUID FK)
  - discrepancyType (ENUM: MISSING, AMOUNT_MISMATCH, STATUS_MISMATCH)
  - expectedAmount (DECIMAL)
  - actualAmount (DECIMAL)
  - resolution (TEXT)
  - resolvedAt (TIMESTAMP)
  - createdAt
```

**Endpoints**:
- POST `/reconciliation/batches` - Create batch
- POST `/reconciliation/batches/:id/run` - Run reconciliation
- GET `/reconciliation/batches` - List batches
- GET `/reconciliation/discrepancies` - List discrepancies
- PATCH `/reconciliation/discrepancies/:id/resolve` - Resolve

---

## 📊 Phase 4: Reporting & Analytics

### 8. Reporting Module
**Priority**: LOW
**Purpose**: Generate reports and analytics

**Tables to Create**:
```sql
- report_templates
  - id (UUID)
  - name (VARCHAR)
  - description (TEXT)
  - reportType (ENUM: TRANSACTION, SETTLEMENT, COLLECTION)
  - parameters (JSONB)
  - schedule (VARCHAR) - Cron expression
  - isActive (BOOLEAN)
  - createdAt, updatedAt

- generated_reports
  - id (UUID)
  - templateId (UUID FK)
  - serviceProviderId (UUID FK) - NULL for admin reports
  - fileName (VARCHAR)
  - fileUrl (VARCHAR)
  - status (ENUM: GENERATING, COMPLETED, FAILED)
  - generatedAt (TIMESTAMP)
  - parameters (JSONB)
```

**Endpoints**:
- POST `/reports/generate` - Generate ad-hoc report
- GET `/reports` - List reports
- GET `/reports/:id/download` - Download report
- GET `/reports/templates` - List templates

---

### 9. Dashboard/Analytics Module
**Priority**: LOW
**Purpose**: Real-time analytics and metrics

**Endpoints**:
- GET `/analytics/overview` - Overall metrics
- GET `/analytics/transactions` - Transaction metrics
- GET `/analytics/sp/:spId` - SP-specific metrics
- GET `/analytics/revenue` - Revenue metrics
- GET `/analytics/trends` - Trend analysis

---

## 🔐 Phase 5: Security & Access Control

### 10. User Management Module
**Priority**: HIGH (for security)
**Purpose**: Manage admin and SP users

**Tables to Create**:
```sql
- users
  - id (UUID)
  - serviceProviderId (UUID FK) - NULL for admin
  - email (VARCHAR UNIQUE)
  - passwordHash (VARCHAR)
  - firstName (VARCHAR)
  - lastName (VARCHAR)
  - phone (VARCHAR)
  - role (ENUM: SUPER_ADMIN, ADMIN, SP_ADMIN, SP_USER)
  - isActive (BOOLEAN)
  - emailVerified (BOOLEAN)
  - lastLoginAt (TIMESTAMP)
  - createdAt, updatedAt

- user_sessions
  - id (UUID)
  - userId (UUID FK)
  - accessToken (VARCHAR)
  - refreshToken (VARCHAR)
  - expiresAt (TIMESTAMP)
  - ipAddress (VARCHAR)
  - userAgent (TEXT)
  - createdAt

- user_permissions
  - id (UUID)
  - userId (UUID FK)
  - permission (VARCHAR)
  - resource (VARCHAR)
  - createdAt
```

**Endpoints**:
- POST `/auth/register` - Register user
- POST `/auth/login` - Login
- POST `/auth/logout` - Logout
- POST `/auth/refresh` - Refresh token
- POST `/auth/forgot-password` - Forgot password
- POST `/auth/reset-password` - Reset password
- GET `/users` - List users
- POST `/users` - Create user
- PATCH `/users/:id` - Update user
- DELETE `/users/:id` - Delete user

---

### 11. Audit Log Module
**Priority**: MEDIUM
**Purpose**: Track all system activities

**Tables to Create**:
```sql
- audit_logs
  - id (UUID)
  - userId (UUID FK)
  - action (VARCHAR) - CREATE, UPDATE, DELETE, etc.
  - resource (VARCHAR) - service_provider, transaction, etc.
  - resourceId (UUID)
  - changes (JSONB) - Before/after values
  - ipAddress (VARCHAR)
  - userAgent (TEXT)
  - createdAt
```

**Endpoints**:
- GET `/audit-logs` - List logs
- GET `/audit-logs/resource/:type/:id` - Get resource logs
- GET `/audit-logs/user/:userId` - Get user logs

---

## 📱 Phase 6: Notifications

### 12. Notification Module
**Priority**: MEDIUM
**Purpose**: Send notifications via SMS, email, push

**Tables to Create**:
```sql
- notification_templates
  - id (UUID)
  - name (VARCHAR)
  - type (ENUM: SMS, EMAIL, PUSH)
  - subject (VARCHAR)
  - body (TEXT)
  - variables (JSONB)
  - isActive (BOOLEAN)
  - createdAt, updatedAt

- notifications
  - id (UUID)
  - templateId (UUID FK)
  - recipient (VARCHAR) - Email/phone
  - type (ENUM: SMS, EMAIL, PUSH)
  - subject (VARCHAR)
  - body (TEXT)
  - status (ENUM: PENDING, SENT, FAILED)
  - sentAt (TIMESTAMP)
  - metadata (JSONB)
  - createdAt

- notification_preferences
  - id (UUID)
  - userId (UUID FK)
  - serviceProviderId (UUID FK)
  - emailNotifications (BOOLEAN)
  - smsNotifications (BOOLEAN)
  - pushNotifications (BOOLEAN)
  - createdAt, updatedAt
```

**Endpoints**:
- POST `/notifications/send` - Send notification
- GET `/notifications` - List notifications
- GET `/notifications/:id` - Get by ID
- POST `/notifications/templates` - Create template

---

## 🎯 Recommended Next Module

### **Option 1: Reference Management Module** (Recommended)
**Why**: Foundation for payment processing
**Duration**: 1-2 days
**Complexity**: Low-Medium

### **Option 2: Transaction Module**
**Why**: Core payment feature
**Duration**: 2-3 days
**Complexity**: Medium

### **Option 3: User Management Module**
**Why**: Security and authentication
**Duration**: 2-3 days
**Complexity**: Medium

---

## Implementation Checklist Per Module

For each module, follow this checklist:

- [ ] Create entities (normalized tables)
- [ ] Create DTOs (request/response)
- [ ] Create service with business logic
- [ ] Create controller with endpoints
- [ ] Register in module
- [ ] Add validation
- [ ] Add Swagger documentation
- [ ] Write unit tests (optional)
- [ ] Update README

---

## Module Dependencies

```
Service Provider (✅)
    ↓
Reference Management
    ↓
Transaction
    ↓
Collection
    ↓
Settlement

(Parallel)
├── MNO Integration
├── User Management
├── Notification
├── Audit Log
└── Reporting
```

---

**Which module would you like to implement next?**

1. Reference Management (Recommended - payment foundation)
2. Transaction Module (Core payment processing)
3. User Management (Authentication/Authorization)
4. Other (specify)
