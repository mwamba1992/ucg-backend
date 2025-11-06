# UCG Backend - Quick Setup Guide

## Step-by-Step Setup Instructions

### 1. Install Dependencies

```bash
cd ucg-backend
npm install
```

This will install all required packages including:
- NestJS framework
- TypeORM and PostgreSQL driver
- Validation libraries
- Swagger for API documentation

**Note:** This may take 2-3 minutes depending on your internet connection.

### 2. Set Up PostgreSQL Database

#### Option A: Using Docker (Recommended)
```bash
docker run --name ucg-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ucg_db \
  -p 5432:5432 \
  -d postgres:14
```

#### Option B: Using Local PostgreSQL
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ucg_db;

# Exit
\q
```

### 3. Configure Environment Variables

The `.env` file has been created with default values. Update if needed:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres  # Change this!
DB_DATABASE=ucg_db
PORT=3000
```

### 4. Run the Application

```bash
# Development mode with hot-reload
npm run start:dev
```

You should see:
```
🚀 UCG API Server is running!
📝 API Documentation: http://localhost:3000/api/docs
🔗 API Endpoint: http://localhost:3000/api/v1
```

### 5. Test the API

#### Open Swagger Documentation
Visit: http://localhost:3000/api/docs

#### Test Health Check
```bash
curl http://localhost:3000/api/v1
```

Expected response:
```json
{
  "status": "ok",
  "message": "UCG API is running",
  "version": "1.0.0",
  "timestamp": "2025-11-06T..."
}
```

#### Test Service Provider Registration
```bash
curl -X POST http://localhost:3000/api/v1/service-providers \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test School",
    "businessType": "SCHOOL",
    "email": "test@school.co.tz",
    "phoneNumber": "+255712345678",
    "contactPersonName": "John Doe",
    "contactPersonPhone": "+255712345678",
    "contactPersonEmail": "john@school.co.tz"
  }'
```

#### Get All Service Providers
```bash
curl http://localhost:3000/api/v1/service-providers
```

#### Get Statistics
```bash
curl http://localhost:3000/api/v1/service-providers/statistics
```

## Database Schema Auto-Generation

The database tables will be created automatically when you start the application in development mode (synchronize: true).

**Tables created:**
- `service_providers` - Main service provider information

## Common Issues & Solutions

### Issue 1: Port 3000 already in use
```bash
# Change PORT in .env file
PORT=3001
```

### Issue 2: Cannot connect to PostgreSQL
```bash
# Check if PostgreSQL is running
# For Docker:
docker ps

# For local:
pg_isready -U postgres
```

### Issue 3: Database doesn't exist
```bash
# Create it manually
psql -U postgres -c "CREATE DATABASE ucg_db;"
```

## API Testing with Postman

1. Import the Swagger JSON from http://localhost:3000/api/docs-json
2. Or create a new collection with these endpoints:

**Collection: UCG Service Provider APIs**

1. **Register SP** - POST `{{base_url}}/service-providers`
2. **List SPs** - GET `{{base_url}}/service-providers`
3. **Get SP by ID** - GET `{{base_url}}/service-providers/:id`
4. **Get SP by Code** - GET `{{base_url}}/service-providers/code/:spCode`
5. **Update SP** - PATCH `{{base_url}}/service-providers/:id`
6. **Approve SP** - POST `{{base_url}}/service-providers/:id/approve`
7. **Reject SP** - POST `{{base_url}}/service-providers/:id/reject`
8. **Toggle Activation** - PATCH `{{base_url}}/service-providers/:id/toggle-activation`
9. **Statistics** - GET `{{base_url}}/service-providers/statistics`

**Environment Variables:**
- `base_url`: http://localhost:3000/api/v1

## Development Workflow

### 1. Making Changes
- Edit files in `src/` directory
- Changes will auto-reload (watch mode)

### 2. Adding New Modules
```bash
# NestJS CLI (after npm install)
npx nest generate module modules/new-module
npx nest generate controller modules/new-module
npx nest generate service modules/new-module
```

### 3. Database Migrations (Production)
```bash
# Generate migration
npm run migration:generate -- src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## Next Development Steps

1. **Add Authentication**
   - Implement JWT authentication
   - Add guards to protect endpoints
   - Create admin and SP user roles

2. **Add Reference Management**
   - Create reference generation module
   - Implement validation logic

3. **Add Transaction Module**
   - Payment processing
   - Status tracking

4. **Add MNO Integrations**
   - Create adapter pattern
   - Implement MNO-specific logic

## Production Deployment

### Build for Production
```bash
npm run build
```

### Run Production Server
```bash
npm run start:prod
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Set `synchronize=false` in TypeORM config
- Use migrations for database changes
- Use strong JWT_SECRET
- Configure proper database credentials

## Support

For issues or questions, refer to:
- NestJS Documentation: https://docs.nestjs.com
- TypeORM Documentation: https://typeorm.io
- Project README: ./README.md

---

**Created:** November 6, 2025
**Project:** UCG Backend API - Service Provider Onboarding Module
