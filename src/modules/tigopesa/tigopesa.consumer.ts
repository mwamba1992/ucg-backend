import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import { TigoPesaService } from './tigopesa.service';
import { TigoPesaPaymentMessage } from './dto/tigopesa-queue.dto';

/**
 * [BACKUP/FALLBACK] TigoPesa Async Payment Consumer
 *
 * NOTE: This consumer is kept as a backup for future use.
 * Currently, TigoPesa processes payments synchronously in the webhook endpoint.
 * This async queue consumer can be re-enabled later if needed.
 *
 * To use this consumer, call tigopesaProducer.emitPaymentProcessing() instead of
 * direct synchronous processing in the controller.
 */
@Controller()
export class TigoPesaConsumer {
  private readonly logger = new Logger(TigoPesaConsumer.name);

  constructor(private readonly tigopesaService: TigoPesaService) {}

  /**
   * [BACKUP/FALLBACK] Process TigoPesa payment from queue
   * Handles: validation, payment creation, CBS transfer
   *
   * This is kept for future use - currently not being called
   * as payments are processed synchronously in the webhook.
   */
  @EventPattern(RABBITMQ_ROUTING_KEYS.TIGOPESA_PAYMENT_PROCESS)
  async handlePaymentProcessing(
    @Payload() message: TigoPesaPaymentMessage,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Processing TigoPesa payment: ${message.txnId} - Amount: ${message.amount} - Ref: ${message.customerReferenceId}`,
      );

      // Process the payment
      const result = await this.tigopesaService.processPayment(message);

      if (result.success) {
        this.logger.log(
          `TigoPesa payment processed successfully: ${message.txnId} - Payment ID: ${result.paymentId}`,
        );

        // ACK the message
        channel.ack(originalMsg);
      } else {
        // Check if it's a validation error (don't retry)
        const isValidationError = this.isValidationError(result.errorCode);

        if (isValidationError) {
          this.logger.warn(
            `TigoPesa payment validation failed: ${message.txnId} - ${result.errorDescription}`,
          );

          // ACK (don't retry validation errors)
          channel.ack(originalMsg);
        } else {
          // Transient error - retry
          const retryCount = this.getRetryCount(originalMsg);

          if (retryCount < 3) {
            this.logger.warn(
              `TigoPesa payment processing failed, retrying (${retryCount + 1}/3): ${message.txnId}`,
            );
            channel.nack(originalMsg, false, true);
          } else {
            this.logger.error(
              `TigoPesa payment failed after 3 retries: ${message.txnId}`,
            );

            channel.ack(originalMsg);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error processing TigoPesa payment: ${error.message}`,
        error.stack,
      );

      // Check retry count
      const retryCount = this.getRetryCount(originalMsg);

      if (this.isRetryableError(error) && retryCount < 3) {
        this.logger.warn(
          `Requeueing TigoPesa payment (retry ${retryCount + 1}/3): ${message.txnId}`,
        );
        channel.nack(originalMsg, false, true);
      } else {
        this.logger.error(
          `Permanent failure for TigoPesa payment: ${message.txnId}`,
        );

        channel.ack(originalMsg);
      }
    }
  }

  /**
   * Helper: Check if error is a validation error (don't retry)
   */
  private isValidationError(errorCode: string): boolean {
    const validationErrorCodes = [
      'error010', // Invalid Customer Reference Number
      'error011', // Customer Reference Account locked
      'error012', // Invalid Amount
      'error013', // Amount insufficient
      'error014', // Amount too high
      'error015', // Amount too low
      'error016', // Invalid payment
    ];

    return validationErrorCodes.includes(errorCode);
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
      'error001', // Service not available
      'error111', // Retry condition
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
}
