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
   * Queue TigoPesa payment for async processing
   * This is called immediately after receiving TigoPesa notification
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
   * Connect to RabbitMQ on module initialization
   */
  async onModuleInit() {
    try {
      await this.tigopesaClient.connect();
      this.logger.log('TigoPesa producer connected to RabbitMQ');
    } catch (error) {
      this.logger.error(
        `Failed to connect TigoPesa producer to RabbitMQ: ${error.message}`,
        error.stack,
      );
    }
  }

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
