# UCG Backend - Role Management Guide

## Overview

The UCG Backend has a comprehensive role-based access control (RBAC) system with two distinct user types:
1. **Admin Portal Users** - Internal staff managing the platform
2. **Service Provider Users** - External users from service provider organizations

## Table of Contents

- [User Types](#user-types)
- [Admin Portal Roles](#admin-portal-roles)
- [Service Provider Portal Roles](#service-provider-portal-roles)
- [API Endpoints](#api-endpoints)
- [Frontend Integration](#frontend-integration)
- [Migration Guide](#migration-guide)

---

## User Types

### UserType Enum

```typescript
export enum UserType {
  ADMIN = 'ADMIN',                    // Admin portal users
  SERVICE_PROVIDER = 'SERVICE_PROVIDER'  // SP portal users
}
```

All users must have a `userType` field that determines which portal they belong to.

---

## Admin Portal Roles

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| SUPER_ADMIN | 1 | System owner with full access |
| ADMIN | 2 | Platform administrator |
| FINANCE_MANAGER | 3 | Financial operations lead |
| OPERATIONS_MANAGER | 3 | Operations lead |
| COMPLIANCE_OFFICER | 4 | Approval & compliance |
| SUPPORT_AGENT | 5 | Customer support |
| ANALYST | 5 | Data analyst (view-only) |
| AUDITOR | 5 | Audit & compliance (view-only) |

### Detailed Role Permissions

#### 1. SUPER_ADMIN
**Full system access including:**
- ✅ Create/Update/Delete all users (including other admins)
- ✅ Manage service providers (full CRUD)
- ✅ Manage financial service providers
- ✅ View/Manage all references and payments
- ✅ Access reconciliation and settlements
- ✅ Manage workflows and approvals
- ✅ System configurations
- ✅ Hard delete operations
- ✅ Access all dashboards and analytics

**Use case:** System owner, CTO, or platform owner

---

#### 2. ADMIN
**Full administrative access except system configs:**
- ✅ Create/Update/Delete users (except SUPER_ADMIN)
- ✅ Manage service providers (full CRUD)
- ✅ Manage financial service providers
- ✅ View/Manage all references and payments
- ✅ Access reconciliation and settlements
- ✅ Manage workflows and approvals
- ✅ Access all dashboards and analytics
- ❌ Cannot modify system configurations
- ❌ Cannot hard delete
- ❌ Cannot delete SUPER_ADMIN users

**Use case:** Platform administrators, senior management

---

#### 3. FINANCE_MANAGER
**Financial operations focus:**
- ✅ View/Manage payments
- ✅ Full access to reconciliation module
- ✅ Manage settlements
- ✅ Generate financial reports
- ✅ View service providers (read-only)
- ✅ View references (read-only)
- ✅ Access financial dashboards
- ❌ Cannot manage users
- ❌ Cannot approve/reject SPs
- ❌ Cannot manage workflows

**Use case:** Finance team lead, accountant, financial controller

---

#### 4. OPERATIONS_MANAGER
**Daily operations management:**
- ✅ View/Update service providers
- ✅ Approve service providers
- ✅ Full access to references
- ✅ Manage workflows
- ✅ View payments (read-only)
- ✅ Access operations dashboards
- ❌ Cannot manage users
- ❌ Limited financial access
- ❌ Cannot manage reconciliation

**Use case:** Operations lead, project manager

---

#### 5. COMPLIANCE_OFFICER
**Approval and compliance:**
- ✅ View service providers
- ✅ Approve/Reject service providers
- ✅ View workflows
- ✅ Approve workflow tasks
- ✅ View compliance reports
- ✅ Access audit logs
- ❌ Cannot create/delete SPs
- ❌ Cannot manage payments
- ❌ Cannot manage users

**Use case:** Compliance officer, KYC officer, risk management

---

#### 6. SUPPORT_AGENT
**Customer support:**
- ✅ View service providers
- ✅ View references
- ✅ View payments
- ✅ Handle support tickets
- ❌ No modifications allowed
- ❌ No access to financial data

**Use case:** Customer support, helpdesk

---

#### 7. ANALYST
**Analytics and reporting:**
- ✅ Access all dashboards
- ✅ View all analytics
- ✅ Generate reports
- ✅ View SPs, references, payments (read-only)
- ❌ No modifications allowed

**Use case:** Data analyst, business analyst

---

#### 8. AUDITOR
**Audit and compliance view:**
- ✅ View audit logs
- ✅ View all users (read-only)
- ✅ View all SPs, references, payments (read-only)
- ✅ View reconciliation data
- ✅ View workflows
- ✅ Generate compliance reports
- ❌ Strictly read-only access

**Use case:** Internal auditor, external auditor, compliance auditor

---

## Service Provider Portal Roles

### SP Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| SP_ADMIN | 1 | SP account owner |
| SP_FINANCE | 2 | Finance operations |
| SP_OPERATOR | 3 | Daily operations |
| SP_VIEWER | 4 | View-only access |

### Detailed SP Role Permissions

#### 1. SP_ADMIN
**Full SP account access:**
- ✅ Update SP profile
- ✅ Manage SP users
- ✅ Generate/Manage references
- ✅ View payments
- ✅ Access reconciliation
- ✅ Manage settings
- ✅ Manage bank accounts
- ✅ Access all SP dashboards

**Use case:** School principal, business owner, account manager

---

#### 2. SP_FINANCE
**Financial operations:**
- ✅ Generate references
- ✅ View references
- ✅ View payments
- ✅ Full access to reconciliation
- ✅ View settlements
- ✅ Access financial dashboards
- ❌ Cannot manage users
- ❌ Cannot update SP profile
- ❌ Cannot manage settings

**Use case:** School bursar, accountant, finance officer

---

#### 3. SP_OPERATOR
**Daily operations:**
- ✅ Generate references
- ✅ View references
- ✅ Update references
- ✅ View payments (basic)
- ✅ Access basic dashboards
- ❌ No financial data access
- ❌ Cannot view reconciliation
- ❌ Cannot manage settings

**Use case:** Front desk staff, operations clerk

---

#### 4. SP_VIEWER
**View-only access:**
- ✅ View references
- ✅ View payments (basic)
- ✅ View basic statistics
- ❌ Cannot generate references
- ❌ Cannot make modifications

**Use case:** Monitoring staff, supervisors

---

## API Endpoints

### Get All Roles

```http
GET /api/v1/roles
```

**Query Parameters:**
- `userType` (optional): Filter by `ADMIN` or `SERVICE_PROVIDER`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "value": "SUPER_ADMIN",
      "label": "Super Admin",
      "description": "System owner with full access",
      "userType": "ADMIN",
      "permissions": ["users:*", "service-providers:*", ...]
    }
  ]
}
```

---

### Get Admin Roles

```http
GET /api/v1/roles/admin
```

Returns only admin portal roles.

---

### Get Service Provider Roles

```http
GET /api/v1/roles/service-provider
```

Returns only SP portal roles.

---

### Get User Types

```http
GET /api/v1/roles/user-types
```

Returns available user types.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "value": "ADMIN",
      "label": "Admin Portal User",
      "description": "Users who access the admin portal"
    },
    {
      "value": "SERVICE_PROVIDER",
      "label": "Service Provider User",
      "description": "Users from service provider organizations"
    }
  ]
}
```

---

## Frontend Integration

### TypeScript Types

Create these types in your frontend:

```typescript
// types/user.types.ts
export enum UserType {
  ADMIN = 'ADMIN',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
}

export enum UserRole {
  // Admin roles
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  ANALYST = 'ANALYST',
  AUDITOR = 'AUDITOR',

  // SP roles
  SP_ADMIN = 'SP_ADMIN',
  SP_FINANCE = 'SP_FINANCE',
  SP_OPERATOR = 'SP_OPERATOR',
  SP_VIEWER = 'SP_VIEWER',
}

export interface RoleInfo {
  value: string;
  label: string;
  description: string;
  permissions: string[];
  userType: UserType;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userType: UserType;
  role: UserRole;
  status: string;
}
```

---

### React Example - Role Dropdown

```tsx
import { useState, useEffect } from 'react';
import axios from 'axios';

function RoleSelector({ userType, value, onChange }) {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      const response = await axios.get(`/api/v1/roles?userType=${userType}`);
      setRoles(response.data.data);
    };

    fetchRoles();
  }, [userType]);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select Role</option>
      {roles.map((role) => (
        <option key={role.value} value={role.value} title={role.description}>
          {role.label}
        </option>
      ))}
    </select>
  );
}
```

---

### Permission Checking

```typescript
// utils/permissions.ts
export function hasPermission(user: User, permission: string): boolean {
  const rolePermissions = {
    SUPER_ADMIN: ['*'],
    ADMIN: ['users:*', 'service-providers:*', 'payments:*'],
    FINANCE_MANAGER: ['payments:*', 'reconciliation:*'],
    // ... add more as needed
  };

  const userPermissions = rolePermissions[user.role] || [];

  // Check wildcard
  if (userPermissions.includes('*')) return true;

  // Check exact match
  if (userPermissions.includes(permission)) return true;

  // Check pattern match (e.g., "users:*" matches "users:create")
  return userPermissions.some(p => {
    const pattern = p.replace('*', '.*');
    return new RegExp(`^${pattern}$`).test(permission);
  });
}

// Usage in component
if (hasPermission(user, 'users:create')) {
  // Show create user button
}
```

---

## Migration Guide

### Step 1: Run the Migration

```bash
# Run the migration to add userType field and new roles
npm run migration:run
```

### Step 2: Update Existing Users

All existing users will have `userType = 'ADMIN'` by default. Update as needed:

```sql
-- Update specific users to SP type if needed
UPDATE users
SET "userType" = 'SERVICE_PROVIDER'
WHERE email LIKE '%@serviceProvider.com';
```

### Step 3: Update Controllers (If needed)

Add role checks to your controllers:

```typescript
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@Roles(UserRole.FINANCE_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Get('financial-report')
async getFinancialReport() {
  // Only accessible by finance roles
}
```

---

## Best Practices

### 1. Role Assignment
- Always assign appropriate `userType` when creating users
- Match roles with userType (e.g., SP roles with SERVICE_PROVIDER type)
- Use least privilege principle

### 2. Frontend Implementation
- Fetch roles dynamically from API (don't hardcode)
- Cache roles data to reduce API calls
- Filter roles by userType before displaying

### 3. Permission Checks
- Always verify permissions on backend (guards)
- Use frontend permission checks for UI only
- Don't rely solely on frontend validation

### 4. Auditing
- Log role changes
- Track permission usage
- Monitor for suspicious activity

---

## Examples

### Creating an Admin User

```typescript
POST /api/v1/users
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@ucg.co.tz",
  "phoneNumber": "+255712345678",
  "password": "SecurePassword123!",
  "userType": "ADMIN",
  "role": "FINANCE_MANAGER",
  "status": "ACTIVE"
}
```

### Creating a Service Provider User

```typescript
POST /api/v1/users
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@mwangaschool.ac.tz",
  "phoneNumber": "+255787654321",
  "password": "SecurePassword123!",
  "userType": "SERVICE_PROVIDER",
  "role": "SP_ADMIN",
  "status": "ACTIVE"
}
```

---

## Security Considerations

1. **Role Elevation:** Only SUPER_ADMIN can assign SUPER_ADMIN role
2. **Cross-Type Access:** Admin users cannot access SP portal and vice versa
3. **Token Validation:** JWT tokens contain userType for validation
4. **Audit Logs:** All role changes should be logged
5. **MFA:** Consider requiring MFA for SUPER_ADMIN and ADMIN roles

---

## Troubleshooting

### Issue: Role dropdown shows wrong roles

**Solution:** Ensure you're filtering by `userType`:
```typescript
GET /api/v1/roles?userType=ADMIN
```

### Issue: Permission denied errors

**Solution:** Check:
1. User has correct `userType`
2. User's `role` matches `userType`
3. Controller has correct `@Roles()` decorator
4. Guards are properly applied

### Issue: Legacy roles appearing

**Solution:** Legacy roles are excluded by default in the API. If you see them, check your frontend filtering.

---

## Support

For questions or issues:
- Backend: Check `src/modules/user/roles.controller.ts`
- Documentation: This file
- API: Swagger docs at `/api/docs`
