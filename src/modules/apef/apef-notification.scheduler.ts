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
      // warn, not debug: overlapping runs mean a run is taking over 5 minutes,
      // which is worth seeing in production logs.
      this.logger.warn('APEF notification retry job already running, skipping');
      return;
    }

    this.isRunning = true;

    try {
      this.logger.log('Starting APEF notification retry job');

      const result = await this.apefPaymentService.retryPendingNotifications();

      // Always log at info. A silent apef log used to be ambiguous: nothing
      // pending and the job never running looked exactly the same, because
      // debug is dropped when LOG_LEVEL=info in production.
      this.logger.log(
        `APEF notification retry completed: processed=${result.processed}, ` +
        `succeeded=${result.succeeded}, failed=${result.failed}, ` +
        `exhausted=${result.exhausted}`,
      );
    } catch (error) {
      this.logger.error(`APEF notification retry job failed: ${error.message}`, error.stack);
    } finally {
      this.isRunning = false;
    }
  }
}
