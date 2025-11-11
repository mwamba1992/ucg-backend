import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReferenceProducer } from './reference.producer';
import { ReferenceNotificationMessage } from './dto/reference-queue.dto';

@ApiTags('Admin - Notification Management')
@Controller('admin/notifications')
export class AdminNotificationController {
  constructor(private readonly referenceProducer: ReferenceProducer) {}

  @Post('retry-failed')
  @ApiOperation({
    summary: 'Manually retry a failed callback from DLQ',
    description: 'Retrieves a failed callback message and re-queues it for retry'
  })
  @ApiResponse({
    status: 200,
    description: 'Callback re-queued successfully',
  })
  async retryFailedCallback(@Body() message: ReferenceNotificationMessage) {
    // Reset retry count for manual retry
    message.retryCount = 0;

    // Re-queue the notification
    this.referenceProducer.emitNotification(message);

    return {
      success: true,
      message: 'Callback re-queued for retry',
      callbackUrl: message.callbackUrl,
      requestId: message.requestId,
    };
  }

  @Get('dlq-info')
  @ApiOperation({
    summary: 'Get Dead Letter Queue information',
    description: 'Returns instructions on how to view and manage failed callbacks'
  })
  @ApiResponse({
    status: 200,
    description: 'DLQ information',
  })
  getDLQInfo() {
    return {
      message: 'Dead Letter Queue (DLQ) stores messages that failed after max retries',
      queue_name: 'ucg.reference.notification.dlq',
      exchange: 'ucg.dlx',
      routing_key: 'reference.notification.failed',
      max_retries: 3,
      retry_delays: '5s, 10s, 15s (exponential backoff)',
      how_to_view: [
        '1. Using RabbitMQ Management UI: http://localhost:15672',
        '2. Using CLI: docker exec rabbitmq rabbitmqctl list_queues name messages',
        '3. Get message: docker exec rabbitmq rabbitmqadmin get queue=ucg.reference.notification.dlq count=1',
      ],
      how_to_retry: [
        '1. Get the failed message from DLQ',
        '2. POST to /admin/notifications/retry-failed with the message body',
        '3. Message will be re-queued with retry count reset to 0',
      ],
      prevention: [
        'Ensure service provider callback URLs are always reachable',
        'Monitor DLQ regularly for failed callbacks',
        'Set up alerts when DLQ message count exceeds threshold',
      ],
    };
  }
}
