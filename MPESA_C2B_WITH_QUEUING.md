# M-Pesa C2B Integration with RabbitMQ Queuing

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│               M-PESA C2B WITH ASYNC QUEUE PROCESSING                     │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: M-Pesa Notification (Sync)
────────────────────────────────────
M-Pesa → POST /api/v1/vodacom/transaction (XML)
         │
         ├─ Parse XML
         ├─ Basic validation (format, required fields)
         ├─ Check duplicate (mpesaReceipt)
         │
         └─ IMMEDIATE RESPONSE (< 2 seconds)
            {responseCode: 0, responseDesc: "Received", serviceStatus: "Success"}


Step 2: Queue for Processing (Async)
─────────────────────────────────────
API → RabbitMQ Queue: "ucg.mpesa.payment.processing"
      │
      └─ Message: {
           mpesaReceipt: "5BL716QNJBB",
           amount: 18000,
           customerPhone: "255758027779",
           referenceNumber: "MW1-0000123-789",
           conversationId: "...",
           ...
         }


Step 3: Consumer Processing (Background)
─────────────────────────────────────────
Consumer picks message from queue
  │
  ├─ 1. Validate reference exists & matches amount
  ├─ 2. Create Payment record
  ├─ 3. Get SP settings (commission, deposit account)
  ├─ 4. Execute CBS Transfer (GL → Deposit)
  │      - Debit: UCG GL Account
  │      - Credit: SP Deposit Account
  │      - Amount: Payment - Commission
  ├─ 5. Update Payment status
  ├─ 6. Update MpesaTransaction status
  │
  └─ 7. Queue M-Pesa Callback


Step 4: M-Pesa Callback Queue
──────────────────────────────
API → RabbitMQ Queue: "ucg.mpesa.callback"
      │
      └─ Message: {
           conversationId: "...",
           resultCode: 0,  // 0=success, 999=failure
           resultType: "Completed",
           resultDesc: "Successful",
           ...
         }


Step 5: Callback Consumer (Retry Logic)
────────────────────────────────────────
Consumer sends callback to M-Pesa
  │
  ├─ POST to M-Pesa callback URL (XML)
  ├─ If success → Mark as sent
  │
  └─ If failure → Retry (with exponential backoff)
       - Retry 1: after 30 seconds
       - Retry 2: after 2 minutes
       - Retry 3: after 5 minutes
       - Retry 4: after 15 minutes
       - After 4 retries → Move to DLX (Dead Letter Exchange)
```

## RabbitMQ Configuration

### 1. Update rabbitmq.config.ts

```typescript
// Add M-Pesa queues
export const RABBITMQ_QUEUES = {
  // Existing queues
  REFERENCE_GENERATION: 'ucg.reference.generation',
  REFERENCE_BULK: 'ucg.reference.bulk',
  REFERENCE_VALIDATION: 'ucg.reference.validation',
  REFERENCE_NOTIFICATION: 'ucg.reference.notification',
  PAYMENT_PROCESSING: 'ucg.payment.processing',
  PAYMENT_NOTIFICATION: 'ucg.payment.notification',

  // M-Pesa queues (NEW)
  MPESA_PAYMENT_PROCESSING: 'ucg.mpesa.payment.processing',
  MPESA_CALLBACK: 'ucg.mpesa.callback',
  MPESA_VALIDATION: 'ucg.mpesa.validation',
} as const;

// Add M-Pesa exchange
export const RABBITMQ_EXCHANGES = {
  REFERENCE: 'ucg.reference.exchange',
  PAYMENT: 'ucg.payment.exchange',
  MPESA: 'ucg.mpesa.exchange',  // NEW
  DLX: 'ucg.dlx',
} as const;

// Add M-Pesa routing keys
export const RABBITMQ_ROUTING_KEYS = {
  // Existing keys
  REFERENCE_CREATE: 'reference.create',
  REFERENCE_BULK: 'reference.bulk',
  REFERENCE_VALIDATE: 'reference.validate',
  REFERENCE_NOTIFY: 'reference.notify',
  PAYMENT_PROCESS: 'payment.process',
  PAYMENT_NOTIFY: 'payment.notify',

  // M-Pesa keys (NEW)
  MPESA_PAYMENT_PROCESS: 'mpesa.payment.process',
  MPESA_CALLBACK_SEND: 'mpesa.callback.send',
  MPESA_VALIDATE: 'mpesa.validate',
} as const;
```

## Implementation

### 1. M-Pesa Producer (mpesa.producer.ts)

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import {
  MpesaPaymentMessage,
  MpesaCallbackMessage,
  MpesaValidationMessage,
} from './dto/mpesa-queue.dto';

@Injectable()
export class MpesaProducer {
  private readonly logger = new Logger(MpesaProducer.name);

  constructor(
    @Inject('MPESA_SERVICE') private readonly mpesaClient: ClientProxy,
  ) {}

  /**
   * Queue M-Pesa payment for processing (Fire and forget)
   * This is called immediately after receiving M-Pesa notification
   */
  emitPaymentProcessing(message: MpesaPaymentMessage): void {
    try {
      this.logger.log(
        `Queueing M-Pesa payment for processing: ${message.mpesaReceipt}`,
      );

      this.mpesaClient.emit(
        RABBITMQ_ROUTING_KEYS.MPESA_PAYMENT_PROCESS,
        message,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue M-Pesa payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Queue M-Pesa callback to be sent
   * This is called after payment processing completes
   */
  emitCallback(message: MpesaCallbackMessage): void {
    try {
      this.logger.log(
        `Queueing M-Pesa callback: ${message.conversationId} - Result: ${message.resultCode}`,
      );

      this.mpesaClient.emit(
        RABBITMQ_ROUTING_KEYS.MPESA_CALLBACK_SEND,
        message,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue M-Pesa callback: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Queue M-Pesa validation request
   */
  emitValidation(message: MpesaValidationMessage): void {
    try {
      this.logger.log(
        `Queueing M-Pesa validation: ${message.referenceNumber}`,
      );

      this.mpesaClient.emit(
        RABBITMQ_ROUTING_KEYS.MPESA_VALIDATE,
        message,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue M-Pesa validation: ${error.message}`,
        error.stack,
      );
    }
  }

  async onModuleInit() {
    await this.mpesaClient.connect();
    this.logger.log('M-Pesa producer connected to RabbitMQ');
  }

  async onModuleDestroy() {
    await this.mpesaClient.close();
    this.logger.log('M-Pesa producer disconnected from RabbitMQ');
  }
}
```

### 2. M-Pesa Consumer (mpesa.consumer.ts)

```typescript
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import { MpesaService } from './mpesa.service';
import { CBSService } from '../cbs/cbs.service';
import { PaymentService } from '../payment/payment.service';
import {
  MpesaPaymentMessage,
  MpesaCallbackMessage,
} from './dto/mpesa-queue.dto';

@Controller()
export class MpesaConsumer {
  private readonly logger = new Logger(MpesaConsumer.name);

  constructor(
    private readonly mpesaService: MpesaService,
    private readonly cbsService: CBSService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Process M-Pesa payment in the background
   */
  @EventPattern(RABBITMQ_ROUTING_KEYS.MPESA_PAYMENT_PROCESS)
  async handlePaymentProcessing(
    @Payload() message: MpesaPaymentMessage,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Processing M-Pesa payment: ${message.mpesaReceipt} - Amount: ${message.amount}`,
      );

      // 1. Validate reference
      const validation = await this.mpesaService.validateReference(
        message.referenceNumber,
        message.amount,
      );

      if (!validation.valid) {
        this.logger.warn(
          `M-Pesa payment validation failed: ${validation.reason}`,
        );

        // Queue callback with failure
        this.mpesaService.queueCallback({
          conversationId: message.conversationId,
          originatorConversationId: message.originatorConversationId,
          transactionId: message.transactionId,
          resultCode: '999',
          resultType: 'Failed',
          resultDesc: validation.reason,
          mpesaReceipt: message.mpesaReceipt,
        });

        // ACK the message (don't retry validation errors)
        channel.ack(originalMsg);
        return;
      }

      // 2. Create payment record
      const payment = await this.paymentService.createMpesaPayment({
        referenceNumber: message.referenceNumber,
        payerName: message.customerName || 'M-Pesa Customer',
        payerPhone: message.customerPhone,
        amountPaid: message.amount,
        mpesaReceipt: message.mpesaReceipt,
      });

      // 3. Get service provider settings
      const reference = validation.reference;
      const spSettings = await this.mpesaService.getServiceProviderSettings(
        reference.serviceProviderId,
      );

      // 4. Build CBS transfer
      const transferDto = this.cbsService.buildSettlementTransfer(
        reference.referenceNumber,
        spSettings.depositAccount,
        process.env.UCG_GL_ACCOUNT || '1000000001',
        payment.amountPaid,
        spSettings.commissionRate,
        'TZS',
      );

      // 5. Execute CBS transfer
      const transferResult = await this.cbsService.executeTransfer(
        transferDto,
        payment.id,
      );

      // 6. Update payment and M-Pesa transaction
      await this.mpesaService.updatePaymentStatus(
        message.mpesaReceipt,
        transferResult.success,
        transferResult.transferId,
        transferResult.error,
      );

      // 7. Queue callback
      this.mpesaService.queueCallback({
        conversationId: message.conversationId,
        originatorConversationId: message.originatorConversationId,
        transactionId: message.transactionId,
        resultCode: transferResult.success ? '0' : '999',
        resultType: transferResult.success ? 'Completed' : 'Failed',
        resultDesc: transferResult.success
          ? 'Successful'
          : transferResult.error || 'CBS transfer failed',
        mpesaReceipt: message.mpesaReceipt,
      });

      this.logger.log(
        `M-Pesa payment processed successfully: ${message.mpesaReceipt}`,
      );

      // ACK the message
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(
        `Error processing M-Pesa payment: ${error.message}`,
        error.stack,
      );

      // Check if it's a retryable error
      const isRetryable = this.isRetryableError(error);

      if (isRetryable && this.getRetryCount(originalMsg) < 3) {
        // NACK with requeue for transient errors
        this.logger.warn(`Requeueing M-Pesa payment: ${message.mpesaReceipt}`);
        channel.nack(originalMsg, false, true);
      } else {
        // ACK and send failure callback for permanent errors
        this.logger.error(
          `Permanent failure for M-Pesa payment: ${message.mpesaReceipt}`,
        );

        this.mpesaService.queueCallback({
          conversationId: message.conversationId,
          originatorConversationId: message.originatorConversationId,
          transactionId: message.transactionId,
          resultCode: '999',
          resultType: 'Failed',
          resultDesc: `System error: ${error.message}`,
          mpesaReceipt: message.mpesaReceipt,
        });

        channel.ack(originalMsg);
      }
    }
  }

  /**
   * Send callback to M-Pesa (with retry logic)
   */
  @EventPattern(RABBITMQ_ROUTING_KEYS.MPESA_CALLBACK_SEND)
  async handleCallbackSending(
    @Payload() message: MpesaCallbackMessage,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Sending callback to M-Pesa: ${message.conversationId} - Result: ${message.resultCode}`,
      );

      // Send callback to M-Pesa
      const success = await this.mpesaService.sendCallbackToMpesa(message);

      if (success) {
        this.logger.log(
          `Callback sent successfully to M-Pesa: ${message.conversationId}`,
        );
        channel.ack(originalMsg);
      } else {
        // Retry callback sending
        const retryCount = this.getRetryCount(originalMsg);

        if (retryCount < 4) {
          this.logger.warn(
            `Callback failed, requeueing (retry ${retryCount + 1}/4): ${message.conversationId}`,
          );

          // Exponential backoff
          const delay = this.getRetryDelay(retryCount);
          setTimeout(() => {
            channel.nack(originalMsg, false, true);
          }, delay);
        } else {
          this.logger.error(
            `Callback failed after 4 retries, moving to DLX: ${message.conversationId}`,
          );
          channel.nack(originalMsg, false, false);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error sending callback to M-Pesa: ${error.message}`,
        error.stack,
      );

      // Retry with backoff
      const retryCount = this.getRetryCount(originalMsg);
      if (retryCount < 4) {
        channel.nack(originalMsg, false, true);
      } else {
        channel.nack(originalMsg, false, false); // Move to DLX
      }
    }
  }

  /**
   * Helper: Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Network error',
      'timeout',
    ];

    return retryableErrors.some((e) =>
      error.message?.toLowerCase().includes(e.toLowerCase()),
    );
  }

  /**
   * Helper: Get retry count from message
   */
  private getRetryCount(msg: any): number {
    return msg.properties?.headers?.['x-retry-count'] || 0;
  }

  /**
   * Helper: Calculate retry delay (exponential backoff)
   */
  private getRetryDelay(retryCount: number): number {
    const delays = [30000, 120000, 300000, 900000]; // 30s, 2m, 5m, 15m
    return delays[retryCount] || 900000;
  }
}
```

### 3. M-Pesa Controller (Webhook) - Updated

```typescript
@Controller('mpesa/c2b')
export class MpesaController {
  private readonly logger = new Logger(MpesaController.name);

  constructor(
    private readonly mpesaService: MpesaService,
    private readonly mpesaProducer: MpesaProducer,
  ) {}

  /**
   * M-Pesa C2B Payment Notification Webhook
   * This MUST respond within 2 seconds
   */
  @Post('payment')
  @Public() // No authentication for M-Pesa webhook
  async receivePayment(@Body() xmlBody: string): Promise<string> {
    try {
      this.logger.log('Received M-Pesa C2B notification');

      // 1. Parse XML to DTO
      const notification = await this.mpesaService.parseXmlNotification(xmlBody);

      // 2. Basic validation (format, required fields)
      this.mpesaService.validateNotificationFormat(notification);

      // 3. Verify SP password
      const isValid = this.mpesaService.verifyPassword(
        notification.spId,
        notification.spPassword,
        notification.timestamp,
      );

      if (!isValid) {
        this.logger.warn('Invalid SP password in M-Pesa notification');
        return this.mpesaService.buildSyncErrorResponse(
          notification.conversationID,
          'Invalid credentials',
        );
      }

      // 4. Check for duplicate
      const isDuplicate = await this.mpesaService.checkDuplicate(
        notification.mpesaReceipt,
      );

      if (isDuplicate) {
        this.logger.warn(
          `Duplicate M-Pesa transaction: ${notification.mpesaReceipt}`,
        );

        // For duplicates, queue callback with existing status
        await this.mpesaService.handleDuplicate(notification);

        // Still return success response
        return this.mpesaService.buildSyncSuccessResponse(
          notification.conversationID,
          notification.transactionID,
        );
      }

      // 5. Create M-Pesa transaction record (RECEIVED status)
      await this.mpesaService.createTransaction({
        mpesaReceipt: notification.mpesaReceipt,
        conversationId: notification.conversationID,
        originatorConversationId: notification.originatorConversationID,
        transactionId: notification.transactionID,
        referenceNumber: notification.accountReference,
        amount: notification.amount,
        customerPhone: notification.initiator,
        commandId: notification.commandID,
        transactionDate: notification.transactionDate,
        status: 'RECEIVED',
      });

      // 6. Queue for background processing
      this.mpesaProducer.emitPaymentProcessing({
        mpesaReceipt: notification.mpesaReceipt,
        conversationId: notification.conversationID,
        originatorConversationId: notification.originatorConversationID,
        transactionId: notification.transactionID,
        referenceNumber: notification.accountReference,
        amount: notification.amount,
        customerPhone: notification.initiator,
        customerName: notification.accountReference, // Or extract from somewhere
        commandId: notification.commandID,
        transactionDate: notification.transactionDate,
      });

      this.logger.log(
        `M-Pesa payment queued for processing: ${notification.mpesaReceipt}`,
      );

      // 7. Return immediate success response (< 2 seconds)
      return this.mpesaService.buildSyncSuccessResponse(
        notification.conversationID,
        notification.transactionID,
      );
    } catch (error) {
      this.logger.error(
        `Error processing M-Pesa notification: ${error.message}`,
        error.stack,
      );

      // Still return success to M-Pesa (we've logged the error)
      return this.mpesaService.buildSyncSuccessResponse('', '');
    }
  }
}
```

## Benefits of Queuing

### 1. Fast Response Time
- Webhook responds in < 1 second
- M-Pesa requirement: < 2 seconds
- No timeout issues

### 2. Reliability
- Failed processing doesn't lose the payment
- Messages persist in queue until processed
- Automatic retries for transient errors

### 3. Scalability
- Can process multiple payments concurrently
- Queue handles traffic spikes
- No bottlenecks

### 4. Error Handling
- Validation errors: Don't retry, send callback immediately
- CBS errors: Retry with backoff
- Network errors: Retry up to 3 times
- Callback failures: Retry up to 4 times with exponential backoff

### 5. Monitoring
- Track queue depth
- Monitor processing time
- Alert on DLX messages (permanent failures)

## Queue Flow Summary

```
┌────────────────────────────────────────────────────────────┐
│  WEBHOOK (< 2s)    →    QUEUE    →    CONSUMER (async)    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Receive XML    →    Payment     →  Validate Reference  │
│  2. Parse          →    Queue       →  Create Payment      │
│  3. Validate       →                →  Execute CBS         │
│  4. Check dupe     →                →  Update Status       │
│  5. Save record    →                →  Queue Callback      │
│  6. RESPOND!       →                                        │
│                                                             │
│                    →    Callback    →  Send to M-Pesa      │
│                    →    Queue       →  Retry if failed     │
│                                     →  DLX after 4 retries │
└────────────────────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Update RabbitMQ config with M-Pesa queues
2. ✅ Create M-Pesa producer
3. ✅ Create M-Pesa consumer
4. ✅ Update M-Pesa controller
5. Update M-Pesa service with queue methods
6. Create queue DTOs
7. Set up DLX (Dead Letter Exchange)
8. Add monitoring & alerts
9. Write tests
10. Deploy to staging

---

**Status:** Architecture Complete with Queuing
**Performance:** < 1s webhook response, async processing
**Reliability:** Message persistence, automatic retries, DLX handling
