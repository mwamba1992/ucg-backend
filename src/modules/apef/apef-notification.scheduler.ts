import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApefPaymentService } from './apef-payment.service';

@Injectable()
export class ApefNotificationScheduler {
  private readonly logger = new Logger(ApefNotificationScheduler.name);
  private isRunning = false;

  constructor(private readonly apefPaymentService: ApefPaymentService) {}

  /**
   * Retry pending APEF notifications every 5 minutes
   *
   * Payments with status PENDING_APEF_NOTIFICATION are retried
   * until they succeed and move to COMPLETED status.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRetryPendingNotifications() {
    // Prevent overlapping runs
    if (this.isRunning) {
      this.logger.debug('APEF notification retry job already running, skipping');
      return;
    }

    this.isRunning = true;

    try {
      this.logger.log('Starting APEF notification retry job');

      const result = await this.apefPaymentService.retryPendingNotifications();

      if (result.processed > 0) {
        this.logger.log(
          `APEF notification retry completed: processed=${result.processed}, ` +
          `succeeded=${result.succeeded}, failed=${result.failed}`,
        );
      } else {
        this.logger.debug('No pending APEF notifications to retry');
      }
    } catch (error) {
      this.logger.error(`APEF notification retry job failed: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }
}
