import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import {
  ProcessPaymentMessage,
  PaymentNotificationMessage,
  PaymentProcessedResponse,
  PaymentNotificationResponse,
} from './dto/payment-queue.dto';

@Injectable()
export class PaymentProducer {
  private readonly logger = new Logger(PaymentProducer.name);
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor(
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  /**
   * Queue a payment processing request
   */
  async queuePaymentProcessing(
    message: ProcessPaymentMessage,
  ): Promise<PaymentProcessedResponse> {
    try {
      this.logger.log(
        `Queueing payment processing for reference: ${message.referenceNumber}`,
      );

      const response$ = this.paymentClient
        .send<PaymentProcessedResponse>(
          RABBITMQ_ROUTING_KEYS.PAYMENT_PROCESS,
          message,
        )
        .pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((error) => {
            this.logger.error(
              `Error queueing payment processing: ${error.message}`,
              error.stack,
            );
            throw error;
          }),
        );

      return await lastValueFrom(response$);
    } catch (error) {
      this.logger.error(
        `Failed to queue payment processing: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Queue a payment notification request
   */
  async queuePaymentNotification(
    message: PaymentNotificationMessage,
  ): Promise<PaymentNotificationResponse> {
    try {
      this.logger.log(
        `Queueing payment notification for payment: ${message.paymentId}`,
      );

      const response$ = this.paymentClient
        .send<PaymentNotificationResponse>(
          RABBITMQ_ROUTING_KEYS.PAYMENT_NOTIFY,
          message,
        )
        .pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((error) => {
            this.logger.error(
              `Error queueing payment notification: ${error.message}`,
              error.stack,
            );
            throw error;
          }),
        );

      return await lastValueFrom(response$);
    } catch (error) {
      this.logger.error(
        `Failed to queue payment notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Emit an event (fire-and-forget) for payment processing
   * Use this when you don't need to wait for a response
   */
  emitPaymentProcessing(message: ProcessPaymentMessage): void {
    try {
      this.logger.log(
        `Emitting payment processing event for reference: ${message.referenceNumber}`,
      );

      this.paymentClient.emit(RABBITMQ_ROUTING_KEYS.PAYMENT_PROCESS, message);
    } catch (error) {
      this.logger.error(
        `Failed to emit payment processing event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emit an event for payment notification
   */
  emitPaymentNotification(message: PaymentNotificationMessage): void {
    try {
      this.logger.log(
        `Emitting payment notification event for payment: ${message.paymentId}`,
      );

      this.paymentClient.emit(RABBITMQ_ROUTING_KEYS.PAYMENT_NOTIFY, message);
    } catch (error) {
      this.logger.error(
        `Failed to emit payment notification event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * NOTE: We don't call connect() explicitly because:
   * 1. Calling connect() creates a reply queue for RPC which can cause issues
   * 2. The client will auto-connect on first emit()/send()
   * 3. This avoids the 406 PRECONDITION_FAILED error with reply queues
   */

  /**
   * Called when the module is destroyed
   */
  async onModuleDestroy() {
    try {
      await this.paymentClient.close();
      this.logger.log('Payment producer disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error(
        `Failed to disconnect payment producer from RabbitMQ: ${error.message}`,
        error.stack,
      );
    }
  }
}
