import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import { ReferenceProducer } from './reference.producer';
import { ReferenceNotificationMessage } from './dto/reference-queue.dto';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor(
    private readonly httpService: HttpService,
    private readonly referenceProducer: ReferenceProducer,
  ) {}

  /**
   * Handle notification callback messages
   */
  @MessagePattern(RABBITMQ_ROUTING_KEYS.REFERENCE_NOTIFY)
  async handleNotification(
    @Payload() message: ReferenceNotificationMessage,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const retryCount = message.retryCount || 0;

    try {
      this.logger.log(
        `Processing callback notification to: ${message.callbackUrl} (attempt ${retryCount + 1}/${this.MAX_RETRIES + 1})`,
      );

      // Send HTTP POST to callback URL
      const response = await firstValueFrom(
        this.httpService.post(message.callbackUrl, {
          success: message.success,
          referenceNumber: message.referenceNumber,
          reference: message.reference,
          error: message.error,
          requestId: message.requestId,
          timestamp: new Date().toISOString(),
        }, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'UCG-Webhook/1.0',
            'X-UCG-Retry-Count': retryCount.toString(),
          },
          timeout: 10000, // 10 second timeout
        }),
      );

      // Success
      channel.ack(originalMsg);
      this.logger.log(
        `Callback sent successfully to ${message.callbackUrl} - Status: ${response.status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send callback to ${message.callbackUrl}: ${error.message}`,
      );

      // Retry logic
      if (retryCount < this.MAX_RETRIES) {
        // Nack and requeue with incremented retry count
        this.logger.log(
          `Scheduling retry ${retryCount + 1}/${this.MAX_RETRIES} for ${message.callbackUrl}`,
        );

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (retryCount + 1)));

        // Re-emit with incremented retry count
        this.referenceProducer.emitNotification({
          ...message,
          retryCount: retryCount + 1,
        });

        // Acknowledge the current message since we've re-queued it
        channel.ack(originalMsg);
      } else {
        // Max retries exceeded
        this.logger.error(
          `Max retries (${this.MAX_RETRIES}) exceeded for callback to ${message.callbackUrl}. Moving to DLQ.`,
        );

        // Publish directly to DLX instead of relying on nack
        const dlxExchange = 'ucg.dlx';
        const dlxRoutingKey = 'reference.notification.failed';

        try {
          channel.publish(
            dlxExchange,
            dlxRoutingKey,
            Buffer.from(JSON.stringify(message)),
            {
              persistent: true,
              contentType: 'application/json',
              headers: {
                'x-original-queue': 'ucg.reference.notification',
                'x-death-reason': 'max-retries-exceeded',
                'x-retry-count': retryCount,
                'x-failed-at': new Date().toISOString(),
              },
            },
          );
          this.logger.log(`Message published to DLQ via ${dlxExchange}`);
        } catch (publishError) {
          this.logger.error(`Failed to publish to DLQ: ${publishError.message}`);
        }

        // Acknowledge the message since we've handled it
        channel.ack(originalMsg);
      }
    }
  }
}
