# RabbitMQ Configuration Guide

## Configuration Locations

### 1. Environment Variables (`.env` file) - **PRIMARY CONFIGURATION**

This is where you set your RabbitMQ credentials and connection URL:

**Location:** `/Users/mwendavano/mwanga/ucg-backend/.env`

```bash
# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672

# For production with authentication:
# RABBITMQ_URL=amqp://username:password@hostname:5672

# Example with Docker default:
# RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

### 2. RabbitMQ Config File (`src/config/rabbitmq.config.ts`)

**Location:** `src/config/rabbitmq.config.ts`

This file reads from environment variables and provides defaults:

```typescript
export const rabbitmqConfig = (): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'], // ← Reads from .env
    queue: process.env.RABBITMQ_QUEUE || 'ucg_queue',
    noAck: false,
    persistent: true,
    queueOptions: {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
        'x-dead-letter-exchange': 'ucg.dlx',
      },
    },
    prefetchCount: 10,
  },
});
```

**What's configured here:**
- Message TTL (Time To Live)
- Dead Letter Exchange
- Queue durability
- Prefetch count
- Message persistence

### 3. RabbitMQ Module (`src/modules/rabbitmq/rabbitmq.module.ts`)

**Location:** `src/modules/rabbitmq/rabbitmq.module.ts`

This module uses NestJS ConfigService to inject the RABBITMQ_URL:

```typescript
ClientsModule.registerAsync([
  {
    name: 'REFERENCE_SERVICE',
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.RMQ,
      options: {
        urls: [
          configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')
          // ↑ Gets RABBITMQ_URL from .env via ConfigService
        ],
        queue: RABBITMQ_QUEUES.REFERENCE_GENERATION,
        // ... other options
      },
    }),
    inject: [ConfigService],
  },
  {
    name: 'PAYMENT_SERVICE',
    // Similar configuration for payment service
  },
])
```

**What happens here:**
- `ConfigService` reads `RABBITMQ_URL` from `.env`
- Falls back to `'amqp://localhost:5672'` if not set
- Creates two RabbitMQ clients: REFERENCE_SERVICE and PAYMENT_SERVICE

## Connection URL Format

### Basic Format
```
amqp://hostname:port
```

### With Authentication
```
amqp://username:password@hostname:port
```

### With Virtual Host
```
amqp://username:password@hostname:port/vhost
```

### Examples

#### Development (No Auth)
```bash
RABBITMQ_URL=amqp://localhost:5672
```

#### Docker with Default Credentials
```bash
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

#### Production with Custom Credentials
```bash
RABBITMQ_URL=amqp://ucg_user:SecurePassword123@rabbitmq.example.com:5672
```

#### Production with Virtual Host
```bash
RABBITMQ_URL=amqp://ucg_user:SecurePassword123@rabbitmq.example.com:5672/ucg_vhost
```

#### Cloud RabbitMQ (CloudAMQP example)
```bash
RABBITMQ_URL=amqps://username:password@shark.rmq.cloudamqp.com/vhost
```

## Configuration by Environment

### Development (`.env`)
```bash
# Local RabbitMQ without authentication
RABBITMQ_URL=amqp://localhost:5672

# Or with Docker
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

### Staging (`.env.staging`)
```bash
# Staging RabbitMQ cluster
RABBITMQ_URL=amqp://staging_user:StagingPass456@rabbitmq-staging.internal:5672/staging
```

### Production (`.env.production`)
```bash
# Production RabbitMQ cluster
RABBITMQ_URL=amqp://prod_user:VerySecurePassword789@rabbitmq-prod.internal:5672/production
```

## Security Best Practices

### 1. Never Commit Credentials
```bash
# .gitignore (should already have this)
.env
.env.local
.env.staging
.env.production
```

### 2. Use Strong Passwords
```bash
# BAD
RABBITMQ_URL=amqp://admin:admin@localhost:5672

# GOOD
RABBITMQ_URL=amqp://ucg_app:K9mP#xL2$vN8@wR4@rabbitmq.internal:5672
```

### 3. Use Environment-Specific Credentials
- Development: `dev_user:dev_password`
- Staging: `staging_user:staging_password`
- Production: `prod_user:prod_password`

### 4. Use Secret Management
For production, consider using secret management tools:

```typescript
// Example with AWS Secrets Manager
const secrets = await secretsManager.getSecretValue({ SecretId: 'rabbitmq-credentials' }).promise();
const rabbitmqUrl = JSON.parse(secrets.SecretString).RABBITMQ_URL;
```

## How to Change Configuration

### Method 1: Update `.env` File (Recommended)

```bash
# Open .env file
nano .env

# Change RABBITMQ_URL
RABBITMQ_URL=amqp://newuser:newpassword@newhost:5672

# Save and restart application
npm run start:dev
```

### Method 2: Environment Variables (Docker/Production)

```bash
# Set environment variable
export RABBITMQ_URL=amqp://user:pass@host:5672

# Or in Docker Compose
services:
  ucg-backend:
    environment:
      - RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
```

### Method 3: Runtime Configuration (Not Recommended)

```typescript
// In code (not recommended - hardcoded credentials)
process.env.RABBITMQ_URL = 'amqp://user:pass@host:5672';
```

## Verifying Configuration

### 1. Check Environment Variable is Loaded

```typescript
// Add to main.ts temporarily
console.log('RABBITMQ_URL:', process.env.RABBITMQ_URL);
```

### 2. Check Application Logs

Look for connection messages:

```bash
tail -f server.log | grep -i rabbitmq

# Should see:
[ReferenceProducer] Reference producer connected to RabbitMQ
[PaymentProducer] Payment producer connected to RabbitMQ
```

### 3. Check RabbitMQ Management UI

1. Open http://localhost:15672
2. Go to "Connections" tab
3. Should see connections from your application

### 4. Test Connection Programmatically

```bash
# Test RabbitMQ connection
curl -u admin:admin123 http://localhost:15672/api/overview
```

## Common Issues

### Issue 1: Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5672
```

**Solutions:**
- Check RabbitMQ is running: `docker ps | grep rabbitmq`
- Verify RABBITMQ_URL in `.env`
- Check port 5672 is accessible: `telnet localhost 5672`

### Issue 2: Authentication Failed
```
Error: ACCESS_REFUSED - Login was refused using authentication mechanism PLAIN
```

**Solutions:**
- Check username and password in RABBITMQ_URL
- Verify credentials in RabbitMQ: `rabbitmqctl list_users`
- Create user if needed:
  ```bash
  docker exec rabbitmq rabbitmqctl add_user ucg_user SecurePass123
  docker exec rabbitmq rabbitmqctl set_permissions -p / ucg_user ".*" ".*" ".*"
  ```

### Issue 3: Environment Variable Not Loaded
```
Using default: amqp://localhost:5672
```

**Solutions:**
- Restart application after changing `.env`
- Check `.env` is in root directory
- Verify ConfigModule is configured in app.module.ts:
  ```typescript
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
  })
  ```

## Current Configuration Summary

### Current Setup (After Integration)

**Environment File:** `.env`
```bash
RABBITMQ_URL=amqp://localhost:5672
```

**Default Fallback:** `amqp://localhost:5672`

**Connection Locations:**
1. **Line 16** in `src/modules/rabbitmq/rabbitmq.module.ts`:
   ```typescript
   urls: [configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')]
   ```

2. **Line 34** in `src/modules/rabbitmq/rabbitmq.module.ts`:
   ```typescript
   urls: [configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672')]
   ```

3. **Line 6** in `src/config/rabbitmq.config.ts`:
   ```typescript
   urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672']
   ```

### Configured Queues (Automatic Creation)

All queues are automatically created on first connection:

1. `ucg.reference.generation`
2. `ucg.reference.bulk`
3. `ucg.reference.validation`
4. `ucg.payment.processing`
5. `ucg.payment.notification`

## Quick Setup for Common Scenarios

### Scenario 1: Local Development (No Auth)

```bash
# .env
RABBITMQ_URL=amqp://localhost:5672

# Start RabbitMQ
docker run -d --name rabbitmq -p 5672:5672 rabbitmq:3
```

### Scenario 2: Local Development (With Auth)

```bash
# .env
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# Start RabbitMQ
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3-management
```

### Scenario 3: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: ucg_user
      RABBITMQ_DEFAULT_PASS: ucg_password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  ucg-backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      RABBITMQ_URL: amqp://ucg_user:ucg_password@rabbitmq:5672
    depends_on:
      - rabbitmq

volumes:
  rabbitmq_data:
```

```bash
# Start everything
docker-compose up -d
```

### Scenario 4: Production Cluster

```bash
# .env.production
RABBITMQ_URL=amqp://prod_user:VerySecurePass@rabbitmq-lb.internal:5672/production

# Multiple nodes (load balanced)
RABBITMQ_NODES=rabbitmq1.internal:5672,rabbitmq2.internal:5672,rabbitmq3.internal:5672
```

## Summary

**To configure RabbitMQ credentials:**

1. ✅ **Update `.env` file** (Primary method)
   ```bash
   RABBITMQ_URL=amqp://username:password@hostname:5672
   ```

2. ✅ **Restart application**
   ```bash
   npm run start:dev
   ```

3. ✅ **Verify connection** in logs or Management UI

**Configuration Flow:**
```
.env file
    ↓
ConfigModule (NestJS)
    ↓
ConfigService
    ↓
RabbitmqModule (useFactory)
    ↓
RabbitMQ Connection
```

**Files Involved:**
- `.env` - Credentials (NEVER commit)
- `src/config/rabbitmq.config.ts` - Configuration options
- `src/modules/rabbitmq/rabbitmq.module.ts` - Module setup

---

**For more details:**
- Full Integration Guide: `RABBITMQ_INTEGRATION.md`
- Quick Start: `RABBITMQ_QUICKSTART.md`
- Implementation Summary: `RABBITMQ_IMPLEMENTATION_SUMMARY.md`
