import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import { PaymentService } from './payment.service';
import {
  ProcessPaymentMessage,
  PaymentNotificationMessage,
  PaymentProcessedResponse,
  PaymentNotificationResponse,
} from './dto/payment-queue.dto';

@Controller()
export class PaymentConsumer {
  private readonly logger = new Logger(PaymentConsumer.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Handle payment processing messages
   */
  @MessagePattern(RABBITMQ_ROUTING_KEYS.PAYMENT_PROCESS)
  async handlePaymentProcessing(
    @Payload() message: ProcessPaymentMessage,
    @Ctx() context: RmqContext,
  ): Promise<PaymentProcessedResponse> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Processing payment for reference: ${message.referenceNumber}, amount: ${message.amountPaid}`,
      );

      // Create the payment using the existing service
      const createDto = {
        referenceNumber: message.referenceNumber,
        amountPaid: message.amountPaid,
        paymentChannel: message.paymentChannel,
        payerName: message.payerName,
        payerPhone: message.payerPhone,
        transactionId: message.transactionId,
        currency: message.currency,
        description: message.description,
      };

      const payment = await this.paymentService.createPayment(createDto);

      // Acknowledge the message
      channel.ack(originalMsg);

      this.logger.log(
        `Successfully processed payment: ${payment.id} for reference: ${message.referenceNumber}`,
      );

      return {
        success: true,
        payment,
        requestId: message.requestId,
      };
    } catch (error) {
      this.logger.error(
        `Error processing payment: ${error.message}`,
        error.stack,
      );

      // Determine if it's a validation error or system error
      const isValidationError = error.message.includes('not allowed') ||
        error.message.includes('not valid') ||
        error.message.includes('fully paid');

      if (isValidationError) {
        // Acknowledge validation errors (don't retry)
        channel.ack(originalMsg);

        return {
          success: false,
          validationError: error.message,
          requestId: message.requestId,
        };
      } else {
        // Negative acknowledge system errors (retry)
        channel.nack(originalMsg, false, true);

        return {
          success: false,
          error: error.message,
          requestId: message.requestId,
        };
      }
    }
  }

  /**
   * Handle payment notification messages
   */
  @MessagePattern(RABBITMQ_ROUTING_KEYS.PAYMENT_NOTIFY)
  async handlePaymentNotification(
    @Payload() message: PaymentNotificationMessage,
    @Ctx() context: RmqContext,
  ): Promise<PaymentNotificationResponse> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Processing payment notification for payment: ${message.paymentId}, type: ${message.notificationType}`,
      );

      // TODO: Implement actual notification logic based on type
      // This is a placeholder for future notification implementation
      let notificationId: string;

      switch (message.notificationType) {
        case 'EMAIL':
          this.logger.log(`Sending email notification for payment: ${message.paymentId}`);
          // await this.sendEmailNotification(message);
          notificationId = `email-${Date.now()}`;
          break;

        case 'SMS':
          this.logger.log(`Sending SMS notification for payment: ${message.paymentId}`);
          // await this.sendSmsNotification(message);
          notificationId = `sms-${Date.now()}`;
          break;

        case 'WEBHOOK':
          this.logger.log(`Sending webhook notification for payment: ${message.paymentId}`);
          // await this.sendWebhookNotification(message);
          notificationId = `webhook-${Date.now()}`;
          break;

        default:
          throw new Error(`Unknown notification type: ${message.notificationType}`);
      }

      // Acknowledge the message
      channel.ack(originalMsg);

      this.logger.log(
        `Successfully sent payment notification: ${notificationId}`,
      );

      return {
        success: true,
        notificationId,
        notificationType: message.notificationType,
        requestId: message.requestId,
      };
    } catch (error) {
      this.logger.error(
        `Error processing payment notification: ${error.message}`,
        error.stack,
      );

      // Negative acknowledge with requeue (retry notifications)
      channel.nack(originalMsg, false, true);

      return {
        success: false,
        notificationType: message.notificationType,
        error: error.message,
        requestId: message.requestId,
      };
    }
  }

  // TODO: Implement actual notification methods
  // private async sendEmailNotification(message: PaymentNotificationMessage): Promise<void> { }
  // private async sendSmsNotification(message: PaymentNotificationMessage): Promise<void> { }
  // private async sendWebhookNotification(message: PaymentNotificationMessage): Promise<void> { }
}
