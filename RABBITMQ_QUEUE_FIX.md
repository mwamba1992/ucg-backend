# RabbitMQ Queue Configuration Fix

## Problem

The application is failing to start with this error:

```
Error: Operation failed: BasicConsume; 406 (PRECONDITION-FAILED)
with message "PRECONDITION_FAILED - reply consumer cannot acknowledge"
```

## Root Cause

The RabbitMQ queues for M-Pesa and TigoPesa were previously created with **`noAck: true`** (automatic acknowledgment), but the application is now trying to consume them with **`noAck: false`** (manual acknowledgment).

RabbitMQ does NOT allow changing queue configuration without deleting and recreating the queue. This is a safety feature to prevent data loss.

## Affected Queues

- `ucg.mpesa.payment.processing`
- `ucg.mpesa.callback`
- `ucg.tigopesa.payment.processing`

## Solution

You must **delete the existing queues** so they can be recreated with the correct configuration.

---

## Fix Methods

### Method 1: Using RabbitMQ Management UI (Recommended - Easiest)

1. **Open RabbitMQ Management UI**
   - Local: http://localhost:15672
   - UAT Server: http://YOUR_SERVER_IP:15672
   - Default credentials: `guest` / `guest`

2. **Navigate to Queues Tab**
   - Click on "Queues" in the top menu

3. **Delete the Queues**
   - Find queue: `ucg.mpesa.payment.processing`
     - Click on the queue name
     - Scroll down and click "Delete" button
     - Confirm deletion

   - Find queue: `ucg.mpesa.callback`
     - Click on the queue name
     - Scroll down and click "Delete" button
     - Confirm deletion

   - Find queue: `ucg.tigopesa.payment.processing`
     - Click on the queue name
     - Scroll down and click "Delete" button
     - Confirm deletion

4. **Restart Your Application**
   ```bash
   pm2 restart ucg-backend
   # OR
   npm run start:dev
   ```

5. **Verify**
   - Check RabbitMQ UI - queues should be recreated automatically
   - Check application logs - no more 406 errors

---

### Method 2: Using Bash Script (Automated)

We've created a script to automate the queue deletion:

```bash
# On UAT Server, set environment variables first
export RABBITMQ_HOST="localhost"        # or your RabbitMQ server IP
export RABBITMQ_PORT="15672"            # Management API port
export RABBITMQ_USER="guest"            # Your RabbitMQ username
export RABBITMQ_PASS="guest"            # Your RabbitMQ password
export RABBITMQ_VHOST="/"               # Virtual host (usually /)

# Run the fix script
./fix-rabbitmq-queues.sh

# Restart application
pm2 restart ucg-backend
```

---

### Method 3: Using rabbitmqadmin CLI

If you have `rabbitmqadmin` installed:

```bash
# Delete M-Pesa queues
rabbitmqadmin delete queue name=ucg.mpesa.payment.processing
rabbitmqadmin delete queue name=ucg.mpesa.callback

# Delete TigoPesa queues
rabbitmqadmin delete queue name=ucg.tigopesa.payment.processing

# Restart application
pm2 restart ucg-backend
```

---

### Method 4: Using curl (Manual API Calls)

```bash
# Set your RabbitMQ details
RABBITMQ_HOST="localhost"
RABBITMQ_PORT="15672"
RABBITMQ_USER="guest"
RABBITMQ_PASS="guest"

# Delete M-Pesa payment processing queue
curl -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
  -X DELETE \
  "http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/queues/%2F/ucg.mpesa.payment.processing"

# Delete M-Pesa callback queue
curl -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
  -X DELETE \
  "http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/queues/%2F/ucg.mpesa.callback"

# Delete TigoPesa payment processing queue
curl -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
  -X DELETE \
  "http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/queues/%2F/ucg.tigopesa.payment.processing"

# Restart application
pm2 restart ucg-backend
```

Note: `%2F` is URL encoding for `/` (the default vhost)

---

## What Happens After Deletion?

1. **Queues are deleted** - All pending messages in these queues will be lost (acceptable since we're fixing a configuration issue)

2. **Application starts successfully** - No more 406 PRECONDITION_FAILED errors

3. **Queues are automatically recreated** - When the application starts, NestJS will automatically create the queues with the correct settings:
   - `noAck: false` (manual acknowledgment)
   - `durable: true` (persistent queues)
   - `prefetchCount: 1` (process one message at a time)
   - Message TTL: 1 hour
   - Priority queuing enabled

---

## Verification Steps

After fixing and restarting:

1. **Check Application Logs**
   ```bash
   pm2 logs ucg-backend
   # OR
   tail -f logs/application.log
   ```

   You should see:
   - `[NestMicroservice] Nest microservice successfully started`
   - No 406 errors
   - All routes mapped successfully

2. **Check RabbitMQ UI**
   - Go to http://YOUR_SERVER:15672
   - Click "Queues" tab
   - Verify these queues exist with correct settings:
     - `ucg.mpesa.payment.processing`
     - `ucg.mpesa.callback`
     - `ucg.tigopesa.payment.processing`

3. **Test M-Pesa Payment**
   ```bash
   curl -X POST http://YOUR_SERVER:8000/api/v1/mpesa/c2b/payment \
     -H "Content-Type: application/xml" \
     -d '<request>...</request>'
   ```

4. **Test TigoPesa Payment**
   ```bash
   curl -X POST http://YOUR_SERVER:8000/api/v1/tigopesa/billpay \
     -H "Content-Type: application/xml" \
     -d '<COMMAND>...</COMMAND>'
   ```

---

## Why This Happened

This issue occurs when:

1. **Development/Testing**: Queues were initially created during development/testing with default settings
2. **Code Update**: Application code was updated to use manual acknowledgment (`noAck: false`)
3. **Configuration Mismatch**: RabbitMQ won't let you consume a queue with different `noAck` settings than it was created with

## Preventing Future Issues

**Best Practice**: Always delete development/test queues before deploying to production with updated configurations.

For production deployments:
```bash
# Before deploying new code
./fix-rabbitmq-queues.sh

# Deploy new code
git pull
npm install
npm run build

# Restart application
pm2 restart ucg-backend
```

---

## Technical Details

### Current Queue Configuration (in code)

**M-Pesa Module** (`src/modules/mpesa/mpesa.module.ts:40`):
```typescript
noAck: false,  // Manual acknowledgment
queueOptions: {
  durable: true,
  arguments: {
    'x-message-ttl': 3600000,  // 1 hour
    'x-max-priority': 10,       // Priority queuing
  },
},
prefetchCount: 1,
```

**TigoPesa Module** (`src/modules/tigopesa/tigopesa.module.ts:39`):
```typescript
noAck: false,  // Manual acknowledgment
queueOptions: {
  durable: true,
  arguments: {
    'x-message-ttl': 3600000,  // 1 hour
    'x-max-priority': 10,       // Priority queuing
  },
},
prefetchCount: 1,
```

### Why Manual Acknowledgment?

Manual acknowledgment (`noAck: false`) is used because:
- **Reliability**: Messages are only removed after successful processing
- **Retry Logic**: Failed messages can be requeued (nack)
- **Error Handling**: Different handling for validation vs transient errors
- **Data Safety**: No message loss during crashes or restarts

---

## Troubleshooting

### Error persists after queue deletion

1. **Check if queues are truly deleted**
   ```bash
   curl -u guest:guest http://localhost:15672/api/queues
   ```

2. **Clear RabbitMQ cache** (if running locally)
   ```bash
   docker restart rabbitmq
   # OR
   sudo systemctl restart rabbitmq-server
   ```

3. **Check for competing consumers**
   - Make sure no other instances of the application are running
   ```bash
   ps aux | grep node
   pm2 list
   ```

### Different error after fix

If you see a different error, check:
- RabbitMQ is running: `systemctl status rabbitmq-server`
- RabbitMQ port is accessible: `telnet localhost 5672`
- Environment variables are set correctly in `.env`

---

## Summary

**Quick Fix (Recommended):**
1. Open RabbitMQ Management UI (http://localhost:15672)
2. Delete queues: `ucg.mpesa.payment.processing`, `ucg.mpesa.callback`, `ucg.tigopesa.payment.processing`
3. Restart application: `pm2 restart ucg-backend`
4. Verify: No 406 errors in logs

**Date:** 2025-12-16
**Issue:** 406 PRECONDITION_FAILED - reply consumer cannot acknowledge
**Status:** ✅ Fix documented and script provided
