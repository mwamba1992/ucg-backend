# Async Operations & Queue System Analysis

## Current State: NO Queue System

### What's Currently Implemented

❌ **No Background Job Queue** - No Bull, BullMQ, or similar job queue library is installed

❌ **No True Parallel Execution** - The "PARALLEL_TASKS" in workflow are created sequentially, not executed in parallel

❌ **No Retry Mechanism** - Failed operations don't retry automatically

❌ **No Job Prioritization** - All operations run with equal priority

❌ **No Rate Limiting** - No control over concurrent API calls

❌ **Blocking Operations** - Long-running tasks block the HTTP request-response cycle

### How Async Is Currently "Handled"

#### 1. Service Provider Creation
```typescript
// service-provider.service.ts:122-138
async create(createDto: CreateServiceProviderDto): Promise<ServiceProvider> {
  // ... save SP synchronously ...

  // Start workflow (BLOCKS the HTTP request)
  try {
    await this.workflowService.startWorkflow({
      entityType: 'SERVICE_PROVIDER',
      entityId: savedSp.id,
      workflowName: 'Service Provider Onboarding',
    });
  } catch (error) {
    console.warn(`Failed to start workflow for SP ${savedSp.id}:`, error.message);
  }

  return await this.findOne(savedSp.id);
}
```

**Problem**: If workflow creation is slow, the HTTP request waits. User sees delayed response.

#### 2. Workflow "Parallel" Tasks
```typescript
// workflow.service.ts:254-258
if (step.type === 'PARALLEL_TASKS' && step.tasks) {
  // Create multiple tasks in parallel
  for (const subTask of step.tasks) {
    await this.createSingleTask(instance, step.id, subTask.name, step);
  }
}
```

**Problem**: Despite the comment saying "in parallel", this is a **sequential loop** with `await` inside. Tasks are created one-by-one, not in parallel.

**Current Execution Flow**:
```
NIDA task created (wait) →
BRELA task created (wait) →
TRA task created (wait)
```

**Should be** (with queue):
```
NIDA task queued →
BRELA task queued →
TRA task queued →
All execute in parallel
```

#### 3. KYC API Calls
```typescript
// sp-onboarding-workflow.seed.ts:49-77
{
  id: 'kyc_verification',
  type: 'PARALLEL_TASKS',
  tasks: [
    {
      id: 'nida_check',
      type: 'API_CALL',
      api: 'https://ors.nida.go.tz/api/v1/verify',
    },
    {
      id: 'brela_check',
      type: 'API_CALL',
      api: 'https://api.brela.go.tz/v1/business/verify',
    },
    // ...
  ]
}
```

**Problem**: These API calls are **not actually executed**. They're just task definitions. Someone has to manually complete them via the API.

#### 4. Missing Features (TODOs in code)
```typescript
// workflow.service.ts:244
// TODO: Send notification

// workflow.service.ts:319
// TODO: Send notification to assignee
```

**Problem**: No notification system, no background jobs for emails/SMS.

---

## Problems with Current Approach

### 1. **Poor User Experience**
- User waits for workflow creation during SP registration
- HTTP timeout risk for long-running operations
- No feedback for slow operations

### 2. **No Fault Tolerance**
- If NIDA API is down, manual retry required
- No automatic retry for failed operations
- Errors block the entire workflow

### 3. **No Scalability**
- All operations run in main application thread
- Can't horizontally scale workers
- CPU-intensive tasks block API requests

### 4. **No Observability**
- Can't monitor job progress
- Can't see failed jobs
- No job metrics or analytics

### 5. **No Scheduling**
- Can't schedule jobs for future execution
- Can't process batch operations
- No cron-like recurring jobs

---

## Recommended Solution: Implement Bull Queue

### Why Bull/BullMQ?

✅ **Redis-backed** - Fast, reliable, persistent queue

✅ **NestJS Integration** - Official `@nestjs/bull` package

✅ **Job Priorities** - Process important jobs first

✅ **Retry Logic** - Automatic retry with exponential backoff

✅ **Rate Limiting** - Control API call frequency

✅ **Job Progress** - Track job completion percentage

✅ **Job Scheduling** - Delayed and repeated jobs

✅ **Concurrency Control** - Limit parallel executions

✅ **Dashboard UI** - Bull Board for monitoring

### Architecture with Queue

```
┌──────────────┐
│  API Request │
└──────┬───────┘
       │
       │ 1. Save SP to DB
       ▼
┌──────────────────┐
│  SP Service      │
└──────┬───────────┘
       │
       │ 2. Add job to queue (non-blocking)
       ▼
┌──────────────────┐     ┌──────────────────┐
│  Queue (Redis)   │────▶│  Worker Process  │
└──────────────────┘     └──────┬───────────┘
       │                         │
       │                         │ 3. Process async
       │                         ▼
       │                  ┌─────────────────┐
       │                  │  KYC APIs       │
       │                  │  - NIDA         │
       │                  │  - BRELA        │
       │                  │  - TRA          │
       │                  └─────────────────┘
       │
       │ 4. Job complete
       ▼
┌──────────────────┐
│  Notification    │
│  Service         │
└──────────────────┘
```

---

## Implementation Guide

### Step 1: Install Dependencies

```bash
npm install @nestjs/bull bull
npm install @types/bull --save-dev

# Optional: Install Bull Board for UI
npm install @bull-board/express @bull-board/api
```

### Step 2: Install Redis

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### Step 3: Create Queue Module

```typescript
// src/modules/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 200, // Keep last 200 failed jobs
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class QueueModule {}
```

### Step 4: Create Workflow Queue

```typescript
// src/modules/workflow/workflow-queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WorkflowModule } from './workflow.module';
import { WorkflowQueueProcessor } from './workflow-queue.processor';
import { WorkflowQueueProducer } from './workflow-queue.producer';

export const WORKFLOW_QUEUE = 'workflow-queue';
export const KYC_QUEUE = 'kyc-queue';
export const NOTIFICATION_QUEUE = 'notification-queue';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: WORKFLOW_QUEUE },
      { name: KYC_QUEUE },
      { name: NOTIFICATION_QUEUE },
    ),
    WorkflowModule,
  ],
  providers: [
    WorkflowQueueProcessor,
    WorkflowQueueProducer,
  ],
  exports: [WorkflowQueueProducer],
})
export class WorkflowQueueModule {}
```

### Step 5: Create Queue Producer

```typescript
// src/modules/workflow/workflow-queue.producer.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WORKFLOW_QUEUE, KYC_QUEUE } from './workflow-queue.module';

@Injectable()
export class WorkflowQueueProducer {
  private readonly logger = new Logger(WorkflowQueueProducer.name);

  constructor(
    @InjectQueue(WORKFLOW_QUEUE) private workflowQueue: Queue,
    @InjectQueue(KYC_QUEUE) private kycQueue: Queue,
  ) {}

  /**
   * Start workflow asynchronously
   */
  async startWorkflowAsync(data: {
    entityType: string;
    entityId: string;
    workflowName: string;
    metadata?: any;
  }): Promise<void> {
    await this.workflowQueue.add('start-workflow', data, {
      priority: 1, // High priority
    });

    this.logger.log(`Workflow queued for ${data.entityType}:${data.entityId}`);
  }

  /**
   * Execute KYC checks in parallel
   */
  async executeKycChecksAsync(data: {
    serviceProviderId: string;
    workflowInstanceId: string;
    taskIds: { nida: string; brela: string; tra: string };
    contactPersonId: string;
    registrationNumber: string;
    tinNumber: string;
  }): Promise<void> {
    // Add 3 jobs that will run in parallel
    await Promise.all([
      this.kycQueue.add('nida-verification', {
        taskId: data.taskIds.nida,
        workflowInstanceId: data.workflowInstanceId,
        nidaNumber: data.contactPersonId,
      }, {
        priority: 2,
        attempts: 5, // Retry 5 times for external APIs
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5s delay
        },
      }),

      this.kycQueue.add('brela-verification', {
        taskId: data.taskIds.brela,
        workflowInstanceId: data.workflowInstanceId,
        registrationNumber: data.registrationNumber,
      }, {
        priority: 2,
        attempts: 5,
      }),

      this.kycQueue.add('tra-verification', {
        taskId: data.taskIds.tra,
        workflowInstanceId: data.workflowInstanceId,
        tinNumber: data.tinNumber,
      }, {
        priority: 2,
        attempts: 5,
      }),
    ]);

    this.logger.log(`KYC checks queued for SP ${data.serviceProviderId}`);
  }

  /**
   * Send notification asynchronously
   */
  async sendNotificationAsync(data: {
    type: 'email' | 'sms';
    to: string;
    subject?: string;
    message: string;
  }): Promise<void> {
    await this.workflowQueue.add('send-notification', data, {
      priority: 3, // Lower priority than workflow operations
      attempts: 3,
    });
  }
}
```

### Step 6: Create Queue Processor

```typescript
// src/modules/workflow/workflow-queue.processor.ts
import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { WORKFLOW_QUEUE, KYC_QUEUE } from './workflow-queue.module';
import { WorkflowService } from './workflow.service';
import axios from 'axios';

@Processor(WORKFLOW_QUEUE)
export class WorkflowQueueProcessor {
  private readonly logger = new Logger(WorkflowQueueProcessor.name);

  constructor(private readonly workflowService: WorkflowService) {}

  @Process('start-workflow')
  async handleStartWorkflow(job: Job) {
    this.logger.log(`Processing workflow start: ${job.id}`);

    const { entityType, entityId, workflowName, metadata } = job.data;

    try {
      await this.workflowService.startWorkflow({
        entityType,
        entityId,
        workflowName,
        metadata,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to start workflow: ${error.message}`);
      throw error; // Will trigger retry
    }
  }

  @Process('send-notification')
  async handleNotification(job: Job) {
    this.logger.log(`Sending notification: ${job.id}`);

    const { type, to, subject, message } = job.data;

    // TODO: Integrate with email/SMS service
    this.logger.log(`Would send ${type} to ${to}: ${message}`);

    return { success: true };
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Job ${job.id} (${job.name}) started`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    this.logger.log(`Job ${job.id} (${job.name}) completed with result: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} (${job.name}) failed: ${error.message}`);
  }
}

@Processor(KYC_QUEUE)
export class KycQueueProcessor {
  private readonly logger = new Logger(KycQueueProcessor.name);

  constructor(private readonly workflowService: WorkflowService) {}

  @Process('nida-verification')
  async handleNidaVerification(job: Job) {
    this.logger.log(`Processing NIDA verification: ${job.id}`);

    const { taskId, workflowInstanceId, nidaNumber } = job.data;

    try {
      // Call NIDA API
      const response = await axios.post(
        'https://ors.nida.go.tz/api/v1/verify',
        { nidaNumber },
        {
          timeout: 30000,
          headers: {
            'Authorization': `Bearer ${process.env.NIDA_API_KEY}`,
          },
        }
      );

      // Complete workflow task with result
      await this.workflowService.completeTask(taskId, 'system', {
        result: {
          verified: true,
          provider: 'NIDA',
          data: response.data,
        },
      });

      return { success: true, verified: true };
    } catch (error) {
      this.logger.error(`NIDA verification failed: ${error.message}`);

      // Mark task as failed
      await this.workflowService.completeTask(taskId, 'system', {
        result: {
          verified: false,
          provider: 'NIDA',
          error: error.message,
        },
      });

      throw error;
    }
  }

  @Process('brela-verification')
  async handleBrelaVerification(job: Job) {
    this.logger.log(`Processing BRELA verification: ${job.id}`);

    const { taskId, registrationNumber } = job.data;

    try {
      const response = await axios.post(
        'https://api.brela.go.tz/v1/business/verify',
        { registrationNumber },
        { timeout: 30000 }
      );

      await this.workflowService.completeTask(taskId, 'system', {
        result: {
          verified: true,
          provider: 'BRELA',
          data: response.data,
        },
      });

      return { success: true, verified: true };
    } catch (error) {
      this.logger.error(`BRELA verification failed: ${error.message}`);
      throw error;
    }
  }

  @Process('tra-verification')
  async handleTraVerification(job: Job) {
    this.logger.log(`Processing TRA verification: ${job.id}`);

    const { taskId, tinNumber } = job.data;

    try {
      const response = await axios.post(
        'https://api.tra.go.tz/verification/v1/tin/verify',
        { tinNumber },
        { timeout: 30000 }
      );

      await this.workflowService.completeTask(taskId, 'system', {
        result: {
          verified: true,
          provider: 'TRA',
          data: response.data,
        },
      });

      return { success: true, verified: true };
    } catch (error) {
      this.logger.error(`TRA verification failed: ${error.message}`);
      throw error;
    }
  }
}
```

### Step 7: Update Service Provider Service

```typescript
// service-provider.service.ts
import { WorkflowQueueProducer } from '../workflow/workflow-queue.producer';

@Injectable()
export class ServiceProviderService {
  constructor(
    // ... existing repositories
    private readonly workflowService: WorkflowService,
    private readonly workflowQueueProducer: WorkflowQueueProducer, // NEW
  ) {}

  async create(createDto: CreateServiceProviderDto): Promise<ServiceProvider> {
    // ... save SP ...

    // Start workflow asynchronously (non-blocking)
    await this.workflowQueueProducer.startWorkflowAsync({
      entityType: 'SERVICE_PROVIDER',
      entityId: savedSp.id,
      workflowName: 'Service Provider Onboarding',
      metadata: {
        businessType: savedSp.businessType,
        businessName: savedSp.businessName,
        region: savedSp.region,
      },
    });

    // Return immediately (workflow processes in background)
    return await this.findOne(savedSp.id);
  }
}
```

### Step 8: Add Bull Board (Optional Dashboard)

```typescript
// src/app.module.ts
import { BullModule } from '@nestjs/bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

// In your bootstrap function (main.ts)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [
    new BullAdapter(workflowQueue),
    new BullAdapter(kycQueue),
    new BullAdapter(notificationQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Access dashboard at: `http://localhost:3000/admin/queues`

---

## Benefits After Implementation

### 1. **Non-Blocking Operations**
```typescript
// Before: Blocks 5-10 seconds
await workflowService.startWorkflow(...); // User waits

// After: Returns in milliseconds
await queueProducer.startWorkflowAsync(...); // Immediate response
```

### 2. **Automatic Retries**
```typescript
// NIDA API down? Auto-retry 5 times with exponential backoff
// 1st retry: 5s delay
// 2nd retry: 10s delay
// 3rd retry: 20s delay
// 4th retry: 40s delay
// 5th retry: 80s delay
```

### 3. **True Parallel Execution**
```typescript
// All 3 KYC checks run simultaneously
Promise.all([
  nidaQueue.add(...),  // Runs in parallel
  brelaQueue.add(...), // Runs in parallel
  traQueue.add(...),   // Runs in parallel
]);
```

### 4. **Horizontal Scaling**
```bash
# Run multiple worker instances
node dist/main.js --workers=5

# Workers can be on different servers
server1: 3 workers
server2: 3 workers
server3: 4 workers
# = 10 total workers processing jobs
```

### 5. **Job Monitoring**
- View all jobs in Bull Board dashboard
- See success/failure rates
- Monitor job duration
- Retry failed jobs manually
- Clear old jobs

---

## Environment Variables

```env
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Keys for KYC
NIDA_API_KEY=your_nida_api_key
BRELA_API_KEY=your_brela_api_key
TRA_API_KEY=your_tra_api_key
```

---

## Summary

### Current State
❌ No queue system
❌ Blocking operations
❌ Sequential "parallel" tasks
❌ No retry mechanism
❌ No job monitoring

### After Implementation
✅ Redis-backed job queue
✅ Non-blocking async operations
✅ True parallel execution
✅ Automatic retries with backoff
✅ Job monitoring dashboard
✅ Horizontally scalable
✅ Rate limiting support
✅ Job prioritization

### Recommended Next Steps
1. Install Bull and Redis
2. Implement WorkflowQueueProducer
3. Implement KycQueueProcessor
4. Update ServiceProviderService to use queue
5. Add notification queue for emails/SMS
6. Set up Bull Board for monitoring
7. Configure retry strategies per job type
8. Add job metrics and logging

---

## Files to Create

1. `src/modules/queue/queue.module.ts` - Global queue configuration
2. `src/modules/workflow/workflow-queue.module.ts` - Workflow-specific queues
3. `src/modules/workflow/workflow-queue.producer.ts` - Queue job creator
4. `src/modules/workflow/workflow-queue.processor.ts` - Job processor
5. `src/modules/workflow/kyc-queue.processor.ts` - KYC job processor
6. Update `service-provider.service.ts` - Use queue instead of direct calls
7. Update `workflow.service.ts` - Handle auto-complete from queue jobs

This implementation will transform your system from synchronous blocking operations to a robust, scalable, fault-tolerant async job processing system.
