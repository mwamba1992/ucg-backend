# RabbitMQ Integration Guide

## Overview

The UCG Backend has been integrated with RabbitMQ to enable asynchronous processing of reference generation and payment operations. This integration provides:

- **Scalability**: Process operations without blocking HTTP requests
- **Reliability**: Message persistence and automatic retry on failures
- **Decoupling**: Separate message production from consumption
- **Performance**: Non-blocking operations for better throughput

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │────────>│  Controller  │────────>│   Producer  │
└─────────────┘         └──────────────┘         └──────┬──────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │   RabbitMQ   │
                                                  │    Queue     │
                                                  └──────┬───────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │   Consumer   │
                                                  └──────┬───────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │   Service    │
                                                  └──────────────┘
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
# Or for production with credentials:
# RABBITMQ_URL=amqp://username:password@rabbitmq-host:5672

# Optional: Default queue name (if not using specific queues)
RABBITMQ_QUEUE=ucg_queue
```

### Queue Configuration

All queues are configured in `src/config/rabbitmq.config.ts`:

**Queues:**
- `ucg.reference.generation` - Single reference creation
- `ucg.reference.bulk` - Bulk reference generation
- `ucg.reference.validation` - Reference validation
- `ucg.payment.processing` - Payment processing
- `ucg.payment.notification` - Payment notifications

**Exchanges:**
- `ucg.reference.exchange` - Reference operations
- `ucg.payment.exchange` - Payment operations
- `ucg.dlx` - Dead Letter Exchange (for failed messages)

**Routing Keys:**
- `reference.create` - Create single reference
- `reference.bulk` - Bulk reference generation
- `reference.validate` - Validate reference
- `payment.process` - Process payment
- `payment.notify` - Send payment notification

### Queue Features

All queues are configured with:
- **Durable**: Messages survive RabbitMQ restarts
- **Persistent**: Messages are written to disk
- **Prefetch Count**: 10 (process 10 messages at a time)
- **Message TTL**: 24 hours (messages expire after 1 day)
- **Dead Letter Exchange**: Failed messages go to DLX

## Usage

### Reference Operations

#### 1. Asynchronous Reference Creation

```typescript
// In your controller or service
async createReferenceAsync(createDto: CreateReferenceDto) {
  // Returns immediately with request ID
  // Actual creation happens in background
  return await this.referenceService.createAsync(createDto, true);
}

// Response:
{
  "status": "QUEUED",
  "requestId": "uuid-here",
  "message": "Reference creation queued. Processing will complete shortly."
}
```

#### 2. Synchronous Reference Creation (Default)

```typescript
// Traditional synchronous operation
async createReferenceSync(createDto: CreateReferenceDto) {
  // Waits for completion before returning
  return await this.referenceService.createAsync(createDto, false);
  // OR simply use:
  // return await this.referenceService.create(createDto);
}
```

#### 3. Bulk Reference Generation

```typescript
// Async bulk generation (recommended for large batches)
async bulkGenerateAsync(serviceProviderId: string, bulkDto: BulkGenerateReferenceDto) {
  return await this.referenceService.bulkCreateAsync(serviceProviderId, bulkDto, true);
}

// Response:
{
  "status": "QUEUED",
  "requestId": "uuid-here",
  "totalRequested": 100,
  "message": "Bulk reference generation queued. Processing will complete shortly.",
  "estimatedCompletionTime": "2025-11-11T15:30:00.000Z"
}
```

#### 4. Reference Validation

```typescript
// Async validation (for non-critical paths)
async validateAsync(referenceNumber: string) {
  return await this.referenceService.validateAsync(referenceNumber, true);
}

// Response:
{
  "status": "COMPLETED",
  "requestId": "uuid-here",
  "validation": {
    "valid": true,
    "referenceNumber": "XXX-1234567-ABC",
    "reference": { /* reference details */ },
    "requestId": "uuid-here"
  }
}
```

### Payment Operations

#### 1. Asynchronous Payment Processing

```typescript
// In your payment controller or service
async processPaymentAsync(dto: CreatePaymentDto) {
  // Returns immediately, payment processes in background
  return await this.paymentService.createPaymentAsync(dto, true);
}

// Response:
{
  "status": "QUEUED",
  "requestId": "uuid-here",
  "message": "Payment processing queued. Processing will complete shortly."
}
```

#### 2. Payment Notifications

```typescript
// Send notification asynchronously (after payment success)
async sendNotification(paymentId: string) {
  // Fire-and-forget notification
  return await this.paymentService.sendPaymentNotificationAsync(
    paymentId,
    'WEBHOOK' // or 'EMAIL', 'SMS'
  );
}

// Response:
{
  "status": "QUEUED",
  "requestId": "uuid-here",
  "notificationType": "WEBHOOK",
  "message": "Payment notification (WEBHOOK) queued for delivery."
}
```

## Message Patterns

### 1. Fire-and-Forget (Event Pattern)

Used when you don't need to wait for response:

```typescript
// Producer
this.referenceProducer.emitReferenceCreated(message);

// Returns immediately, no response expected
// Consumer processes message asynchronously
```

**Use cases:**
- Background reference creation
- Bulk operations
- Notification sending
- Logging and auditing

### 2. Request-Response Pattern

Used when you need to wait for processing result:

```typescript
// Producer
const response = await this.referenceProducer.queueReferenceValidation(message);

// Waits for consumer to process and respond
return response;
```

**Use cases:**
- Reference validation (need immediate result)
- Critical operations requiring confirmation
- Operations with timeout requirements

## Error Handling

### Automatic Retry

Consumers automatically retry failed messages using RabbitMQ's negative acknowledgment:

```typescript
try {
  // Process message
  const result = await this.service.process(message);

  // Success - acknowledge
  channel.ack(originalMsg);

  return { success: true, result };
} catch (error) {
  // Failure - negative acknowledge with requeue
  channel.nack(originalMsg, false, true);

  return { success: false, error: error.message };
}
```

**Retry Behavior:**
- Failed messages are automatically requeued
- After max retries (configured in queue), messages go to Dead Letter Exchange
- Manual inspection and reprocessing of DLX messages possible

### Validation Errors vs System Errors

Payment consumer distinguishes between error types:

```typescript
if (isValidationError) {
  // Don't retry validation errors (business logic)
  channel.ack(originalMsg);
  return { success: false, validationError: error.message };
} else {
  // Retry system errors (temporary failures)
  channel.nack(originalMsg, false, true);
  return { success: false, error: error.message };
}
```

**Validation Errors (No Retry):**
- Invalid reference number
- Reference already paid
- Payment amount not allowed
- Reference expired

**System Errors (Retry):**
- Database connection failures
- Network timeouts
- Temporary service unavailability

### Message Timeouts

Producers have configurable timeouts:

```typescript
private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

// Applied to request-response patterns
const response$ = this.client.send(pattern, message)
  .pipe(
    timeout(this.REQUEST_TIMEOUT),
    catchError((error) => {
      this.logger.error(`Timeout: ${error.message}`);
      throw error;
    })
  );
```

## Monitoring

### Producer Lifecycle Events

Producers log connection status:

```typescript
async onModuleInit() {
  await this.referenceClient.connect();
  this.logger.log('Reference producer connected to RabbitMQ');
}

async onModuleDestroy() {
  await this.referenceClient.close();
  this.logger.log('Reference producer disconnected from RabbitMQ');
}
```

### Consumer Logging

Consumers log all operations:

```typescript
this.logger.log(`Processing reference creation for customer: ${message.customerName}`);
this.logger.log(`Successfully created reference: ${reference.referenceNumber}`);
this.logger.error(`Error processing reference creation: ${error.message}`);
```

### Health Checks

Monitor RabbitMQ health:

```bash
# Check queue status
rabbitmqadmin list queues name messages consumers

# Check connections
rabbitmqadmin list connections

# Check if our queues exist
rabbitmqadmin list queues name | grep ucg
```

## Development Setup

### 1. Install RabbitMQ

**Using Docker (Recommended):**

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3-management
```

**Management UI:**
- URL: http://localhost:15672
- Username: admin
- Password: admin123

**Using Homebrew (macOS):**

```bash
brew install rabbitmq
brew services start rabbitmq
```

### 2. Update Environment

```bash
# .env
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

### 3. Start Application

```bash
npm run start:dev
```

Check logs for connection messages:
```
[ReferenceProducer] Reference producer connected to RabbitMQ
[PaymentProducer] Payment producer connected to RabbitMQ
```

## Testing

### Manual Testing with RabbitMQ Management UI

1. Open http://localhost:15672
2. Navigate to "Queues" tab
3. You should see all UCG queues:
   - ucg.reference.generation
   - ucg.reference.bulk
   - ucg.reference.validation
   - ucg.payment.processing
   - ucg.payment.notification

4. Click on a queue to see:
   - Message rate
   - Consumer count
   - Ready messages
   - Unacknowledged messages

### Testing with API Endpoints

```bash
# Test async reference creation
curl -X POST http://localhost:3000/api/v1/references \
  -H "Content-Type: application/json" \
  -d '{
    "serviceProviderId": "uuid-here",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "paymentOption": "COMPLETE"
  }'

# Check queue in RabbitMQ UI to see message processing

# Test async payment processing
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "referenceNumber": "XXX-1234567-ABC",
    "payerName": "Jane Doe",
    "payerPhone": "+255712345678",
    "amountPaid": 50000,
    "paymentChannel": "Bank"
  }'
```

### Load Testing

```bash
# Generate multiple async references
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/v1/references \
    -H "Content-Type: application/json" \
    -d "{
      \"serviceProviderId\": \"test-sp-id\",
      \"customerName\": \"Customer $i\",
      \"customerPhone\": \"+25571234567$i\",
      \"amount\": 10000,
      \"paymentOption\": \"COMPLETE\"
    }" &
done

# Monitor queue processing in RabbitMQ UI
```

## Production Considerations

### 1. RabbitMQ Clustering

For high availability, use RabbitMQ cluster:

```yaml
# docker-compose.yml
version: '3'
services:
  rabbitmq1:
    image: rabbitmq:3-management
    environment:
      - RABBITMQ_ERLANG_COOKIE=secret_cookie
    ports:
      - "5672:5672"
      - "15672:15672"

  rabbitmq2:
    image: rabbitmq:3-management
    environment:
      - RABBITMQ_ERLANG_COOKIE=secret_cookie
    depends_on:
      - rabbitmq1
```

### 2. Message Persistence

Ensure durable queues and persistent messages (already configured):

```typescript
queueOptions: {
  durable: true,  // Queue survives restarts
},
persistent: true, // Messages written to disk
```

### 3. Prefetch Count Tuning

Adjust based on your workload:

```typescript
prefetchCount: 10, // Process 10 messages concurrently

// For heavy operations, reduce:
prefetchCount: 1,

// For light operations, increase:
prefetchCount: 50,
```

### 4. Dead Letter Exchange Monitoring

Set up alerts for DLX messages:

```bash
# Check DLX regularly
rabbitmqadmin list queues name messages | grep dlx

# If messages in DLX, investigate and reprocess
```

### 5. Connection Pooling

Use connection pooling for better performance (already configured with amqp-connection-manager):

```typescript
import { ClientsModule } from '@nestjs/microservices';

ClientsModule.registerAsync([
  {
    name: 'REFERENCE_SERVICE',
    useFactory: (configService: ConfigService) => ({
      transport: Transport.RMQ,
      options: {
        urls: [configService.get('RABBITMQ_URL')],
        // amqp-connection-manager handles connection pooling
      },
    }),
  },
])
```

## Migration Strategy

### Phase 1: Dual Mode (Current)

Both sync and async operations available:

```typescript
// Sync (default - existing behavior)
await this.referenceService.create(dto);

// Async (opt-in - new behavior)
await this.referenceService.createAsync(dto, true);
```

**Benefit:** Zero breaking changes, gradual adoption

### Phase 2: Flag-Based Routing

Add environment variable to control default behavior:

```typescript
// .env
USE_ASYNC_PROCESSING=true

// Service
async create(dto: CreateReferenceDto) {
  const useAsync = this.configService.get('USE_ASYNC_PROCESSING', false);
  return this.createAsync(dto, useAsync);
}
```

### Phase 3: Full Async (Future)

Make async the default, keep sync as fallback:

```typescript
async create(dto: CreateReferenceDto) {
  try {
    return await this.createAsync(dto, true);
  } catch (error) {
    this.logger.warn('Async failed, falling back to sync');
    return await this.createSync(dto);
  }
}
```

## Troubleshooting

### Issue 1: Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5672
```

**Solution:**
- Check RabbitMQ is running: `docker ps | grep rabbitmq`
- Check RABBITMQ_URL in .env
- Restart RabbitMQ: `docker restart rabbitmq`

### Issue 2: Messages Not Being Consumed

**Check:**
1. Consumer registered in module:
   ```typescript
   controllers: [ReferenceConsumer]
   ```

2. Consumer has @MessagePattern decorator:
   ```typescript
   @MessagePattern('reference.create')
   ```

3. Queue has consumers:
   ```bash
   rabbitmqadmin list queues name consumers
   ```

### Issue 3: Messages in DLX

Messages failed after max retries.

**Solution:**
1. Check application logs for errors
2. Inspect DLX messages in management UI
3. Fix underlying issue
4. Manually reprocess or delete bad messages

### Issue 4: Timeout Errors

```
TimeoutError: Timeout has occurred
```

**Solution:**
- Increase REQUEST_TIMEOUT in producer
- Optimize consumer processing
- Check database/network performance

## Files Modified/Created

### New Files
1. `src/config/rabbitmq.config.ts` - RabbitMQ configuration
2. `src/modules/rabbitmq/rabbitmq.module.ts` - RabbitMQ module
3. `src/modules/reference/dto/reference-queue.dto.ts` - Reference message DTOs
4. `src/modules/reference/reference.producer.ts` - Reference producer
5. `src/modules/reference/reference.consumer.ts` - Reference consumer
6. `src/modules/payment/dto/payment-queue.dto.ts` - Payment message DTOs
7. `src/modules/payment/payment.producer.ts` - Payment producer
8. `src/modules/payment/payment.consumer.ts` - Payment consumer

### Modified Files
1. `src/app.module.ts` - Added RabbitmqModule import
2. `src/modules/reference/reference.module.ts` - Added producer and consumer
3. `src/modules/reference/reference.service.ts` - Added async methods
4. `src/modules/payment/payment.module.ts` - Added producer and consumer
5. `src/modules/payment/payment.service.ts` - Added async methods
6. `package.json` - Added @nestjs/microservices, amqplib, amqp-connection-manager

## Summary

The RabbitMQ integration provides:

✅ **Async reference creation** - Non-blocking reference generation
✅ **Async bulk operations** - Handle large batches efficiently
✅ **Async payment processing** - Scalable payment handling
✅ **Automatic retry** - Resilient message processing
✅ **Dead Letter Exchange** - Failed message handling
✅ **Monitoring** - Comprehensive logging and health checks
✅ **Backward compatible** - Existing sync operations still work
✅ **Production ready** - Durable queues, persistent messages

For questions or issues, check the logs or RabbitMQ management UI at http://localhost:15672

---

**Last Updated:** 2025-11-11
**Version:** 1.0.0
