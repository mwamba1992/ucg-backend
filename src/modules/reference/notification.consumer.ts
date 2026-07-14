import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { RABBITMQ_ROUTING_KEYS } from '../../config/rabbitmq.config';
import { ReferenceProducer } from './reference.producer';
import { ReferenceNotificationMessage } from './dto/reference-queue.dto';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor(
    private readonly httpService: HttpService,
    private readonly referenceProducer: ReferenceProducer,
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,
  ) {}

  /**
   * Resolve the x-api-key to send. Reads the SP's current key from the DB so
   * an edited key always takes effect (no stale snapshot); falls back to the
   * key captured on the queue message if the live lookup is unavailable.
   */
  private async resolveApiKey(
    message: ReferenceNotificationMessage,
  ): Promise<string | undefined> {
    if (message.serviceProviderId) {
      try {
        const sp = await this.serviceProviderRepository.findOne({
          where: { id: message.serviceProviderId },
          select: ['id', 'apiKey'],
        });
        if (sp?.apiKey) {
          return sp.apiKey;
        }
      } catch (error) {
        this.logger.warn(
          `Could not load live API key for SP ${message.serviceProviderId}, ` +
            `falling back to message snapshot: ${error.message}`,
        );
      }
    }
    return message.apiKey;
  }

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

      const body = {
        success: message.success,
        referenceNumber: message.referenceNumber,
        reference: message.reference,
        error: message.error,
        requestId: message.requestId,
        timestamp: new Date().toISOString(),
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'UCG-Webhook/1.0',
        'X-UCG-Retry-Count': retryCount.toString(),
      };

      // Attach the SP's API key so the SP can authenticate the callback.
      // Resolved live from the DB so an edited key takes effect immediately.
      const apiKey = await this.resolveApiKey(message);
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      // Log exactly what we send (secrets masked) so we can prove which
      // headers went out when an SP claims a header is missing.
      this.logger.log(
        `Sending callback to ${message.callbackUrl}\n` +
          `Headers: ${JSON.stringify(this.maskHeaders(headers))}\n` +
          `Body: ${JSON.stringify(body)}`,
      );

      // Send HTTP POST to callback URL
      const response = await firstValueFrom(
        this.httpService.post(message.callbackUrl, body, {
          headers,
          timeout: 10000, // 10 second timeout
        }),
      );

      // Success
      channel.ack(originalMsg);
      const responseBody =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);
      this.logger.log(
        `Callback response from ${message.callbackUrl} - Status: ${response.status} - Body: ${responseBody}`,
      );
    } catch (error) {
      const errResponse = error.response
        ? ` - Status: ${error.response.status} - Body: ${
            typeof error.response.data === 'string'
              ? error.response.data
              : JSON.stringify(error.response.data)
          }`
        : '';
      this.logger.error(
        `Failed to send callback to ${message.callbackUrl}: ${error.message}${errResponse}`,
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

  /**
   * Return a copy of outbound headers with sensitive values masked, so the
   * header set can be logged safely (proves presence without leaking secrets).
   */
  private maskHeaders(headers: Record<string, string>): Record<string, string> {
    const SENSITIVE = ['x-api-key', 'X-UCG-Signature', 'Authorization'];
    const masked: Record<string, string> = { ...headers };
    for (const key of SENSITIVE) {
      if (masked[key]) {
        masked[key] = this.maskSecret(masked[key]);
      }
    }
    return masked;
  }

  private maskSecret(value: string): string {
    if (!value) return value;
    if (value.length <= 8) return '****';
    return `${value.slice(0, 4)}…${value.slice(-4)} (len ${value.length})`;
  }
}
