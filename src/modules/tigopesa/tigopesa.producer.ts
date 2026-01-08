import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import { TigoPesaPaymentMessage } from './dto/tigopesa-queue.dto';

@Injectable()
export class TigoPesaProducer {
  private readonly logger = new Logger(TigoPesaProducer.name);

  constructor(
    @Inject('TIGOPESA_SERVICE') private readonly tigopesaClient: ClientProxy,
  ) {}

  /**
   * [BACKUP/FALLBACK] Queue TigoPesa payment for async processing
   *
   * NOTE: This is kept as a backup method for future use.
   * Currently, TigoPesa processes synchronously in the webhook endpoint.
   * This async queue can be re-enabled later if needed for:
   * - High volume processing
   * - Long-running operations
   * - Retry mechanisms
   *
   * Fire-and-forget pattern for fast webhook response
   */
  emitPaymentProcessing(message: TigoPesaPaymentMessage): void {
    try {
      this.logger.log(
        `Queueing TigoPesa payment for processing: ${message.txnId} - Amount: ${message.amount} - Reference: ${message.customerReferenceId}`,
      );

      this.tigopesaClient.emit(
        RABBITMQ_ROUTING_KEYS.TIGOPESA_PAYMENT_PROCESS,
        message,
      );

      this.logger.debug(`Payment queued successfully: ${message.txnId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue TigoPesa payment: ${error.message}`,
        error.stack,
      );
      // Don't throw - webhook must respond quickly
      // Error logged for monitoring
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
      await this.tigopesaClient.close();
      this.logger.log('TigoPesa producer disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error(
        `Failed to disconnect TigoPesa producer from RabbitMQ: ${error.message}`,
        error.stack,
      );
    }
  }
}
