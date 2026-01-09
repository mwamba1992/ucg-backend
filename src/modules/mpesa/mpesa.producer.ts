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
   * Queue M-Pesa payment for async processing
   * This is called immediately after receiving M-Pesa notification
   * Fire-and-forget pattern for fast webhook response
   */
  emitPaymentProcessing(message: MpesaPaymentMessage): void {
    try {
      this.logger.log(
        `Queueing M-Pesa payment for processing: ${message.mpesaReceipt} - Amount: ${message.amount} - Reference: ${message.referenceNumber}`,
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
      // Don't throw - webhook must respond quickly
      // Error logged for monitoring
    }
  }

  /**
   * Queue M-Pesa callback to be sent
   * This is called after payment processing completes
   * Callback will be sent with retry logic
   */
  emitCallback(message: MpesaCallbackMessage): void {
    try {
      this.logger.log(
        `Queueing M-Pesa callback: ${message.conversationId} - Result: ${message.resultCode} (${message.resultType})`,
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
   * Queue M-Pesa validation request (optional feature)
   * Can be used for pre-validation before accepting payment
   */
  emitValidation(message: MpesaValidationMessage): void {
    try {
      this.logger.log(
        `Queueing M-Pesa validation: ${message.referenceNumber} - Amount: ${message.amount}`,
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

  /**
   * NOTE: We don't call connect() explicitly because:
   * 1. We only use emit() (fire-and-forget), not send() (RPC)
   * 2. Calling connect() creates a reply queue for RPC which we don't need
   * 3. The client will auto-connect on first emit()
   * 4. This avoids the 406 PRECONDITION_FAILED error with reply queues
   */

  /**
   * Disconnect from RabbitMQ on module destruction
   */
  async onModuleDestroy() {
    try {
      await this.mpesaClient.close();
      this.logger.log('M-Pesa producer disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error(
        `Failed to disconnect M-Pesa producer from RabbitMQ: ${error.message}`,
        error.stack,
      );
    }
  }
}
