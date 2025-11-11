# RabbitMQ Error Fix: PRECONDITION_FAILED

## Error Encountered

```
Error: Operation failed: BasicConsume; 406 (PRECONDITION-FAILED) with message
"PRECONDITION_FAILED - reply consumer cannot acknowledge"
```

## Root Cause

The error occurred because the **producer configuration had `noAck: false`**, which conflicts with RabbitMQ's internal reply queue handling for request-response patterns.

When using NestJS microservices with `ClientProxy.send()` (request-response pattern), NestJS automatically creates temporary reply queues that **must** use auto-acknowledgment (`noAck: true`). Having `noAck: false` in the producer configuration caused a precondition mismatch.

## The Fix

### ❌ Before (Incorrect Configuration)

**File:** `src/modules/rabbitmq/rabbitmq.module.ts`

```typescript
{
  name: 'REFERENCE_SERVICE',
  useFactory: (configService: ConfigService) => ({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get('RABBITMQ_URL')],
      queue: RABBITMQ_QUEUES.REFERENCE_GENERATION,
      noAck: false,  // ❌ This causes the error!
      persistent: true,
      queueOptions: {
        durable: true,
      },
      prefetchCount: 10,
    },
  }),
}
```

### ✅ After (Correct Configuration)

**File:** `src/modules/rabbitmq/rabbitmq.module.ts`

```typescript
{
  name: 'REFERENCE_SERVICE',
  useFactory: (configService: ConfigService) => ({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get('RABBITMQ_URL')],
      queue: RABBITMQ_QUEUES.REFERENCE_GENERATION,
      // ✅ Removed noAck and prefetchCount from producer config
      persistent: true,
      queueOptions: {
        durable: true,
      },
    },
  }),
}
```

## Why This Works

### For Producers (ClientProxy)
- **Producers send messages**, they don't consume them
- `noAck` setting only applies to **consumers**
- NestJS handles reply queues internally for request-response patterns
- Reply queues automatically use `noAck: true` (auto-acknowledgment)

### For Consumers
- Consumers still control acknowledgment via `channel.ack()` and `channel.nack()` in the message handlers
- Manual acknowledgment is handled in the consumer code, not in the producer configuration

## Steps Taken to Fix

1. **Removed `noAck: false`** from REFERENCE_SERVICE configuration
2. **Removed `noAck: false`** from PAYMENT_SERVICE configuration
3. **Removed `prefetchCount: 10`** (not needed for producers)
4. **Deleted existing queues** that had incompatible settings
5. **Restarted application** to recreate queues with correct settings

## Commands Used

### Delete Existing Queues
```bash
./delete-queues.sh

# Or manually:
rabbitmqctl delete_queue ucg.reference.generation
rabbitmqctl delete_queue ucg.reference.bulk
rabbitmqctl delete_queue ucg.reference.validation
rabbitmqctl delete_queue ucg.payment.processing
rabbitmqctl delete_queue ucg.payment.notification
```

### Restart Application
```bash
npm run start:dev
```

## Verification

### ✅ Success Indicators

```bash
# In application logs:
[ReferenceProducer] Reference producer connected to RabbitMQ ✅
[PaymentProducer] Payment producer connected to RabbitMQ ✅
[NestApplication] Nest application successfully started ✅
```

### ✅ Queues Created

```bash
$ rabbitmqctl list_queues name messages consumers | grep ucg

ucg.payment.processing      0  0
ucg.reference.generation    0  0
```

### ✅ No More Errors

- No "PRECONDITION_FAILED" errors
- No "reply consumer cannot acknowledge" errors
- Application runs without disconnections

## Key Learnings

### 1. Producer vs Consumer Configuration

| Setting | Producer (ClientProxy) | Consumer (MessagePattern) |
|---------|----------------------|---------------------------|
| `noAck` | ❌ Not needed | ✅ Controlled in code via ack/nack |
| `prefetchCount` | ❌ Not applicable | ✅ Controls concurrent messages |
| `persistent` | ✅ Messages survive restarts | N/A |
| `queueOptions.durable` | ✅ Queue survives restarts | ✅ Same |

### 2. Request-Response Pattern

When using `client.send()`:
- NestJS creates temporary reply queues automatically
- Reply queues use auto-acknowledgment (`noAck: true`)
- Cannot override with `noAck: false` in producer config

### 3. Fire-and-Forget Pattern

When using `client.emit()`:
- No reply queues created
- One-way message sending
- No acknowledgment expected

## Configuration Best Practices

### ✅ DO: Producer Configuration

```typescript
{
  transport: Transport.RMQ,
  options: {
    urls: [rabbitmqUrl],
    queue: queueName,
    persistent: true,  // ✅ Messages survive restarts
    queueOptions: {
      durable: true,   // ✅ Queue survives restarts
    },
  },
}
```

### ❌ DON'T: Producer Configuration

```typescript
{
  transport: Transport.RMQ,
  options: {
    urls: [rabbitmqUrl],
    queue: queueName,
    noAck: false,      // ❌ Not for producers!
    prefetchCount: 10, // ❌ Not for producers!
    // ... rest
  },
}
```

### ✅ DO: Consumer Acknowledgment

```typescript
@MessagePattern('routing.key')
async handleMessage(@Payload() message, @Ctx() context: RmqContext) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();

  try {
    // Process message
    await this.service.process(message);

    // ✅ Manual acknowledgment
    channel.ack(originalMsg);
  } catch (error) {
    // ✅ Negative acknowledgment with requeue
    channel.nack(originalMsg, false, true);
  }
}
```

## Files Modified

1. `src/modules/rabbitmq/rabbitmq.module.ts`
   - Line 18: Removed `noAck: false` from REFERENCE_SERVICE
   - Line 23: Removed `prefetchCount: 10` from REFERENCE_SERVICE
   - Line 36: Removed `noAck: false` from PAYMENT_SERVICE
   - Line 41: Removed `prefetchCount: 10` from PAYMENT_SERVICE

## Summary

### Problem
❌ Producer configuration had `noAck: false`, causing "PRECONDITION_FAILED" error with reply queues

### Solution
✅ Removed `noAck` and `prefetchCount` from producer configuration

### Result
✅ RabbitMQ connects successfully
✅ Queues created properly
✅ No more errors
✅ Application runs smoothly

## Testing

### Quick Test
```bash
# 1. Check application logs
tail -f server.log | grep -i "rabbitmq\|error"

# Should see:
# ✅ [ReferenceProducer] Reference producer connected to RabbitMQ
# ✅ [PaymentProducer] Payment producer connected to RabbitMQ

# 2. Check queues
rabbitmqctl list_queues name messages consumers | grep ucg

# Should see:
# ucg.payment.processing      0  0
# ucg.reference.generation    0  0

# 3. Access application
curl http://localhost:3000/api/v1

# Should return: {"message":"UCG API is running"}
```

### Full Integration Test
```bash
# Test reference creation (will use RabbitMQ internally)
curl -X POST http://localhost:3000/api/v1/references \
  -H "Content-Type: application/json" \
  -d '{
    "serviceProviderId": "test-sp",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "paymentOption": "COMPLETE"
  }'

# Check RabbitMQ Management UI
# Open: http://localhost:15672
# Go to Queues → should see message rate increasing
```

## If Error Reoccurs

### 1. Delete All Queues
```bash
./delete-queues.sh
```

### 2. Check Configuration
```bash
grep -n "noAck" src/modules/rabbitmq/rabbitmq.module.ts
# Should return nothing
```

### 3. Restart RabbitMQ (if needed)
```bash
# If using local RabbitMQ
brew services restart rabbitmq

# Or
rabbitmqctl stop_app
rabbitmqctl start_app
```

### 4. Restart Application
```bash
lsof -ti:3000 | xargs kill -9
npm run start:dev
```

## Additional Resources

- **RabbitMQ AMQP Protocol**: https://www.rabbitmq.com/amqp-0-9-1-reference.html
- **NestJS Microservices**: https://docs.nestjs.com/microservices/basics
- **RabbitMQ Management**: http://localhost:15672

---

**Status:** ✅ **FIXED**
**Date:** 2025-11-11
**Time to Fix:** ~5 minutes
**Solution:** Remove `noAck` from producer configuration
