import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApefPaymentService } from './apef-payment.service';
import { ApefPaymentRequestDto } from './dto/apef.dto';
import { ApefPaymentStatus, ApefChannel } from './entities/apef-payment.entity';
import { ApefReferenceStatus } from './entities/apef-reference.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('apef')
export class ApefController {
  private readonly logger = new Logger(ApefController.name);

  constructor(
    private readonly apefPaymentService: ApefPaymentService,
  ) {}

  /**
   * @deprecated - Use normal payment channels (M-Pesa, TigoPesa, PSP) instead.
   * Those channels automatically route to APEF if reference starts with "001" or "002".
   *
   * Direct APEF payment endpoint (for testing/admin purposes only)
   * POST /apef/payments
   */
  @Public()
  @Post('payments')
  @HttpCode(HttpStatus.OK)
  async processApefPayment(@Body() dto: ApefPaymentRequestDto) {
    this.logger.log(`[DEPRECATED] Received direct APEF payment request: ${JSON.stringify(dto)}`);
    this.logger.warn(
      'Direct APEF endpoint is deprecated. Use M-Pesa, TigoPesa, or PSP payment endpoints instead.',
    );
    return this.apefPaymentService.processPayment(dto);
  }

  /**
   * List all APEF payments with pagination and filters
   * GET /apef/payments/list
   */
  @Public()
  @Get('payments/list')
  async listPayments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ApefPaymentStatus,
    @Query('channel') channel?: ApefChannel,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.apefPaymentService.listPayments({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      channel,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return {
      success: true,
      ...result,
    };
  }

  /**
   * List all APEF references with pagination and filters
   * GET /apef/references/list
   */
  @Public()
  @Get('references/list')
  async listReferences(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ApefReferenceStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.apefPaymentService.listReferences({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get single APEF reference by reference number
   * GET /apef/references/:referenceNumber
   */
  @Public()
  @Get('references/:referenceNumber')
  async getReference(@Param('referenceNumber') referenceNumber: string) {
    const reference = await this.apefPaymentService.getReference(referenceNumber);
    if (!reference) {
      return { success: false, message: 'Reference not found' };
    }
    return { success: true, reference };
  }

  /**
   * Check if reference is APEF type
   * GET /apef/reference/check/:reference
   */
  @Public()
  @Get('reference/check/:reference')
  async checkReference(@Param('reference') reference: string) {
    const isApef = this.apefPaymentService.isApefReference(reference);
    return {
      reference,
      isApef,
      flow: isApef ? 'APEF' : 'INTERNAL',
      message: isApef
        ? 'Reference starts with 001 or 002 - will be processed via APEF flow'
        : 'Reference does not start with 001 or 002 - will be processed via Internal flow',
    };
  }

  /**
   * Get payment by ID
   * GET /apef/payments/:id
   */
  @Public()
  @Get('payments/:id')
  async getPayment(@Param('id') id: string) {
    const payment = await this.apefPaymentService.getPayment(id);
    if (!payment) {
      return { success: false, message: 'Payment not found' };
    }
    return { success: true, payment };
  }

  /**
   * Get payments by reference number
   * GET /apef/payments/reference/:referenceNumber
   */
  @Public()
  @Get('payments/reference/:referenceNumber')
  async getPaymentsByReference(@Param('referenceNumber') referenceNumber: string) {
    const payments = await this.apefPaymentService.getPaymentsByReference(referenceNumber);
    return {
      success: true,
      referenceNumber,
      count: payments.length,
      payments,
    };
  }

  /**
   * Get APEF payment statistics
   * GET /apef/statistics
   */
  @Public()
  @Get('statistics')
  async getStatistics() {
    return this.apefPaymentService.getStatistics();
  }

  /**
   * Manually trigger retry for pending APEF notifications
   * POST /apef/notifications/retry
   */
  @Post('notifications/retry')
  async retryPendingNotifications() {
    this.logger.log('Manual trigger: Retrying pending APEF notifications');
    return this.apefPaymentService.retryPendingNotifications();
  }
}
