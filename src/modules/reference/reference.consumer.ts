import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import { ReferenceService } from './reference.service';
import { ReferenceProducer } from './reference.producer';
import {
  CreateReferenceMessage,
  BulkReferenceMessage,
  ValidateReferenceMessage,
  ReferenceCreatedResponse,
  BulkReferenceResponse,
  ReferenceValidationResponse,
} from './dto/reference-queue.dto';

@Controller()
export class ReferenceConsumer {
  private readonly logger = new Logger(ReferenceConsumer.name);

  constructor(
    private readonly referenceService: ReferenceService,
    private readonly referenceProducer: ReferenceProducer,
  ) {}

  /**
   * Handle single reference creation messages
   */
  @MessagePattern(RABBITMQ_ROUTING_KEYS.REFERENCE_CREATE)
  async handleReferenceCreation(
    @Payload() message: CreateReferenceMessage,
    @Ctx() context: RmqContext,
  ): Promise<ReferenceCreatedResponse> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Processing reference creation for customer: ${message.customerName}`,
      );

      // Create the reference using the existing service
      const createDto = {
        serviceProviderId: message.serviceProviderId,
        customerName: message.customerName,
        customerPhone: message.customerPhone,
        customerEmail: message.customerEmail,
        customerId: message.customerId,
        customerIdType: message.customerIdType,
        customerAccount: message.customerAccount,
        amount: message.amount,
        minPaymentAmount: message.minPaymentAmount,
        paymentOption: message.paymentOption,
        description: message.description,
        currency: message.currency,
        exchangeRate: message.exchangeRate,
        workstation: message.workstation,
        issuedBy: message.issuedBy,
        approvedBy: message.approvedBy,
        expiresAt: message.expiresAt
          ? (typeof message.expiresAt === 'string' ? message.expiresAt : message.expiresAt.toISOString())
          : undefined,
        metadata: message.metadata,
        lineItems: message.lineItems,
      };

      const reference = await this.referenceService.create(createDto);

      // Acknowledge the message
      channel.ack(originalMsg);

      this.logger.log(
        `Successfully created reference: ${reference.referenceNumber}`,
      );

      // Queue callback notification if URL provided
      if (message.callbackUrl) {
        this.logger.log(`Queueing callback notification to: ${message.callbackUrl}`);
        this.referenceProducer.emitNotification({
          callbackUrl: message.callbackUrl,
          requestId: message.requestId,
          apiKey: reference.serviceProvider?.apiKey,
          serviceProviderId: reference.serviceProviderId ?? reference.serviceProvider?.id,
          success: true,
          referenceNumber: reference.referenceNumber,
          reference: {
            id: reference.id,
            referenceNumber: reference.referenceNumber,
            customerName: reference.customerName,
            customerPhone: reference.customerPhone,
            amount: reference.amount,
            currency: reference.currency,
            status: reference.status,
            expiresAt: reference.expiresAt,
            createdAt: reference.createdAt,
          },
          retryCount: 0,
        });
      }

      return {
        success: true,
        referenceNumber: reference.referenceNumber,
        reference,
        requestId: message.requestId,
      };
    } catch (error) {
      this.logger.error(
        `Error processing reference creation: ${error.message}`,
        error.stack,
      );

      // Check if error is a validation error (NotFoundException, BadRequestException)
      // These should NOT be requeued as they will always fail
      const isValidationError = error.name === 'NotFoundException' ||
                                 error.name === 'BadRequestException' ||
                                 error.message.includes('not found') ||
                                 error.message.includes('Service provider');

      if (isValidationError) {
        // Acknowledge the message to remove it from queue
        // Send callback notification if URL provided
        channel.ack(originalMsg);
        this.logger.warn(`Validation error - message removed from queue: ${error.message}`);

        if (message.callbackUrl) {
          this.referenceProducer.emitNotification({
            callbackUrl: message.callbackUrl,
            requestId: message.requestId,
            success: false,
            error: error.message,
            retryCount: 0,
          });
        }
      } else {
        // Negative acknowledge with requeue for transient errors (DB connection, etc.)
        // After max retries (configured in queue), it will go to DLX
        channel.nack(originalMsg, false, true);
      }

      return {
        success: false,
        error: error.message,
        requestId: message.requestId,
      };
    }
  }

  /**
   * Handle bulk reference generation messages
   */
  @MessagePattern(RABBITMQ_ROUTING_KEYS.REFERENCE_BULK)
  async handleBulkReferenceGeneration(
    @Payload() message: BulkReferenceMessage,
    @Ctx() context: RmqContext,
  ): Promise<BulkReferenceResponse> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Processing bulk reference generation for ${message.references.length} references`,
      );

      const results = [];
      const errors = [];
      let successCount = 0;

      // Process each reference
      for (let i = 0; i < message.references.length; i++) {
        const refData = message.references[i];
        try {
          const createDto = {
            serviceProviderId: message.serviceProviderId,
            ...refData,
            expiresAt: refData.expiresAt
              ? (typeof refData.expiresAt === 'string' ? refData.expiresAt : refData.expiresAt.toISOString())
              : undefined,
          };

          const reference = await this.referenceService.create(createDto);
          results.push(reference);
          successCount++;
        } catch (error) {
          this.logger.error(
            `Error creating reference ${i + 1}: ${error.message}`,
          );
          errors.push({
            index: i,
            error: error.message,
          });
        }
      }

      // Acknowledge the message
      channel.ack(originalMsg);

      this.logger.log(
        `Bulk reference generation completed: ${successCount}/${message.references.length} successful`,
      );

      return {
        success: successCount > 0,
        totalRequested: message.references.length,
        totalCreated: successCount,
        references: results,
        errors: errors.length > 0 ? errors : undefined,
        requestId: message.requestId,
      };
    } catch (error) {
      this.logger.error(
        `Error processing bulk reference generation: ${error.message}`,
        error.stack,
      );

      // Negative acknowledge with requeue
      channel.nack(originalMsg, false, true);

      return {
        success: false,
        totalRequested: message.references.length,
        totalCreated: 0,
        errors: [{ index: -1, error: error.message }],
        requestId: message.requestId,
      };
    }
  }

  /**
   * Handle reference validation messages
   */
  @MessagePattern(RABBITMQ_ROUTING_KEYS.REFERENCE_VALIDATE)
  async handleReferenceValidation(
    @Payload() message: ValidateReferenceMessage,
    @Ctx() context: RmqContext,
  ): Promise<ReferenceValidationResponse> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Processing reference validation for: ${message.referenceNumber}`,
      );

      // Find the reference
      const reference = await this.referenceService.findByReferenceNumber(
        message.referenceNumber,
      );

      // Check if reference is valid
      const isValid = reference.isValid();
      const reason = isValid ? undefined : `Reference status: ${reference.status}`;

      // Acknowledge the message
      channel.ack(originalMsg);

      this.logger.log(
        `Reference validation completed: ${message.referenceNumber} - ${isValid ? 'Valid' : 'Invalid'}`,
      );

      return {
        valid: isValid,
        referenceNumber: message.referenceNumber,
        reference,
        reason,
        requestId: message.requestId,
      };
    } catch (error) {
      this.logger.error(
        `Error processing reference validation: ${error.message}`,
        error.stack,
      );

      // For validation, we acknowledge even on error and return invalid
      channel.ack(originalMsg);

      return {
        valid: false,
        referenceNumber: message.referenceNumber,
        reason: error.message,
        requestId: message.requestId,
      };
    }
  }
}
