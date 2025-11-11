# RabbitMQ Automatic Queue & Routing Setup

## ✅ NO Manual Setup Required!

Everything is **100% automatic**. Queues, routing, and bindings are all created automatically when your application starts.

## How It Works

### 1. Queues Are Created Automatically

When your application starts and connects to RabbitMQ, **NestJS automatically creates all queues** based on your configuration.

#### Configuration Location: `src/modules/rabbitmq/rabbitmq.module.ts`

```typescript
// Line 17 - REFERENCE_SERVICE queue
queue: RABBITMQ_QUEUES.REFERENCE_GENERATION,  // ← Auto-creates 'ucg.reference.generation'
queueOptions: {
  durable: true,  // ← Queue survives RabbitMQ restart
},

// Line 35 - PAYMENT_SERVICE queue
queue: RABBITMQ_QUEUES.PAYMENT_PROCESSING,  // ← Auto-creates 'ucg.payment.processing'
queueOptions: {
  durable: true,
},
```

**What happens:**
1. Application starts
2. NestJS connects to RabbitMQ
3. NestJS checks if queue exists
4. If not, creates queue with specified options
5. Queue is ready to use!

### 2. Routing Is Handled Automatically

When consumers use `@MessagePattern`, **NestJS automatically handles routing** from messages to handler methods.

#### Example: `src/modules/reference/reference.consumer.ts`

```typescript
// Line 23 - Automatically routes 'reference.create' messages to this method
@MessagePattern(RABBITMQ_ROUTING_KEYS.REFERENCE_CREATE)
async handleReferenceCreation(message: CreateReferenceMessage) {
  // This method automatically receives messages with routing key 'reference.create'
}

// Line 85 - Automatically routes 'reference.bulk' messages to this method
@MessagePattern(RABBITMQ_ROUTING_KEYS.REFERENCE_BULK)
async handleBulkReferenceGeneration(message: BulkReferenceMessage) {
  // This method automatically receives messages with routing key 'reference.bulk'
}

// Line 162 - Automatically routes 'reference.validate' messages to this method
@MessagePattern(RABBITMQ_ROUTING_KEYS.REFERENCE_VALIDATE)
async handleReferenceValidation(message: ValidateReferenceMessage) {
  // This method automatically receives messages with routing key 'reference.validate'
}
```

**What happens:**
1. Producer sends message with routing key `'reference.create'`
2. RabbitMQ routes message to correct queue
3. NestJS consumer receives message
4. `@MessagePattern` decorator automatically calls correct handler method
5. Your code processes the message!

### 3. All Queues Created on Startup

When you start your application, **5 queues are automatically created**:

| Queue Name | Created By | Purpose |
|------------|-----------|---------|
| `ucg.reference.generation` | `REFERENCE_SERVICE` client | Single reference creation |
| `ucg.reference.bulk` | Consumers with @MessagePattern | Bulk reference generation |
| `ucg.reference.validation` | Consumers with @MessagePattern | Reference validation |
| `ucg.payment.processing` | `PAYMENT_SERVICE` client | Payment processing |
| `ucg.payment.notification` | Consumers with @MessagePattern | Payment notifications |

## Complete Automatic Setup Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Start Application                                   │
│   npm run start:dev                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: NestJS Initializes RabbitmqModule                   │
│   - Reads RABBITMQ_URL from .env                            │
│   - Creates REFERENCE_SERVICE client                         │
│   - Creates PAYMENT_SERVICE client                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Clients Connect to RabbitMQ                         │
│   - Connect to amqp://admin:admin123@localhost:5672         │
│   - Connection successful                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Queues Auto-Created (if not exist)                  │
│   ✅ ucg.reference.generation (durable)                     │
│   ✅ ucg.payment.processing (durable)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Consumers Register with @MessagePattern             │
│   ✅ reference.create → handleReferenceCreation()           │
│   ✅ reference.bulk → handleBulkReferenceGeneration()       │
│   ✅ reference.validate → handleReferenceValidation()       │
│   ✅ payment.process → handlePaymentProcessing()            │
│   ✅ payment.notify → handlePaymentNotification()           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Additional Queues Auto-Created by Consumers         │
│   (NestJS creates queue for each @MessagePattern)           │
│   ✅ ucg.reference.bulk (durable)                           │
│   ✅ ucg.reference.validation (durable)                     │
│   ✅ ucg.payment.notification (durable)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: System Ready!                                        │
│   [ReferenceProducer] Reference producer connected to RabbitMQ│
│   [PaymentProducer] Payment producer connected to RabbitMQ   │
│   ✅ All queues created                                     │
│   ✅ All routing configured                                 │
│   ✅ All consumers listening                                │
└─────────────────────────────────────────────────────────────┘
```

## What You Need to Do

### 1. Start RabbitMQ (Only Once)

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin123 \
  rabbitmq:3-management
```

### 2. Start Your Application

```bash
npm run start:dev
```

### 3. That's It! ✅

Everything else is automatic!

## Verification

### Check 1: Application Logs

```bash
# Look for these messages:
[ReferenceProducer] Reference producer connected to RabbitMQ ✅
[PaymentProducer] Payment producer connected to RabbitMQ ✅
```

### Check 2: RabbitMQ Management UI

1. Open http://localhost:15672
2. Login: `admin` / `admin123`
3. Click **Queues** tab
4. You should see **5 queues automatically created**:

```
✅ ucg.reference.generation    (1 consumer, ready for messages)
✅ ucg.reference.bulk          (1 consumer, ready for messages)
✅ ucg.reference.validation    (1 consumer, ready for messages)
✅ ucg.payment.processing      (1 consumer, ready for messages)
✅ ucg.payment.notification    (1 consumer, ready for messages)
```

### Check 3: Test Message Flow

```bash
# Send a test message (via your API)
curl -X POST http://localhost:3000/api/v1/references \
  -H "Content-Type: application/json" \
  -d '{
    "serviceProviderId": "test-sp",
    "customerName": "John Doe",
    "customerPhone": "+255712345678",
    "amount": 50000,
    "paymentOption": "COMPLETE"
  }'

# Check RabbitMQ UI:
# - Go to "Queues" tab
# - Click on "ucg.reference.generation"
# - You'll see message rate increase
# - Message is processed automatically
# - Queue returns to 0 messages (message consumed)
```

## Queue Properties (All Automatic)

Every queue is created with these properties:

| Property | Value | What It Means |
|----------|-------|---------------|
| **Durable** | `true` | Queue survives RabbitMQ restart |
| **Persistent** | `true` | Messages written to disk |
| **Auto-delete** | `false` | Queue remains even if no consumers |
| **Exclusive** | `false` | Multiple consumers allowed |
| **Prefetch** | `10` | Process 10 messages at a time |
| **No-Ack** | `false` | Manual acknowledgment (for reliability) |

## Routing Keys (All Automatic)

Routing is handled automatically by `@MessagePattern`:

| Routing Key | Queue | Handler Method |
|-------------|-------|----------------|
| `reference.create` | ucg.reference.generation | `handleReferenceCreation()` |
| `reference.bulk` | ucg.reference.bulk | `handleBulkReferenceGeneration()` |
| `reference.validate` | ucg.reference.validation | `handleReferenceValidation()` |
| `payment.process` | ucg.payment.processing | `handlePaymentProcessing()` |
| `payment.notify` | ucg.payment.notification | `handlePaymentNotification()` |

## What NestJS Does For You

### ✅ Automatic Queue Creation
```typescript
// You write this:
queue: 'ucg.reference.generation',

// NestJS does this automatically:
channel.assertQueue('ucg.reference.generation', {
  durable: true,
  arguments: { 'x-message-ttl': 86400000 }
});
```

### ✅ Automatic Message Routing
```typescript
// You write this:
@MessagePattern('reference.create')
async handleReferenceCreation(message) { ... }

// NestJS does this automatically:
channel.consume('ucg.reference.generation', (msg) => {
  if (msg.properties.headers['x-routing-key'] === 'reference.create') {
    this.handleReferenceCreation(JSON.parse(msg.content));
  }
});
```

### ✅ Automatic Connection Management
```typescript
// You write this:
urls: [configService.get('RABBITMQ_URL')]

// NestJS does this automatically:
const connection = await amqp.connect(url);
const channel = await connection.createChannel();
// Handles reconnection on failure
// Manages connection pooling
// Closes gracefully on shutdown
```

## When Queues Are Created

### On First Application Start
```bash
npm run start:dev

# Output:
[NestApplication] Nest application successfully started
[ReferenceProducer] Reference producer connected to RabbitMQ
[PaymentProducer] Payment producer connected to RabbitMQ

# Behind the scenes:
# ✅ Connected to RabbitMQ
# ✅ Created 5 queues (if they don't exist)
# ✅ Registered 5 consumers
# ✅ Set up routing
```

### On Subsequent Starts
```bash
npm run start:dev

# NestJS checks:
# - Does queue exist? YES → Use existing queue
# - Does consumer exist? NO → Register new consumer
# - Queues already configured, just connect!
```

### After Queue Deletion
```bash
# If you manually delete a queue in RabbitMQ UI:
docker exec rabbitmq rabbitmqctl delete_queue ucg.reference.generation

# Then restart your application:
npm run start:dev

# NestJS automatically:
# ✅ Detects queue is missing
# ✅ Recreates queue
# ✅ Restores all configuration
# ✅ Registers consumers again
```

## Manual Operations (Optional - Not Required!)

You **don't need** to do any of this, but here's how you *could* manually manage queues if needed:

### Manual Queue Creation (Not Needed!)

```bash
# Access RabbitMQ container
docker exec -it rabbitmq bash

# Manually create queue (your app does this automatically!)
rabbitmqadmin declare queue name=ucg.reference.generation durable=true

# Exit
exit
```

### Manual Queue Inspection

```bash
# List all queues
docker exec rabbitmq rabbitmqctl list_queues name messages consumers

# Output:
# ucg.reference.generation    0    1
# ucg.reference.bulk          0    1
# ucg.reference.validation    0    1
# ucg.payment.processing      0    1
# ucg.payment.notification    0    1
```

### Manual Queue Deletion

```bash
# Delete queue (will be recreated automatically on app restart)
docker exec rabbitmq rabbitmqctl delete_queue ucg.reference.generation
```

## Troubleshooting

### Issue: Queues Not Appearing

**Check:**
```bash
# 1. Is RabbitMQ running?
docker ps | grep rabbitmq

# 2. Is application connected?
tail -f server.log | grep -i "connected to rabbitmq"

# 3. Are consumers registered?
# Check app.module.ts includes RabbitmqModule
# Check reference.module.ts includes ReferenceConsumer
# Check payment.module.ts includes PaymentConsumer
```

### Issue: Messages Not Being Consumed

**Check:**
```bash
# In RabbitMQ UI:
# 1. Go to Queues tab
# 2. Check "Consumers" column shows "1" or more
# 3. If "0", consumers didn't register
# 4. Check application logs for errors
```

### Issue: Permission Denied

**Solution:**
```bash
# Grant permissions to RabbitMQ user
docker exec rabbitmq rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"

# Restart application
npm run start:dev
```

## Summary

### What's Automatic ✅
- ✅ Queue creation (5 queues)
- ✅ Queue configuration (durable, persistent, etc.)
- ✅ Routing setup (routing keys to handlers)
- ✅ Consumer registration (5 consumers)
- ✅ Connection management
- ✅ Reconnection on failure
- ✅ Message acknowledgment
- ✅ Error handling and retry

### What You Do 🔧
- 🔧 Start RabbitMQ once
- 🔧 Configure .env with RABBITMQ_URL
- 🔧 Start your application
- 🔧 Use your API endpoints

### What You DON'T Need to Do ❌
- ❌ Create queues manually
- ❌ Configure routing manually
- ❌ Set up bindings manually
- ❌ Register consumers manually
- ❌ Manage connections manually
- ❌ Handle reconnections manually

---

**Everything is automatic!** Just start RabbitMQ, start your app, and everything works. 🚀

**To verify it's working:**
1. Start RabbitMQ: `docker start rabbitmq`
2. Start app: `npm run start:dev`
3. Open UI: http://localhost:15672
4. Check Queues tab: Should see 5 queues ✅
5. Check Connections tab: Should see your app connected ✅

**It just works!** No manual setup required.
