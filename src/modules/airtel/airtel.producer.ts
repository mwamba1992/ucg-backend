import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import { AirtelPaymentMessage } from './dto/airtel-queue.dto';

@Injectable()
export class AirtelProducer {
  private readonly logger = new Logger(AirtelProducer.name);

  constructor(
    @Inject('AIRTEL_SERVICE') private readonly airtelClient: ClientProxy,
  ) {}

  /**
   * Queue Airtel payment for async processing (backup/fallback)
   * Currently payments are processed synchronously in the webhook endpoint.
   */
  emitPaymentProcessing(message: AirtelPaymentMessage): void {
    try {
      this.logger.log(
        `Queueing Airtel payment for processing: ${message.txnId} - Amount: ${message.amount} - Reference: ${message.customerReferenceId}`,
      );

      this.airtelClient.emit(
        RABBITMQ_ROUTING_KEYS.AIRTEL_PAYMENT_PROCESS,
        message,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue Airtel payment: ${error.message}`,
        error.stack,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.airtelClient.close();
      this.logger.log('Airtel producer disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error(
        `Failed to disconnect Airtel producer from RabbitMQ: ${error.message}`,
        error.stack,
      );
    }
  }
}
