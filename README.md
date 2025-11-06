# UCG Backend - Unified Collection Gateway

Backend API for the Unified Collection Gateway (UCG) system. This is a NestJS monolithic application handling service provider onboarding, payment collection, routing, and settlement.

## Features Implemented

### Service Provider Onboarding Module
- ✅ Service provider registration
- ✅ Automatic SP code generation (3-character unique code)
- ✅ KYC verification tracking (NIDA, BRELA, TRA)
- ✅ Approval/rejection workflow
- ✅ API key generation for approved providers
- ✅ Filtering and pagination
- ✅ Statistics dashboard

## Tech Stack

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL with TypeORM
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Language**: TypeScript

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation

1. **Clone and navigate to project**
   ```bash
   cd ucg-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your .env file**
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_DATABASE=ucg_db

   # Application
   PORT=3000
   NODE_ENV=development
   ```

5. **Create the database**
   ```bash
   # Using psql
   psql -U postgres
   CREATE DATABASE ucg_db;
   \q
   ```

## Running the Application

### Development mode
```bash
npm run start:dev
```

### Production mode
```bash
npm run build
npm run start:prod
```

## API Documentation

Once the application is running, access the Swagger documentation at:
```
http://localhost:3000/api/docs
```

## API Endpoints

### Service Provider Onboarding

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/service-providers` | Register new service provider |
| GET | `/api/v1/service-providers` | Get all service providers (with filters) |
| GET | `/api/v1/service-providers/statistics` | Get statistics |
| GET | `/api/v1/service-providers/:id` | Get service provider by ID |
| GET | `/api/v1/service-providers/code/:spCode` | Get by SP code |
| PATCH | `/api/v1/service-providers/:id` | Update service provider |
| POST | `/api/v1/service-providers/:id/approve` | Approve onboarding |
| POST | `/api/v1/service-providers/:id/reject` | Reject onboarding |
| PATCH | `/api/v1/service-providers/:id/toggle-activation` | Activate/deactivate |
| DELETE | `/api/v1/service-providers/:id` | Soft delete |

### Example: Register Service Provider

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/service-providers \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Mwanga Primary School",
    "businessType": "SCHOOL",
    "email": "info@mwangaschool.co.tz",
    "phoneNumber": "+255712345678",
    "contactPersonName": "John Doe",
    "contactPersonPhone": "+255712345678",
    "contactPersonEmail": "john@mwangaschool.co.tz",
    "region": "Dar es Salaam",
    "district": "Kinondoni"
  }'
```

**Response:**
```json
{
  "id": "uuid-here",
  "spCode": "MWA",
  "businessName": "Mwanga Primary School",
  "businessType": "SCHOOL",
  "email": "info@mwangaschool.co.tz",
  "status": "PENDING",
  "nidaVerified": false,
  "brelaVerified": false,
  "traVerified": false,
  "isActive": false,
  "createdAt": "2025-11-06T10:00:00.000Z"
}
```

### Query Parameters for Listing

```bash
# Filter by business type
GET /api/v1/service-providers?businessType=SCHOOL

# Filter by status
GET /api/v1/service-providers?status=APPROVED

# Search
GET /api/v1/service-providers?search=mwanga

# Pagination
GET /api/v1/service-providers?page=1&limit=10

# Combined filters
GET /api/v1/service-providers?businessType=SCHOOL&status=APPROVED&page=1&limit=20
```

## Database Schema

### Service Providers Table

```sql
- id (UUID, Primary Key)
- spCode (VARCHAR(3), Unique) - Auto-generated unique code
- businessName (VARCHAR(200))
- businessType (ENUM) - SCHOOL, HOSPITAL, CHURCH, SACCO, MFI, NGO, UTILITY, etc.
- registrationNumber (VARCHAR(100)) - BRELA number
- tinNumber (VARCHAR(100)) - TRA TIN
- phoneNumber (VARCHAR(15))
- email (VARCHAR(100), Unique)
- physicalAddress (TEXT)
- region (VARCHAR(100))
- district (VARCHAR(100))
- contactPersonName (VARCHAR(200))
- contactPersonPhone (VARCHAR(15))
- contactPersonEmail (VARCHAR(100))
- contactPersonIdNumber (VARCHAR(100)) - NIDA
- bankName (VARCHAR(100))
- bankAccountNumber (VARCHAR(50))
- bankAccountName (VARCHAR(100))
- bankSwiftCode (VARCHAR(20))
- commissionRate (DECIMAL(5,2))
- settlementFrequency (VARCHAR(20))
- autoSettlement (BOOLEAN)
- nidaVerified (BOOLEAN)
- brelaVerified (BOOLEAN)
- traVerified (BOOLEAN)
- status (ENUM) - PENDING, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED, ACTIVE
- rejectionReason (TEXT)
- approvedAt (TIMESTAMP)
- approvedBy (UUID)
- apiKey (VARCHAR(100), Unique)
- webhookUrl (TEXT)
- isActive (BOOLEAN)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
- deletedAt (TIMESTAMP)
```

## Project Structure

```
ucg-backend/
├── src/
│   ├── config/
│   │   └── typeorm.config.ts       # Database configuration
│   ├── modules/
│   │   └── service-provider/
│   │       ├── dto/                # Data Transfer Objects
│   │       │   ├── create-service-provider.dto.ts
│   │       │   ├── update-service-provider.dto.ts
│   │       │   ├── query-service-provider.dto.ts
│   │       │   └── service-provider-response.dto.ts
│   │       ├── entities/
│   │       │   └── service-provider.entity.ts
│   │       ├── service-provider.controller.ts
│   │       ├── service-provider.service.ts
│   │       └── service-provider.module.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

## Next Steps

### Upcoming Features
1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control (Admin, SP User)

2. **Reference Management Module**
   - Payment reference generation
   - Reference validation
   - Reference lookup

3. **Transaction Processing Module**
   - Payment initiation
   - Status tracking
   - Webhook notifications

4. **MNO Integration Module**
   - Vodacom M-Pesa adapter
   - Airtel Money adapter
   - Tigo Pesa adapter
   - Halotel & TTCL adapters

5. **Settlement Module**
   - Automated settlement processing
   - Settlement reports

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Contributing

This is an internal project for Mwanga Hakika Bank.

## License

UNLICENSED - Private and confidential
