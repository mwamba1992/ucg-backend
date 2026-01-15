import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as xml2js from 'xml2js';
import * as crypto from 'crypto';
import {
  TigoPesaTransaction,
  TigoPesaTransactionStatus,
} from './entities/tigopesa-transaction.entity';
import { TigoPesaConfig } from './entities/tigopesa-config.entity';
import {
  TigoPesaBillPayRequestDto,
  TigoPesaBillPayResponseDto,
  TigoPesaErrorCode,
  TigoPesaResult,
} from './dto/tigopesa-notification.dto';
import {
  TigoPesaPaymentMessage,
  TigoPesaPaymentProcessingResponse,
} from './dto/tigopesa-queue.dto';
import { ReferenceService } from '../reference/reference.service';
import { PaymentService } from '../payment/payment.service';
import { CBSService } from '../cbs/cbs.service';
import { TransferType } from '../cbs/entities/cbs-transfer.entity';

@Injectable()
export class TigoPesaService {
  private readonly logger = new Logger(TigoPesaService.name);

  constructor(
    @InjectRepository(TigoPesaTransaction)
    private readonly tigopesaTransactionRepo: Repository<TigoPesaTransaction>,
    @InjectRepository(TigoPesaConfig)
    private readonly tigopesaConfigRepo: Repository<TigoPesaConfig>,
    private readonly configService: ConfigService,
    private readonly referenceService: ReferenceService,
    private readonly paymentService: PaymentService,
    private readonly cbsService: CBSService,
  ) {}

  /**
   * Parse TigoPesa XML notification to DTO
   */
  async parseXmlNotification(xmlBody: string): Promise<TigoPesaBillPayRequestDto> {
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlBody);

      // Extract data from COMMAND element
      const command = result.COMMAND;

      return {
        TYPE: command.TYPE,
        TXNID: command.TXNID,
        MSISDN: command.MSISDN,
        AMOUNT: parseFloat(command.AMOUNT),
        COMPANYNAME: command.COMPANYNAME,
        CUSTOMERREFERENCEID: command.CUSTOMERREFERENCEID,
        SENDERNAME: command.SENDERNAME,
      };
    } catch (error) {
      this.logger.error(`Failed to parse TigoPesa XML notification: ${error.message}`);
      throw new BadRequestException('Invalid XML format');
    }
  }

  /**
   * Build TigoPesa response XML
   */
  buildResponseXml(response: TigoPesaBillPayResponseDto): string {
    const builder = new xml2js.Builder({ rootName: 'COMMAND', headless: true });

    return `<?xml version="1.0"?>\n${builder.buildObject(response)}`;
  }

  /**
   * Validate notification format
   */
  validateNotificationFormat(notification: TigoPesaBillPayRequestDto): void {
    const errors: string[] = [];

    if (!notification.TYPE) errors.push('TYPE is required');
    if (!notification.TXNID) errors.push('TXNID is required');
    if (!notification.MSISDN) errors.push('MSISDN is required');
    if (!notification.AMOUNT || notification.AMOUNT <= 0) errors.push('Invalid AMOUNT');
    if (!notification.COMPANYNAME) errors.push('COMPANYNAME is required');
    if (!notification.CUSTOMERREFERENCEID) errors.push('CUSTOMERREFERENCEID is required');

    if (errors.length > 0) {
      throw new BadRequestException(`Invalid notification: ${errors.join(', ')}`);
    }
  }

  /**
   * Check for duplicate transaction
   */
  async checkDuplicate(txnId: string): Promise<boolean> {
    const existing = await this.tigopesaTransactionRepo.findOne({
      where: { txnId },
    });

    return !!existing;
  }

  /**
   * Validate reference and amount
   */
  async validateReference(
    referenceNumber: string,
    amount: number,
  ): Promise<{ valid: boolean; errorCode?: string; errorDescription?: string; reference?: any }> {
    try {
      // Find reference
      const reference = await this.referenceService.findByReferenceNumber(referenceNumber);

      if (!reference) {
        return {
          valid: false,
          errorCode: TigoPesaErrorCode.INVALID_REFERENCE,
          errorDescription: 'Reference not found',
        };
      }

      // Check if reference is valid (not expired, not cancelled)
      if (!reference.isValid()) {
        return {
          valid: false,
          errorCode: TigoPesaErrorCode.ACCOUNT_LOCKED,
          errorDescription: `Reference ${reference.status}`,
        };
      }

      // Check if already fully paid
      if (reference.isFullyPaid()) {
        return {
          valid: false,
          errorCode: TigoPesaErrorCode.ACCOUNT_LOCKED,
          errorDescription: 'Reference already fully paid',
        };
      }

      // Validate amount according to payment option
      const validation = reference.canAcceptPayment(amount);
      if (!validation.allowed) {
        // Determine appropriate error code based on validation reason
        let errorCode = TigoPesaErrorCode.INVALID_AMOUNT;
        if (validation.reason.includes('too low') || validation.reason.includes('less than')) {
          errorCode = TigoPesaErrorCode.AMOUNT_TOO_LOW;
        } else if (validation.reason.includes('too high') || validation.reason.includes('exceeds')) {
          errorCode = TigoPesaErrorCode.AMOUNT_TOO_HIGH;
        }

        return {
          valid: false,
          errorCode,
          errorDescription: validation.reason,
        };
      }

      return { valid: true, reference };
    } catch (error) {
      this.logger.error(`Reference validation failed: ${error.message}`);
      return {
        valid: false,
        errorCode: TigoPesaErrorCode.GENERAL_ERROR,
        errorDescription: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Create TigoPesa transaction record
   */
  async createTransaction(
    notification: TigoPesaBillPayRequestDto,
    status: TigoPesaTransactionStatus = TigoPesaTransactionStatus.RECEIVED,
  ): Promise<TigoPesaTransaction> {
    const transaction = this.tigopesaTransactionRepo.create({
      txnId: notification.TXNID,
      referenceNumber: notification.CUSTOMERREFERENCEID,
      amount: notification.AMOUNT,
      customerPhone: notification.MSISDN,
      customerName: notification.SENDERNAME,
      companyName: notification.COMPANYNAME,
      status,
      rawNotification: notification as any,
    });

    return await this.tigopesaTransactionRepo.save(transaction);
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    txnId: string,
    status: TigoPesaTransactionStatus,
    refId?: string,
    paymentId?: string,
    cbsTransferId?: string,
    resultCode?: string,
    errorDescription?: string,
  ): Promise<void> {
    await this.tigopesaTransactionRepo.update(
      { txnId },
      {
        status,
        refId,
        paymentId,
        cbsTransferId,
        resultCode,
        errorDescription,
        processedAt: status === TigoPesaTransactionStatus.COMPLETED ? new Date() : undefined,
      },
    );
  }

  /**
   * Get transaction by txnId
   */
  async getTransaction(txnId: string): Promise<TigoPesaTransaction> {
    return await this.tigopesaTransactionRepo.findOne({
      where: { txnId },
      relations: ['payment', 'cbsTransfer'],
    });
  }

  /**
   * Process TigoPesa payment (main business logic)
   *
   * This method is called:
   * 1. SYNCHRONOUSLY from the webhook endpoint (primary use)
   * 2. ASYNCHRONOUSLY from the queue consumer (backup/fallback - currently not used)
   *
   * Handles:
   * - Reference validation
   * - Payment creation
   * - CBS transfer
   * - Transaction status updates
   */
  async processPayment(
    message: TigoPesaPaymentMessage,
  ): Promise<TigoPesaPaymentProcessingResponse> {
    this.logger.log(`Processing TigoPesa payment: ${message.txnId}`);

    try {
      // 1. Validate reference and amount
      const validation = await this.validateReference(
        message.customerReferenceId,
        message.amount,
      );

      if (!validation.valid) {
        this.logger.warn(
          `TigoPesa payment validation failed: ${message.txnId} - ${validation.errorDescription}`,
        );

        await this.updateTransactionStatus(
          message.txnId,
          TigoPesaTransactionStatus.FAILED,
          null,
          null,
          null,
          validation.errorCode,
          validation.errorDescription,
        );

        return {
          success: false,
          txnId: message.txnId,
          errorCode: validation.errorCode,
          errorDescription: validation.errorDescription,
        };
      }

      const reference = validation.reference;

      // 2. Generate partner reference ID
      const refId = this.generateRefId();

      // 3. Create payment record (PaymentService handles CBS transfer internally)
      this.logger.log(
        `Creating payment record for ${message.customerReferenceId}: ${message.amount}`,
      );

      const payment = await this.paymentService.createPayment({
        referenceNumber: message.customerReferenceId,
        amountPaid: message.amount,
        paymentChannel: 'Mixx By Yas',
        fspCode: 'MIXX',
        payerName: message.senderName || message.msisdn,
        payerPhone: message.msisdn,
        transactionId: message.txnId,
        currency: reference.currency || 'TZS',
        description: `TigoPesa payment: ${message.txnId}`,
      });

      this.logger.log(`Payment created: ${payment.id} - CBS transfer handled by PaymentService`);

      // 4. Update TigoPesa transaction status
      await this.updateTransactionStatus(
        message.txnId,
        TigoPesaTransactionStatus.COMPLETED,
        refId,
        payment.id,
        null, // cbsTransferId managed by PaymentService
        TigoPesaErrorCode.SUCCESS,
      );

      this.logger.log(
        `TigoPesa payment processed successfully: ${message.txnId} - Payment ID: ${payment.id}`,
      );

      return {
        success: true,
        txnId: message.txnId,
        refId,
        paymentId: payment.id,
        cbsTransferId: undefined, // CBS transfer managed by PaymentService
        errorCode: TigoPesaErrorCode.SUCCESS,
      };
    } catch (error) {
      this.logger.error(
        `Error processing TigoPesa payment ${message.txnId}: ${error.message}`,
        error.stack,
      );

      await this.updateTransactionStatus(
        message.txnId,
        TigoPesaTransactionStatus.FAILED,
        null,
        null,
        null,
        TigoPesaErrorCode.GENERAL_ERROR,
        error.message,
      );

      return {
        success: false,
        txnId: message.txnId,
        errorCode: TigoPesaErrorCode.GENERAL_ERROR,
        errorDescription: error.message,
      };
    }
  }

  /**
   * Generate partner reference ID
   */
  private generateRefId(): string {
    // Generate unique reference ID: timestamp + random
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TG${timestamp.slice(-10)}${random}`;
  }

  /**
   * Get TigoPesa configuration
   */
  async getTigoPesaConfig(): Promise<TigoPesaConfig> {
    // Try to get from database first
    let config = await this.tigopesaConfigRepo.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    // If no config in database, create from environment variables
    if (!config) {
      const companyName = this.configService.get<string>('TIGOPESA_COMPANY_NAME');

      if (!companyName) {
        throw new Error('TigoPesa configuration not found in database or environment');
      }

      // Create config record
      config = this.tigopesaConfigRepo.create({
        companyName,
        webhookUrl: this.configService.get<string>('TIGOPESA_WEBHOOK_URL'),
        isActive: true,
      });

      config = await this.tigopesaConfigRepo.save(config);
      this.logger.log('TigoPesa config created from environment variables');
    }

    return config;
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const queryBuilder = this.tigopesaTransactionRepo.createQueryBuilder('tx');

    if (startDate && endDate) {
      queryBuilder.where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [total, received, processing, completed, failed] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: TigoPesaTransactionStatus.RECEIVED }).getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: TigoPesaTransactionStatus.PROCESSING }).getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: TigoPesaTransactionStatus.COMPLETED }).getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: TigoPesaTransactionStatus.FAILED }).getCount(),
    ]);

    // Get amount totals
    const totals = await queryBuilder
      .select('SUM(tx.amount)', 'totalAmount')
      .addSelect(
        'SUM(CASE WHEN tx.status = :completed THEN tx.amount ELSE 0 END)',
        'completedAmount',
      )
      .addSelect(
        'SUM(CASE WHEN tx.status = :failed THEN tx.amount ELSE 0 END)',
        'failedAmount',
      )
      .setParameter('completed', TigoPesaTransactionStatus.COMPLETED)
      .setParameter('failed', TigoPesaTransactionStatus.FAILED)
      .getRawOne();

    return {
      period: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate || new Date(),
      },
      transactions: {
        total,
        received,
        processing,
        completed,
        failed,
      },
      amounts: {
        total: parseFloat(totals.totalAmount) || 0,
        completed: parseFloat(totals.completedAmount) || 0,
        failed: parseFloat(totals.failedAmount) || 0,
        currency: 'TZS',
      },
      successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
    };
  }

  /**
   * Retry failed transaction
   */
  async retryTransaction(txnId: string): Promise<TigoPesaPaymentProcessingResponse> {
    const transaction = await this.getTransaction(txnId);

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    if (transaction.status !== TigoPesaTransactionStatus.FAILED) {
      throw new BadRequestException('Only failed transactions can be retried');
    }

    // Reset status to received
    await this.updateTransactionStatus(txnId, TigoPesaTransactionStatus.RECEIVED);

    // Process payment directly (no need to queue again)
    const message: TigoPesaPaymentMessage = {
      txnId: transaction.txnId,
      msisdn: transaction.customerPhone,
      amount: Number(transaction.amount),
      companyName: transaction.companyName,
      customerReferenceId: transaction.referenceNumber,
      senderName: transaction.customerName,
    };

    return await this.processPayment(message);
  }
}
