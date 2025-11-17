# User Management & Authentication Module

This document provides comprehensive information about the User Management and Authentication system implemented in the UCG Backend.

## Overview

The system includes:
- User CRUD operations
- JWT-based authentication
- Role-based access control (RBAC)
- Password management
- Token refresh mechanism
- User statistics and reporting

## User Roles

The system supports the following roles with hierarchical permissions:

1. **SUPER_ADMIN** - Full system access, can manage all users and settings
2. **ADMIN** - Can manage users and most operations
3. **MANAGER** - Can view and manage specific resources
4. **OPERATOR** - Can perform day-to-day operations
5. **VIEWER** - Read-only access

## User Statuses

- **ACTIVE** - User can login and use the system
- **INACTIVE** - User cannot login
- **SUSPENDED** - User temporarily blocked
- **PENDING** - New user awaiting approval

## API Endpoints

### Authentication Endpoints

#### Register
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+255712345678",
  "password": "SecurePassword123!",
  "role": "VIEWER"
}
```

#### Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "VIEWER",
    "status": "PENDING"
  }
}
```

#### Get Profile
```
GET /api/v1/auth/profile
Authorization: Bearer {accessToken}
```

#### Change Password
```
POST /api/v1/auth/change-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### Logout
```
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

#### Refresh Token
```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "userId": "uuid",
  "refreshToken": "eyJhbGc..."
}
```

### User Management Endpoints

All user management endpoints require authentication and appropriate role permissions.

#### Create User (SUPER_ADMIN, ADMIN only)
```
POST /api/v1/users
Authorization: Bearer {accessToken}
Content-Type: application/json

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

#### Get All Users (SUPER_ADMIN, ADMIN, MANAGER only)
```
GET /api/v1/users?page=1&limit=10&role=ADMIN&status=ACTIVE&search=john
Authorization: Bearer {accessToken}
```

#### Get User by ID (SUPER_ADMIN, ADMIN, MANAGER, OPERATOR)
```
GET /api/v1/users/{id}
Authorization: Bearer {accessToken}
```

#### Update User (SUPER_ADMIN, ADMIN only)
```
PATCH /api/v1/users/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith Updated",
  "status": "ACTIVE"
}
```

#### Update User Status (SUPER_ADMIN, ADMIN only)
```
PATCH /api/v1/users/{id}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

#### Delete User (SUPER_ADMIN only)
```
DELETE /api/v1/users/{id}
Authorization: Bearer {accessToken}
```

#### Get User Statistics (SUPER_ADMIN, ADMIN, MANAGER only)
```
GET /api/v1/users/statistics
Authorization: Bearer {accessToken}

Response:
{
  "total": 100,
  "active": 80,
  "inactive": 10,
  "suspended": 5,
  "pending": 5
}
```

## Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRATION=7d
```

## Initial Setup

### 1. Run Database Migrations (Production)

```bash
npm run migration:run
```

### 2. Create Admin User

Run the seed script to create an initial admin user:

```bash
npm run ts-node src/database/seeds/create-admin-user.seed.ts
```

Default admin credentials:
- Email: `admin@ucg.com`
- Password: `Admin@123`

**IMPORTANT:** Change this password immediately after first login!

## Security Features

### Password Hashing
- Passwords are hashed using bcrypt with salt rounds of 10
- Passwords are automatically hashed on insert and update via entity hooks

### JWT Tokens
- Access tokens expire in 15 minutes (configurable)
- Refresh tokens expire in 7 days (configurable)
- Tokens include user ID, email, and role in payload

### Global Guards
The system uses global JWT and Roles guards:
- All routes require authentication by default
- Use `@Public()` decorator for public routes
- Use `@Roles(UserRole.ADMIN)` decorator to restrict access by role

### Example: Protecting Routes

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { Roles } from './modules/auth/decorators/roles.decorator';
import { Public } from './modules/auth/decorators/public.decorator';
import { CurrentUser } from './modules/auth/decorators/current-user.decorator';
import { UserRole } from './modules/user/entities/user.entity';

@Controller('example')
export class ExampleController {
  // Public route - no authentication required
  @Public()
  @Get('public')
  getPublicData() {
    return { message: 'This is public' };
  }

  // Protected route - authentication required
  @Get('protected')
  getProtectedData(@CurrentUser() user) {
    return { message: 'This is protected', user };
  }

  // Role-based route - only ADMIN and SUPER_ADMIN can access
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin')
  getAdminData() {
    return { message: 'Admin only' };
  }
}
```

## Testing with Postman/Thunder Client

1. **Register or Login** to get access token
2. **Add Authorization Header** to all protected requests:
   ```
   Authorization: Bearer {your-access-token}
   ```
3. **Test different roles** by creating users with different roles
4. **Test refresh token** when access token expires

## Best Practices

1. **Always use HTTPS** in production
2. **Change default credentials** immediately
3. **Use strong passwords** (minimum 8 characters with uppercase, lowercase, numbers, and special characters)
4. **Implement rate limiting** on authentication endpoints
5. **Log authentication attempts** for security monitoring
6. **Regularly rotate JWT secrets**
7. **Implement password reset** functionality for users who forget passwords
8. **Use refresh token rotation** for enhanced security
9. **Implement account lockout** after multiple failed login attempts
10. **Add email verification** before activating new user accounts

## Troubleshooting

### Common Issues

**Issue: "User account is not active"**
- Solution: Update user status to ACTIVE using the update user status endpoint

**Issue: "Invalid credentials"**
- Solution: Verify email and password are correct

**Issue: "Insufficient permissions"**
- Solution: Check if user has the required role for the endpoint

**Issue: "Invalid token"**
- Solution: Token may have expired, use refresh token to get new access token

## Future Enhancements

Consider implementing:
- [ ] Email verification
- [ ] Password reset via email
- [ ] Two-factor authentication (2FA)
- [ ] OAuth2 integration (Google, Facebook)
- [ ] Account lockout after failed attempts
- [ ] Password history to prevent reuse
- [ ] Session management
- [ ] Audit logs for user actions
- [ ] IP whitelisting
- [ ] Device management

## File Structure

```
src/
├── modules/
│   ├── auth/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── dto/
│   │   │   ├── auth-response.dto.ts
│   │   │   ├── change-password.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   └── reset-password.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── local-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   └── user/
│       ├── dto/
│       │   ├── create-user.dto.ts
│       │   ├── query-user.dto.ts
│       │   ├── update-user.dto.ts
│       │   └── user-response.dto.ts
│       ├── entities/
│       │   └── user.entity.ts
│       ├── user.controller.ts
│       ├── user.module.ts
│       └── user.service.ts
└── database/
    ├── migrations/
    │   └── 1700000000000-CreateUserTable.ts
    └── seeds/
        └── create-admin-user.seed.ts
```

## Support

For issues or questions, please contact the development team or create an issue in the project repository.
