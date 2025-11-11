import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import {
  CreateReferenceMessage,
  BulkReferenceMessage,
  ValidateReferenceMessage,
  ReferenceCreatedResponse,
  BulkReferenceResponse,
  ReferenceValidationResponse,
} from './dto/reference-queue.dto';

@Injectable()
export class ReferenceProducer {
  private readonly logger = new Logger(ReferenceProducer.name);
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor(
    @Inject('REFERENCE_SERVICE') private readonly referenceClient: ClientProxy,
  ) {}

  /**
   * Queue a single reference creation request
   */
  async queueReferenceCreation(
    message: CreateReferenceMessage,
  ): Promise<ReferenceCreatedResponse> {
    try {
      this.logger.log(
        `Queueing reference creation for customer: ${message.customerName}`,
      );

      const response$ = this.referenceClient
        .send<ReferenceCreatedResponse>(
          RABBITMQ_ROUTING_KEYS.REFERENCE_CREATE,
          message,
        )
        .pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((error) => {
            this.logger.error(
              `Error queueing reference creation: ${error.message}`,
              error.stack,
            );
            throw error;
          }),
        );

      return await lastValueFrom(response$);
    } catch (error) {
      this.logger.error(
        `Failed to queue reference creation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Queue a bulk reference generation request
   */
  async queueBulkReferenceGeneration(
    message: BulkReferenceMessage,
  ): Promise<BulkReferenceResponse> {
    try {
      this.logger.log(
        `Queueing bulk reference generation for ${message.references.length} references`,
      );

      const response$ = this.referenceClient
        .send<BulkReferenceResponse>(
          RABBITMQ_ROUTING_KEYS.REFERENCE_BULK,
          message,
        )
        .pipe(
          timeout(this.REQUEST_TIMEOUT * 2), // Longer timeout for bulk operations
          catchError((error) => {
            this.logger.error(
              `Error queueing bulk reference generation: ${error.message}`,
              error.stack,
            );
            throw error;
          }),
        );

      return await lastValueFrom(response$);
    } catch (error) {
      this.logger.error(
        `Failed to queue bulk reference generation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Queue a reference validation request
   */
  async queueReferenceValidation(
    message: ValidateReferenceMessage,
  ): Promise<ReferenceValidationResponse> {
    try {
      this.logger.log(
        `Queueing reference validation for: ${message.referenceNumber}`,
      );

      const response$ = this.referenceClient
        .send<ReferenceValidationResponse>(
          RABBITMQ_ROUTING_KEYS.REFERENCE_VALIDATE,
          message,
        )
        .pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((error) => {
            this.logger.error(
              `Error queueing reference validation: ${error.message}`,
              error.stack,
            );
            throw error;
          }),
        );

      return await lastValueFrom(response$);
    } catch (error) {
      this.logger.error(
        `Failed to queue reference validation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Emit an event (fire-and-forget) for reference creation
   * Use this when you don't need to wait for a response
   */
  emitReferenceCreated(message: CreateReferenceMessage): void {
    try {
      this.logger.log(
        `Emitting reference creation event for customer: ${message.customerName}`,
      );

      this.referenceClient.emit(
        RABBITMQ_ROUTING_KEYS.REFERENCE_CREATE,
        message,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit reference creation event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emit an event for bulk reference generation
   */
  emitBulkReferenceGeneration(message: BulkReferenceMessage): void {
    try {
      this.logger.log(
        `Emitting bulk reference generation event for ${message.references.length} references`,
      );

      this.referenceClient.emit(RABBITMQ_ROUTING_KEYS.REFERENCE_BULK, message);
    } catch (error) {
      this.logger.error(
        `Failed to emit bulk reference generation event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Called when the module is initialized
   */
  async onModuleInit() {
    try {
      await this.referenceClient.connect();
      this.logger.log('Reference producer connected to RabbitMQ');
    } catch (error) {
      this.logger.error(
        `Failed to connect reference producer to RabbitMQ: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Called when the module is destroyed
   */
  async onModuleDestroy() {
    try {
      await this.referenceClient.close();
      this.logger.log('Reference producer disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error(
        `Failed to disconnect reference producer from RabbitMQ: ${error.message}`,
        error.stack,
      );
    }
  }
}
