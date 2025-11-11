# RabbitMQ Quick Start Guide

## Installation & Setup

### Option 1: Docker (Recommended)

```bash
# Start RabbitMQ with management UI
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3-management

# Check if running
docker ps | grep rabbitmq
```

### Option 2: Homebrew (macOS)

```bash
# Install
brew install rabbitmq

# Start
brew services start rabbitmq

# Or run in foreground
/opt/homebrew/opt/rabbitmq/sbin/rabbitmq-server
```

### Option 3: Package Manager (Ubuntu/Debian)

```bash
# Install
sudo apt-get install rabbitmq-server

# Start
sudo systemctl start rabbitmq-server

# Enable on boot
sudo systemctl enable rabbitmq-server
```

## Environment Setup

Add to your `.env` file:

```bash
# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672

# Or with Docker credentials:
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

## Starting the Application

```bash
# Install dependencies (if not done)
npm install

# Build
npm run build

# Start in development mode
npm run start:dev

# Or start in production mode
npm run start:prod
```

## Verify Integration

### 1. Check Application Logs

Look for these messages on startup:

```
[ReferenceProducer] Reference producer connected to RabbitMQ
[PaymentProducer] Payment producer connected to RabbitMQ
```

### 2. Check RabbitMQ Management UI

Open http://localhost:15672 (default credentials: admin/admin123)

Navigate to "Queues" tab and verify these queues exist:
- ✅ ucg.reference.generation
- ✅ ucg.reference.bulk
- ✅ ucg.reference.validation
- ✅ ucg.payment.processing
- ✅ ucg.payment.notification

### 3. Test API Endpoints

```bash
# Test async reference creation
curl -X POST http://localhost:3000/api/v1/references \
  -H "Content-Type: application/json" \
  -d '{
    "serviceProviderId": "test-sp-id",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "paymentOption": "COMPLETE"
  }'

# Check the queue in RabbitMQ UI - you should see message rate
```

## Quick API Examples

### Synchronous Operations (Default - No RabbitMQ Required)

```bash
# Create reference (sync)
POST /api/v1/references
{
  "serviceProviderId": "sp-id",
  "customerName": "Jane Doe",
  "customerPhone": "+255712345678",
  "amount": 100000,
  "paymentOption": "COMPLETE"
}

# Response: Reference object with referenceNumber
```

### Asynchronous Operations (Requires RabbitMQ)

To use async operations, modify controllers to call the async methods:

```typescript
// In reference.controller.ts
@Post('async')
async createAsync(@Body() dto: CreateReferenceDto) {
  return this.referenceService.createAsync(dto, true);
}

// Response:
{
  "status": "QUEUED",
  "requestId": "uuid-here",
  "message": "Reference creation queued..."
}
```

## Troubleshooting

### Connection Refused Error

```
Error: connect ECONNREFUSED 127.0.0.1:5672
```

**Solutions:**
1. Start RabbitMQ: `docker start rabbitmq` or `brew services start rabbitmq`
2. Check RABBITMQ_URL in .env matches your setup
3. Verify RabbitMQ is listening: `netstat -an | grep 5672`

### Application Still Works Without RabbitMQ

By design! The integration:
- ✅ Doesn't break existing sync operations
- ⚠️ Async operations will fail if RabbitMQ is down
- 🔧 Use sync operations as fallback

### Producers Not Connecting

Check application logs:

```bash
tail -f server.log | grep -i "rabbitmq\|producer"
```

Look for connection errors or warnings.

## Development Workflow

### Without RabbitMQ (Sync Only)

```bash
# Start app normally
npm run start:dev

# All existing endpoints work
# Async methods fall back to sync or show warnings
```

### With RabbitMQ (Full Features)

```bash
# 1. Start RabbitMQ
docker start rabbitmq

# 2. Start app
npm run start:dev

# 3. Monitor queues
# Open http://localhost:15672

# 4. Test async operations
# Use API endpoints or services directly
```

## Next Steps

1. ✅ RabbitMQ running
2. ✅ Application connected
3. ✅ Queues created
4. 🔧 Add async endpoints to controllers
5. 🔧 Test with load
6. 🔧 Monitor performance
7. 🔧 Configure alerting

## Key Features Enabled

### Reference Module
- ✅ `createAsync()` - Non-blocking reference creation
- ✅ `bulkCreateAsync()` - Efficient bulk generation
- ✅ `validateAsync()` - Async reference validation

### Payment Module
- ✅ `createPaymentAsync()` - Non-blocking payment processing
- ✅ `sendPaymentNotificationAsync()` - Background notifications

## Production Checklist

Before deploying to production:

- [ ] RabbitMQ cluster configured (high availability)
- [ ] Message persistence enabled (already done)
- [ ] Dead Letter Exchange monitoring setup
- [ ] Prefetch count tuned for workload
- [ ] Connection pooling configured (already done)
- [ ] Error alerting configured
- [ ] Backup/recovery plan for messages
- [ ] Load testing completed
- [ ] Rollback plan documented

## Resources

- **RabbitMQ Management UI**: http://localhost:15672
- **Full Documentation**: `RABBITMQ_INTEGRATION.md`
- **API Documentation**: http://localhost:3000/api/docs
- **RabbitMQ Docs**: https://www.rabbitmq.com/documentation.html
- **NestJS Microservices**: https://docs.nestjs.com/microservices/basics

---

**Questions?** Check logs or RabbitMQ management UI for diagnostics.
