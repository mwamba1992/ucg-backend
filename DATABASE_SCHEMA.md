# UCG Database Schema - Normalized Structure

## Overview

The database has been normalized to follow best practices and avoid large, monolithic tables. The service provider data is split across 4 related tables with proper relationships.

## Entity Relationship Diagram

```
┌─────────────────────────────────┐
│     service_providers           │
│  (Main Entity)                  │
├─────────────────────────────────┤
│ id (PK, UUID)                   │
│ spCode (UNIQUE, 3 chars)        │
│ businessName                    │
│ businessType (ENUM)             │
│ registrationNumber              │
│ tinNumber                       │
│ phoneNumber                     │
│ email (UNIQUE)                  │
│ physicalAddress                 │
│ region                          │
│ district                        │
│ nidaVerified                    │
│ brelaVerified                   │
│ traVerified                     │
│ status (ENUM)                   │
│ rejectionReason                 │
│ approvedAt                      │
│ approvedBy                      │
│ apiKey (UNIQUE)                 │
│ isActive                        │
│ createdAt                       │
│ updatedAt                       │
│ deletedAt                       │
└─────────────────────────────────┘
         │
         │ 1:1
         ├────────────────────────────────┐
         │                                │
         ▼                                ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│ service_provider_contacts│   │ service_provider_settings│
├──────────────────────────┤   ├──────────────────────────┤
│ id (PK, UUID)            │   │ id (PK, UUID)            │
│ serviceProviderId (FK)   │   │ serviceProviderId (FK)   │
│ fullName                 │   │ commissionRate           │
│ phoneNumber              │   │ settlementFrequency      │
│ email                    │   │ autoSettlement           │
│ idNumber (NIDA)          │   │ minimumSettlementAmount  │
│ position                 │   │ webhookUrl               │
│ isPrimary                │   │ webhookEnabled           │
│ createdAt                │   │ webhookSecret            │
│ updatedAt                │   │ emailNotifications       │
└──────────────────────────┘   │ smsNotifications         │
                               │ pushNotifications        │
                               │ dailyTransactionLimit    │
                               │ dailyTransactionCount    │
                               │ apiRateLimit             │
                               │ apiEnabled               │
                               │ createdAt                │
                               │ updatedAt                │
                               └──────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────┐
│ service_provider_bank_accounts  │
├─────────────────────────────────┤
│ id (PK, UUID)                   │
│ serviceProviderId (FK)          │
│ bankName                        │
│ accountNumber                   │
│ accountName                     │
│ swiftCode                       │
│ branchName                      │
│ branchCode                      │
│ accountType                     │
│ isPrimary                       │
│ isActive                        │
│ createdAt                       │
│ updatedAt                       │
└─────────────────────────────────┘
```

## Tables

### 1. service_providers (Main Table)

**Purpose**: Core service provider business information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| spCode | VARCHAR(3) | UNIQUE, NOT NULL | Auto-generated 3-character code |
| businessName | VARCHAR(200) | NOT NULL | Legal business name |
| businessType | ENUM | NOT NULL | SCHOOL, HOSPITAL, CHURCH, SACCO, MFI, NGO, UTILITY, GOVERNMENT, OTHER |
| registrationNumber | VARCHAR(100) | NULL | BRELA registration number |
| tinNumber | VARCHAR(100) | NULL | TRA Tax Identification Number |
| phoneNumber | VARCHAR(15) | NOT NULL | Business phone |
| email | VARCHAR(100) | UNIQUE, NOT NULL | Business email |
| physicalAddress | TEXT | NULL | Physical location |
| region | VARCHAR(100) | NULL | Region in Tanzania |
| district | VARCHAR(100) | NULL | District |
| nidaVerified | BOOLEAN | DEFAULT false | NIDA verification status |
| brelaVerified | BOOLEAN | DEFAULT false | BRELA verification status |
| traVerified | BOOLEAN | DEFAULT false | TRA verification status |
| status | ENUM | DEFAULT 'PENDING' | PENDING, UNDER_REVIEW, KYC_VERIFICATION, APPROVED, REJECTED, SUSPENDED, ACTIVE |
| rejectionReason | TEXT | NULL | Reason if rejected |
| approvedAt | TIMESTAMP | NULL | Approval timestamp |
| approvedBy | UUID | NULL | Admin who approved |
| apiKey | VARCHAR(100) | UNIQUE, NULL | Generated API key for approved SPs |
| isActive | BOOLEAN | DEFAULT false | Active status |
| createdAt | TIMESTAMP | NOT NULL | Record creation time |
| updatedAt | TIMESTAMP | NOT NULL | Last update time |
| deletedAt | TIMESTAMP | NULL | Soft delete timestamp |

**Indexes:**
- `idx_sp_code` on `spCode`
- `idx_sp_email` on `email`
- `idx_sp_status` on `status`

---

### 2. service_provider_contacts (1:1 Relationship)

**Purpose**: Contact person information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| serviceProviderId | UUID | FOREIGN KEY, NOT NULL | References service_providers(id) |
| fullName | VARCHAR(200) | NOT NULL | Contact person full name |
| phoneNumber | VARCHAR(15) | NOT NULL | Contact phone |
| email | VARCHAR(100) | NOT NULL | Contact email |
| idNumber | VARCHAR(100) | NULL | NIDA number |
| position | VARCHAR(100) | NULL | Job title/position |
| isPrimary | BOOLEAN | DEFAULT true | Primary contact flag |
| createdAt | TIMESTAMP | NOT NULL | Record creation time |
| updatedAt | TIMESTAMP | NOT NULL | Last update time |

**Foreign Key:**
- `fk_contact_service_provider` FOREIGN KEY (serviceProviderId) REFERENCES service_providers(id) ON DELETE CASCADE

---

### 3. service_provider_bank_accounts (1:N Relationship)

**Purpose**: Bank account details for settlements (allows multiple accounts)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| serviceProviderId | UUID | FOREIGN KEY, NOT NULL | References service_providers(id) |
| bankName | VARCHAR(100) | NOT NULL | Bank name |
| accountNumber | VARCHAR(50) | NOT NULL | Account number |
| accountName | VARCHAR(100) | NOT NULL | Account holder name |
| swiftCode | VARCHAR(20) | NULL | SWIFT/BIC code |
| branchName | VARCHAR(100) | NULL | Branch name |
| branchCode | VARCHAR(100) | NULL | Branch code |
| accountType | VARCHAR(20) | DEFAULT 'SAVINGS' | SAVINGS, CURRENT, etc. |
| isPrimary | BOOLEAN | DEFAULT false | Primary account for settlements |
| isActive | BOOLEAN | DEFAULT true | Account active status |
| createdAt | TIMESTAMP | NOT NULL | Record creation time |
| updatedAt | TIMESTAMP | NOT NULL | Last update time |

**Foreign Key:**
- `fk_bank_account_service_provider` FOREIGN KEY (serviceProviderId) REFERENCES service_providers(id) ON DELETE CASCADE

**Indexes:**
- `idx_bank_account_sp_id` on `serviceProviderId`

**Business Rule**: Only one account should have `isPrimary = true` per service provider

---

### 4. service_provider_settings (1:1 Relationship)

**Purpose**: Settlement configuration and API settings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| serviceProviderId | UUID | FOREIGN KEY, NOT NULL | References service_providers(id) |
| commissionRate | DECIMAL(5,2) | DEFAULT 0 | Commission percentage (e.g., 2.50) |
| settlementFrequency | ENUM | DEFAULT 'DAILY' | DAILY, WEEKLY, BIWEEKLY, MONTHLY, ON_DEMAND |
| autoSettlement | BOOLEAN | DEFAULT true | Enable automatic settlements |
| minimumSettlementAmount | DECIMAL(15,2) | DEFAULT 0 | Minimum amount before settlement |
| webhookUrl | TEXT | NULL | Webhook notification URL |
| webhookEnabled | BOOLEAN | DEFAULT false | Enable webhook notifications |
| webhookSecret | VARCHAR(100) | NULL | Webhook signature secret |
| emailNotifications | BOOLEAN | DEFAULT true | Enable email notifications |
| smsNotifications | BOOLEAN | DEFAULT true | Enable SMS notifications |
| pushNotifications | BOOLEAN | DEFAULT false | Enable push notifications |
| dailyTransactionLimit | DECIMAL(15,2) | NULL | Daily transaction amount limit |
| dailyTransactionCount | INT | NULL | Daily transaction count limit |
| apiRateLimit | INT | DEFAULT 100 | API requests per minute |
| apiEnabled | BOOLEAN | DEFAULT true | Enable API access |
| createdAt | TIMESTAMP | NOT NULL | Record creation time |
| updatedAt | TIMESTAMP | NOT NULL | Last update time |

**Foreign Key:**
- `fk_settings_service_provider` FOREIGN KEY (serviceProviderId) REFERENCES service_providers(id) ON DELETE CASCADE

---

## API Request Format (Normalized)

### Create Service Provider Request

```json
{
  "businessName": "Mwanga Primary School",
  "businessType": "SCHOOL",
  "registrationNumber": "BN123456789",
  "tinNumber": "123-456-789",
  "phoneNumber": "+255712345678",
  "email": "info@mwangaschool.co.tz",
  "physicalAddress": "Plot 123, Uhuru Street",
  "region": "Dar es Salaam",
  "district": "Kinondoni",

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
    "dailyTransactionLimit": 5000000,
    "apiRateLimit": 100
  }
}
```

### Response Format

```json
{
  "id": "uuid-here",
  "spCode": "MWA",
  "businessName": "Mwanga Primary School",
  "businessType": "SCHOOL",
  "email": "info@mwangaschool.co.tz",
  "status": "PENDING",
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
    "webhookEnabled": true,
    "apiEnabled": true
  },

  "createdAt": "2025-11-06T10:00:00.000Z",
  "updatedAt": "2025-11-06T10:00:00.000Z"
}
```

## Benefits of Normalization

### 1. **Reduced Data Redundancy**
- Contact information stored separately
- Multiple bank accounts without duplicating SP data
- Settings isolated from business data

### 2. **Improved Data Integrity**
- Foreign key constraints ensure referential integrity
- Cascade delete prevents orphaned records
- Each table has a single responsibility

### 3. **Better Query Performance**
- Smaller main table with indexes on key fields
- Can query contacts/bank accounts independently
- Easier to add/remove bank accounts

### 4. **Flexibility**
- Easy to add multiple contacts in the future (change to 1:N)
- Support for multiple bank accounts out of the box
- Settings can be extended without affecting main table

### 5. **Maintenance**
- Easier to understand and maintain
- Clear separation of concerns
- Simpler to add new features

## Migration from Old Structure

If migrating from the old monolithic structure:

```sql
-- Example migration (simplified)
INSERT INTO service_provider_contacts (id, serviceProviderId, fullName, phoneNumber, email, idNumber)
SELECT
  gen_random_uuid(),
  id,
  contactPersonName,
  contactPersonPhone,
  contactPersonEmail,
  contactPersonIdNumber
FROM old_service_providers;

INSERT INTO service_provider_bank_accounts (id, serviceProviderId, bankName, accountNumber, accountName, swiftCode, isPrimary)
SELECT
  gen_random_uuid(),
  id,
  bankName,
  bankAccountNumber,
  bankAccountName,
  bankSwiftCode,
  true
FROM old_service_providers
WHERE bankAccountNumber IS NOT NULL;

INSERT INTO service_provider_settings (id, serviceProviderId, commissionRate, settlementFrequency, autoSettlement, webhookUrl)
SELECT
  gen_random_uuid(),
  id,
  commissionRate,
  settlementFrequency,
  autoSettlement,
  webhookUrl
FROM old_service_providers;
```

## Development Notes

- All entities use UUID primary keys for better scalability
- Timestamps are automatically managed by TypeORM
- Soft delete is implemented on main table only
- Cascade deletes ensure related records are cleaned up
- Eager loading is enabled for related entities (can be optimized later)

---

**Last Updated**: November 6, 2025
**Database**: PostgreSQL 14+
**ORM**: TypeORM
