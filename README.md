# UCG Backend - Unified Collection Gateway

Backend API for the Unified Collection Gateway (UCG) system. This is a NestJS monolithic application handling service provider onboarding, payment collection, routing, and settlement.

## Features Implemented

### Service Provider Onboarding Module
- ✅ Service provider registration with nested structure
- ✅ Automatic SP code generation (3-character unique code)
- ✅ **Normalized database design** (4 related tables)
- ✅ Contact person management
- ✅ Multiple bank accounts support
- ✅ Settlement and API configuration
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

**Request** (with normalized nested structure):
```bash
curl -X POST http://localhost:3000/api/v1/service-providers \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Mwanga Primary School",
    "businessType": "SCHOOL",
    "registrationNumber": "BN123456789",
    "tinNumber": "123-456-789",
    "email": "info@mwangaschool.co.tz",
    "phoneNumber": "+255712345678",
    "region": "Dar es Salaam",
    "district": "Kinondoni",
    "physicalAddress": "Plot 123, Uhuru Street",

    "contact": {
      "fullName": "John Doe",
      "phoneNumber": "+255712345678",
      "email": "john@mwangaschool.co.tz",
      "idNumber": "19901231-12345-67890-12",
      "position": "Head Teacher"
    },

    "bankAccounts": [
      {
        "bankName": "CRDB Bank",
        "accountNumber": "0150123456789",
        "accountName": "Mwanga Primary School",
        "swiftCode": "CORUTZTZ",
        "branchName": "Kinondoni Branch",
        "accountType": "CURRENT",
        "isPrimary": true
      }
    ],

    "settings": {
      "commissionRate": 2.5,
      "settlementFrequency": "DAILY",
      "autoSettlement": true,
      "minimumSettlementAmount": 10000,
      "webhookUrl": "https://mwangaschool.co.tz/webhook",
      "webhookEnabled": true,
      "emailNotifications": true,
      "smsNotifications": true,
      "dailyTransactionLimit": 5000000
    }
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
  "phoneNumber": "+255712345678",
  "status": "PENDING",
  "nidaVerified": false,
  "brelaVerified": false,
  "traVerified": false,
  "isActive": false,

  "contact": {
    "id": "contact-uuid",
    "fullName": "John Doe",
    "phoneNumber": "+255712345678",
    "email": "john@mwangaschool.co.tz",
    "position": "Head Teacher"
  },

  "bankAccounts": [
    {
      "id": "bank-uuid",
      "bankName": "CRDB Bank",
      "accountNumber": "0150123456789",
      "accountName": "Mwanga Primary School",
      "isPrimary": true,
      "isActive": true
    }
  ],

  "settings": {
    "id": "settings-uuid",
    "commissionRate": 2.5,
    "settlementFrequency": "DAILY",
    "autoSettlement": true,
    "minimumSettlementAmount": 10000,
    "webhookEnabled": true,
    "apiEnabled": true
  },

  "createdAt": "2025-11-06T10:00:00.000Z",
  "updatedAt": "2025-11-06T10:00:00.000Z"
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

The database follows a **normalized structure** with 4 related tables:

1. **service_providers** - Core business information
2. **service_provider_contacts** - Contact person details (1:1)
3. **service_provider_bank_accounts** - Bank account details (1:N, supports multiple accounts)
4. **service_provider_settings** - Settlement and API configuration (1:1)

**For detailed schema documentation, see:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

### Quick Overview

```
service_providers (Main)
├── contact (1:1) → service_provider_contacts
├── bankAccounts (1:N) → service_provider_bank_accounts
└── settings (1:1) → service_provider_settings
```

**Benefits:**
- ✅ Reduced data redundancy
- ✅ Multiple bank accounts per service provider
- ✅ Improved data integrity with foreign key constraints
- ✅ Better query performance
- ✅ Easier to maintain and extend

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
│   │       │   ├── service-provider-response.dto.ts
│   │       │   ├── contact.dto.ts
│   │       │   ├── bank-account.dto.ts
│   │       │   └── settings.dto.ts
│   │       ├── entities/
│   │       │   ├── service-provider.entity.ts
│   │       │   ├── service-provider-contact.entity.ts
│   │       │   ├── service-provider-bank-account.entity.ts
│   │       │   └── service-provider-settings.entity.ts
│   │       ├── service-provider.controller.ts
│   │       ├── service-provider.service.ts
│   │       └── service-provider.module.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── .env
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
├── README.md
├── DATABASE_SCHEMA.md             # Detailed database documentation
└── SETUP_GUIDE.md                 # Quick setup guide
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
