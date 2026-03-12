import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import { AirtelService } from './airtel.service';
import { AirtelPaymentMessage } from './dto/airtel-queue.dto';

/**
 * Airtel Async Payment Consumer (backup/fallback)
 * Currently payments are processed synchronously in the webhook endpoint.
 */
@Controller()
export class AirtelConsumer {
  private readonly logger = new Logger(AirtelConsumer.name);

  constructor(private readonly airtelService: AirtelService) {}

  @EventPattern(RABBITMQ_ROUTING_KEYS.AIRTEL_PAYMENT_PROCESS)
  async handlePaymentProcessing(
    @Payload() message: AirtelPaymentMessage,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Processing Airtel payment: ${message.txnId} - Amount: ${message.amount} - Ref: ${message.customerReferenceId}`,
      );

      const result = await this.airtelService.processPayment(message);

      if (result.success) {
        this.logger.log(
          `Airtel payment processed successfully: ${message.txnId} - Payment ID: ${result.paymentId}`,
        );
        channel.ack(originalMsg);
      } else {
        const isValidationError = this.isValidationError(result.errorCode);

        if (isValidationError) {
          this.logger.warn(
            `Airtel payment validation failed: ${message.txnId} - ${result.errorDescription}`,
          );
          channel.ack(originalMsg);
        } else {
          const retryCount = this.getRetryCount(originalMsg);

          if (retryCount < 3) {
            this.logger.warn(
              `Airtel payment processing failed, retrying (${retryCount + 1}/3): ${message.txnId}`,
            );
            channel.nack(originalMsg, false, true);
          } else {
            this.logger.error(
              `Airtel payment failed after 3 retries: ${message.txnId}`,
            );
            channel.ack(originalMsg);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error processing Airtel payment: ${error.message}`,
        error.stack,
      );

      const retryCount = this.getRetryCount(originalMsg);

      if (this.isRetryableError(error) && retryCount < 3) {
        this.logger.warn(
          `Requeueing Airtel payment (retry ${retryCount + 1}/3): ${message.txnId}`,
        );
        channel.nack(originalMsg, false, true);
      } else {
        this.logger.error(
          `Permanent failure for Airtel payment: ${message.txnId}`,
        );
        channel.ack(originalMsg);
      }
    }
  }

  private isValidationError(errorCode: string): boolean {
    const validationErrorCodes = [
      'error010', 'error011', 'error012',
      'error013', 'error014', 'error015', 'error016',
    ];
    return validationErrorCodes.includes(errorCode);
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND',
      'Network error', 'timeout', 'CBS',
      'error001', 'error111',
    ];
    return retryableErrors.some((e) =>
      error.message?.toLowerCase().includes(e.toLowerCase()),
    );
  }

  private getRetryCount(msg: any): number {
    return msg.properties?.headers?.['x-retry-count'] || 0;
  }
}
