# Quick Start Guide - User Management

## What Was Implemented

A complete user management and authentication system with:

### Features
- JWT-based authentication (access & refresh tokens)
- Role-based access control (RBAC) with 5 roles
- User CRUD operations
- Password management (change, reset)
- User statistics and reporting
- Global authentication guards
- Email-based login

### User Roles (Hierarchical)
1. **SUPER_ADMIN** - Full system access
2. **ADMIN** - User management and operations
3. **MANAGER** - View and manage specific resources
4. **OPERATOR** - Day-to-day operations
5. **VIEWER** - Read-only access

## Quick Start

### 1. Start the Application
```bash
npm run start:dev
```

The server will start on http://localhost:3000

### 2. Create Initial Admin User

Run the seed script:
```bash
npx ts-node src/database/seeds/create-admin-user.seed.ts
```

**Default Admin Credentials:**
- Email: `admin@ucg.com`
- Password: `Admin@123`

### 3. Test Authentication

#### Register a New User
```bash
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "password": "Password123!",
  "role": "VIEWER"
}
```

#### Login
```bash
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@ucg.com",
  "password": "Admin@123"
}
```

Response will include:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "admin@ucg.com",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "SUPER_ADMIN",
    "status": "ACTIVE"
  }
}
```

### 4. Use Protected Endpoints

Add the access token to all subsequent requests:
```bash
GET http://localhost:3000/api/v1/auth/profile
Authorization: Bearer {your-access-token}
```

## Key Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/profile` - Get current user
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/refresh` - Refresh access token

### User Management (Admin Only)
- `GET /api/v1/users` - List all users (with pagination)
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user by ID
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `GET /api/v1/users/statistics` - Get user statistics

## Environment Variables

Already configured in `.env`:
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRATION=7d
```

## Security Features

✅ Password hashing with bcrypt
✅ JWT tokens with expiration
✅ Refresh token support
✅ Role-based access control
✅ Global authentication guards
✅ Public route decorator for unauthenticated endpoints

## Making Routes Public

By default, all routes require authentication. To make a route public:

```typescript
import { Public } from './modules/auth/decorators/public.decorator';

@Public()
@Get('public-route')
getPublicData() {
  return { message: 'This is public' };
}
```

## Restricting Routes by Role

```typescript
import { Roles } from './modules/auth/decorators/roles.decorator';
import { UserRole } from './modules/user/entities/user.entity';

@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Get('admin-only')
getAdminData() {
  return { message: 'Admin only' };
}
```

## Getting Current User in Controllers

```typescript
import { CurrentUser } from './modules/auth/decorators/current-user.decorator';
import { User } from './modules/user/entities/user.entity';

@Get('my-data')
getMyData(@CurrentUser() user: User) {
  return { userId: user.id, email: user.email };
}
```

## Testing Tips

1. Use the admin account to create other users with different roles
2. Test role-based access by trying endpoints with different user roles
3. Test token expiration by waiting 15 minutes and using refresh token
4. Check user statistics to see overview of all users

## Next Steps

1. Change the default admin password
2. Update JWT secrets in `.env` for production
3. Create users for your team with appropriate roles
4. Integrate authentication with existing modules
5. Consider implementing:
   - Email verification
   - Password reset via email
   - Two-factor authentication
   - Account lockout after failed attempts

## Need Help?

Refer to `USER_MANAGEMENT_README.md` for detailed documentation.

## File Structure

```
src/
├── modules/
│   ├── auth/          # Authentication module
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   └── user/          # User management module
│       ├── dto/
│       └── entities/
└── database/
    ├── migrations/    # Database migrations
    └── seeds/         # Seed scripts
```

Enjoy your new user management system!
