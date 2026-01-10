import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import { MpesaService } from './mpesa.service';
import {
  MpesaPaymentMessage,
  MpesaCallbackMessage,
} from './dto/mpesa-queue.dto';

@Controller()
export class MpesaConsumer {
  private readonly logger = new Logger(MpesaConsumer.name);

  constructor(private readonly mpesaService: MpesaService) {}

  /**
   * Process M-Pesa payment from queue
   * Handles: validation, payment creation, CBS transfer
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
        `Processing M-Pesa payment: ${message.mpesaReceipt} - Amount: ${message.amount} - Ref: ${message.referenceNumber}`,
      );

      // Process the payment
      const result = await this.mpesaService.processPayment(message);

      if (result.success) {
        this.logger.log(
          `M-Pesa payment processed successfully: ${message.mpesaReceipt} - Payment ID: ${result.paymentId}`,
        );

        // Queue callback with success
        this.mpesaService.queueCallback({
          conversationId: message.conversationId,
          originatorConversationId: message.originatorConversationId,
          transactionId: message.transactionId,
          mpesaReceipt: message.mpesaReceipt,
          resultCode: '0',
          resultType: 'Completed',
          resultDesc: 'Successful',
        });

        // ACK the message
        channel.ack(originalMsg);
      } else {
        // Check if it's a validation error (don't retry)
        const isValidationError = this.isValidationError(result.error);

        if (isValidationError) {
          this.logger.warn(
            `M-Pesa payment validation failed: ${message.mpesaReceipt} - ${result.error}`,
          );

          // Queue callback with failure
          this.mpesaService.queueCallback({
            conversationId: message.conversationId,
            originatorConversationId: message.originatorConversationId,
            transactionId: message.transactionId,
            mpesaReceipt: message.mpesaReceipt,
            resultCode: '999',
            resultType: 'Failed',
            resultDesc: result.error,
          });

          // ACK (don't retry validation errors)
          channel.ack(originalMsg);
        } else {
          // Transient error - retry
          const retryCount = this.getRetryCount(originalMsg);

          if (retryCount < 3) {
            this.logger.warn(
              `M-Pesa payment processing failed, retrying (${retryCount + 1}/3): ${message.mpesaReceipt}`,
            );
            channel.nack(originalMsg, false, true);
          } else {
            this.logger.error(
              `M-Pesa payment failed after 3 retries: ${message.mpesaReceipt}`,
            );

            // Send failure callback
            this.mpesaService.queueCallback({
              conversationId: message.conversationId,
              originatorConversationId: message.originatorConversationId,
              transactionId: message.transactionId,
              mpesaReceipt: message.mpesaReceipt,
              resultCode: '999',
              resultType: 'Failed',
              resultDesc: `System error: ${result.error}`,
            });

            channel.ack(originalMsg);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error processing M-Pesa payment: ${error.message}`,
        error.stack,
      );

      // Check retry count
      const retryCount = this.getRetryCount(originalMsg);

      if (this.isRetryableError(error) && retryCount < 3) {
        this.logger.warn(
          `Requeueing M-Pesa payment (retry ${retryCount + 1}/3): ${message.mpesaReceipt}`,
        );
        channel.nack(originalMsg, false, true);
      } else {
        this.logger.error(
          `Permanent failure for M-Pesa payment: ${message.mpesaReceipt}`,
        );

        // Send failure callback
        this.mpesaService.queueCallback({
          conversationId: message.conversationId,
          originatorConversationId: message.originatorConversationId,
          transactionId: message.transactionId,
          mpesaReceipt: message.mpesaReceipt,
          resultCode: '999',
          resultType: 'Failed',
          resultDesc: `System error: ${error.message}`,
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
        `Sending callback to M-Pesa: ${message.conversationId} - Result: ${message.resultCode} (${message.resultType})`,
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
          const delay = this.getRetryDelay(retryCount);
          this.logger.warn(
            `Callback failed, will retry in ${delay / 1000}s (retry ${retryCount + 1}/4): ${message.conversationId}`,
          );

          // Use setTimeout to delay the requeue
          setTimeout(() => {
            channel.nack(originalMsg, false, true);
          }, delay);
        } else {
          this.logger.error(
            `Callback failed after 4 retries, moving to DLX: ${message.conversationId}`,
          );
          channel.nack(originalMsg, false, false); // Move to DLX
        }
      }
    } catch (error) {
      this.logger.error(
        `Error sending callback to M-Pesa: ${error.message}`,
        error.stack,
      );

      const retryCount = this.getRetryCount(originalMsg);

      if (retryCount < 4) {
        const delay = this.getRetryDelay(retryCount);
        setTimeout(() => {
          channel.nack(originalMsg, false, true);
        }, delay);
      } else {
        channel.nack(originalMsg, false, false); // Move to DLX
      }
    }
  }

  /**
   * Helper: Check if error is a validation error (don't retry)
   */
  private isValidationError(error: string): boolean {
    const validationErrors = [
      'Invalid reference',
      'Reference not found',
      'Reference expired',
      'Reference already used',
      'Reference USED',
      'Amount mismatch',
      'Invalid amount',
    ];

    return validationErrors.some((e) =>
      error?.toLowerCase().includes(e.toLowerCase()),
    );
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
      'CBS',
    ];

    return retryableErrors.some((e) =>
      error.message?.toLowerCase().includes(e.toLowerCase()),
    );
  }

  /**
   * Helper: Get retry count from message headers
   */
  private getRetryCount(msg: any): number {
    return msg.properties?.headers?.['x-retry-count'] || 0;
  }

  /**
   * Helper: Calculate retry delay with exponential backoff
   * Retry 1: 30 seconds
   * Retry 2: 2 minutes
   * Retry 3: 5 minutes
   * Retry 4: 15 minutes
   */
  private getRetryDelay(retryCount: number): number {
    const delays = [30000, 120000, 300000, 900000];
    return delays[retryCount] || 900000;
  }
}
