import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ApefReference, ApefReferenceStatus } from './entities/apef-reference.entity';
import { ApefPayment, ApefPaymentStatus, ApefChannel } from './entities/apef-payment.entity';
import { ApefClientService } from './apef-client.service';
import { CBSService } from '../cbs/cbs.service';
import { TransferType } from '../cbs/entities/cbs-transfer.entity';
import {
  ApefPaymentRequestDto,
  ApefPaymentResponseDto,
  ApefErrorCode,
  ApefDepositNotificationRequestDto,
} from './dto/apef.dto';
import { FinancialServiceProvider } from '../financial-service-provider/entities/financial-service-provider.entity';

@Injectable()
export class ApefPaymentService {
  private readonly logger = new Logger(ApefPaymentService.name);
  private readonly APEF_PREFIX = '90';

  constructor(
    @InjectRepository(ApefReference)
    private readonly apefReferenceRepo: Repository<ApefReference>,
    @InjectRepository(ApefPayment)
    private readonly apefPaymentRepo: Repository<ApefPayment>,
    @InjectRepository(FinancialServiceProvider)
    private readonly fspRepo: Repository<FinancialServiceProvider>,
    private readonly apefClientService: ApefClientService,
    private readonly cbsService: CBSService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check if a reference is an APEF reference (starts with 90)
   */
  isApefReference(reference: string): boolean {
    return reference?.startsWith(this.APEF_PREFIX);
  }

  /**
   * Main entry point: Process APEF payment
   *
   * Flow:
   * 1. Validate required fields
   * 2. Check duplicate transaction
   * 3. Validate with APEF API
   * 4. Persist apef_reference and apef_payment
   * 5. Execute CBS/GL deposit
   * 6. If GL fails → REVOKE (no retry)
   * 7. Send APEF deposit notification
   * 8. If notification fails → PENDING_APEF_NOTIFICATION (retry later)
   */
  async processPayment(dto: ApefPaymentRequestDto): Promise<ApefPaymentResponseDto> {
    this.logger.log(`Processing APEF payment: reference=${dto.reference}, txn=${dto.externalTxnId}, amount=${dto.amount}`);

    // Step 1: Validate required fields
    const validationError = this.validateRequiredFields(dto);
    if (validationError) {
      return validationError;
    }

    // Step 2: Verify it's an APEF reference
    if (!this.isApefReference(dto.reference)) {
      this.logger.warn(`Reference ${dto.reference} is not an APEF reference (must start with 90)`);
      return {
        success: false,
        errorCode: ApefErrorCode.INVALID_REFERENCE_PREFIX,
        errorDescription: `Reference must start with '90' for APEF processing`,
      };
    }

    // Step 3: Check for duplicate transaction
    const existingPayment = await this.apefPaymentRepo.findOne({
      where: { externalTxnId: dto.externalTxnId },
    });

    if (existingPayment) {
      this.logger.warn(`Duplicate transaction detected: ${dto.externalTxnId}`);
      return {
        success: false,
        errorCode: ApefErrorCode.DUPLICATE_TRANSACTION,
        errorDescription: `Transaction ${dto.externalTxnId} already processed`,
        paymentId: existingPayment.id,
      };
    }

    try {
      // Step 4: Validate with APEF API
      this.logger.log(`Validating reference ${dto.reference} with APEF API`);
      const validationResult = await this.apefClientService.validateAccount(dto.reference);

      if (!validationResult.success) {
        this.logger.error(`APEF validation failed for ${dto.reference}: ${validationResult.errorMessage}`);
        return {
          success: false,
          errorCode: ApefErrorCode.APEF_VALIDATION_FAILED,
          errorDescription: validationResult.errorMessage || 'APEF reference validation failed',
        };
      }

      // Step 5: Upsert APEF reference
      let apefReference = await this.apefReferenceRepo.findOne({
        where: { referenceNumber: dto.reference },
      });

      if (!apefReference) {
        apefReference = this.apefReferenceRepo.create({
          referenceNumber: dto.reference,
          customerName: validationResult.customerName,
          billDescription: validationResult.billDescription,
          amount: validationResult.amount,
          currency: validationResult.currency || 'TZS',
          status: ApefReferenceStatus.ACTIVE,
          validatedAt: new Date(),
          apefValidationResponse: validationResult.rawResponse,
        });
        apefReference = await this.apefReferenceRepo.save(apefReference);
        this.logger.log(`Created new APEF reference: ${apefReference.id}`);
      } else {
        // Update validation info
        apefReference.apefValidationResponse = validationResult.rawResponse;
        apefReference.validatedAt = new Date();
        await this.apefReferenceRepo.save(apefReference);
        this.logger.log(`Updated existing APEF reference: ${apefReference.id}`);
      }

      // Step 6: Create APEF payment record
      const apefPayment = this.apefPaymentRepo.create({
        apefReferenceId: apefReference.id,
        channel: dto.channel,
        externalTxnId: dto.externalTxnId,
        paidAmount: dto.amount,
        currency: dto.currency || 'TZS',
        paidAt: new Date(),
        payerName: dto.payerName,
        payerPhone: dto.payerPhone,
        status: ApefPaymentStatus.VALIDATED,
        rawPayload: dto.rawPayload,
      });

      const savedPayment = await this.apefPaymentRepo.save(apefPayment);
      this.logger.log(`APEF payment created: ${savedPayment.id}, status=VALIDATED`);

      // Step 7: Execute CBS/GL deposit
      const glResult = await this.executeGLDeposit(savedPayment, apefReference, dto);

      if (!glResult.success) {
        // GL failed → REVOKE payment (no retry)
        savedPayment.status = ApefPaymentStatus.REVOKED;
        savedPayment.revokedAt = new Date();
        savedPayment.revokeReason = glResult.error;
        savedPayment.errorMessage = glResult.error;
        await this.apefPaymentRepo.save(savedPayment);

        this.logger.error(`GL deposit failed - payment REVOKED: ${savedPayment.id}, reason: ${glResult.error}`);

        return {
          success: false,
          paymentId: savedPayment.id,
          errorCode: ApefErrorCode.GL_DEPOSIT_FAILED,
          errorDescription: `GL deposit failed: ${glResult.error}. Payment revoked.`,
        };
      }

      // Update payment with CBS info
      savedPayment.status = ApefPaymentStatus.GL_DEPOSITED;
      savedPayment.cbsTransferId = glResult.transferId;
      savedPayment.cbsReference = glResult.cbsReference;
      savedPayment.glDepositedAt = new Date();
      await this.apefPaymentRepo.save(savedPayment);

      this.logger.log(`GL deposit successful: ${savedPayment.id}, cbsRef=${glResult.cbsReference}`);

      // Step 8: Send APEF deposit notification
      const notificationResult = await this.sendApefNotification(savedPayment, apefReference);

      if (!notificationResult.success) {
        // Notification failed → mark for retry
        savedPayment.status = ApefPaymentStatus.PENDING_APEF_NOTIFICATION;
        savedPayment.apefNotificationError = notificationResult.error;
        savedPayment.apefNotificationRetryCount = 1;
        await this.apefPaymentRepo.save(savedPayment);

        this.logger.warn(
          `APEF notification failed (will retry): ${savedPayment.id}, error: ${notificationResult.error}`,
        );

        // Still return success since GL deposit was done
        return {
          success: true,
          paymentId: savedPayment.id,
          referenceNumber: dto.reference,
          status: ApefPaymentStatus.PENDING_APEF_NOTIFICATION,
          message: 'Payment processed. APEF notification pending.',
        };
      }

      // All steps completed successfully
      savedPayment.status = ApefPaymentStatus.COMPLETED;
      savedPayment.apefNotifiedAt = new Date();
      savedPayment.apefTransactionReference = notificationResult.transactionReference;
      savedPayment.apefDepositResponse = notificationResult.rawResponse;
      await this.apefPaymentRepo.save(savedPayment);

      this.logger.log(`APEF payment COMPLETED: ${savedPayment.id}`);

      return {
        success: true,
        paymentId: savedPayment.id,
        referenceNumber: dto.reference,
        status: ApefPaymentStatus.COMPLETED,
        message: 'Payment processed successfully',
      };
    } catch (error) {
      this.logger.error(`Error processing APEF payment: ${error.message}`, error.stack);
      return {
        success: false,
        errorCode: ApefErrorCode.INTERNAL_ERROR,
        errorDescription: `Internal error: ${error.message}`,
      };
    }
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(dto: ApefPaymentRequestDto): ApefPaymentResponseDto | null {
    const missingFields: string[] = [];

    if (!dto.reference) missingFields.push('reference');
    if (!dto.amount || dto.amount <= 0) missingFields.push('amount');
    if (!dto.externalTxnId) missingFields.push('externalTxnId');
    if (!dto.channel) missingFields.push('channel');

    if (missingFields.length > 0) {
      return {
        success: false,
        errorCode: ApefErrorCode.MISSING_REQUIRED_FIELD,
        errorDescription: `Missing required fields: ${missingFields.join(', ')}`,
      };
    }

    return null;
  }

  /**
   * Execute CBS/GL deposit
   */
  private async executeGLDeposit(
    payment: ApefPayment,
    reference: ApefReference,
    dto: ApefPaymentRequestDto,
  ): Promise<{ success: boolean; transferId?: string; cbsReference?: string; error?: string }> {
    // Check if CBS transfer is enabled
    const cbsTransferEnabled = this.configService.get<string>('CBS_TRANSFER_ENABLED') === 'true';

    if (!cbsTransferEnabled) {
      this.logger.log('CBS transfer is disabled - skipping GL deposit');
      return {
        success: true,
        transferId: null,
        cbsReference: 'CBS_DISABLED',
      };
    }

    // Get FSP based on channel
    const fspCode = this.mapChannelToFspCode(dto.channel);
    const fsp = await this.fspRepo.findOne({
      where: { fspCode },
    });

    if (!fsp) {
      return {
        success: false,
        error: `FSP not found for channel: ${dto.channel} (code: ${fspCode})`,
      };
    }

    if (!fsp.glAccountNumber) {
      return {
        success: false,
        error: `FSP ${fsp.name} has no GL account configured`,
      };
    }

    // For APEF, the reference (apefAccountNumber) is used as the credit account
    // This is per user's specification
    const creditAccount = reference.referenceNumber; // APEF account number

    this.logger.log(
      `Executing CBS transfer: amount=${payment.paidAmount}, ` +
      `from=${fsp.glAccountNumber} (${fsp.name}), to=${creditAccount} (APEF Account)`,
    );

    const transferResult = await this.cbsService.executeTransfer(
      {
        reference: reference.referenceNumber, // Use APEF reference number
        creditAccount: creditAccount,         // APEF account number
        debitAccount: fsp.glAccountNumber,    // FSP GL account
        currency: payment.currency || 'TZS',
        amount: Number(payment.paidAmount),
        description: `APEF Payment for ${reference.referenceNumber} via ${dto.channel}`,
        type: TransferType.GL_TO_DEPOSIT,
      },
      payment.id,
    );

    if (transferResult.success) {
      return {
        success: true,
        transferId: transferResult.transferId,
        cbsReference: transferResult.cbsReference,
      };
    } else {
      return {
        success: false,
        error: transferResult.error || 'CBS transfer failed',
      };
    }
  }

  /**
   * Send APEF deposit notification
   */
  private async sendApefNotification(
    payment: ApefPayment,
    reference: ApefReference,
  ): Promise<{ success: boolean; transactionReference?: string; rawResponse?: any; error?: string }> {
    // Generate unique transaction reference
    const transactionReference = this.generateTransactionReference(payment.id);

    // Get bank info from APEF client
    const { bankCode, bankName } = await this.apefClientService.getToken();

    // Format date as dd-MM-yyyy HH:mm:ss (APEF required format)
    const now = new Date();
    const receiptDateAndTime = this.formatDateForApef(now);

    const request: ApefDepositNotificationRequestDto = {
      transactionReference,
      apefAccountNumber: reference.referenceNumber,
      bankAccountName: payment.payerName || bankName || 'UCG Bank',
      bankAccountNumber: reference.referenceNumber,
      amount: Number(payment.paidAmount),
      currency: payment.currency || 'TZS',
      paymentMethod: this.mapChannelToPaymentMethod(payment.channel),
      bankCode: bankCode || 'UCG',
      receiptDateAndTime,
    };

    const result = await this.apefClientService.sendDepositNotification(request);

    if (result.success) {
      return {
        success: true,
        transactionReference,
        rawResponse: result.rawResponse,
      };
    } else {
      return {
        success: false,
        error: result.errorMessage || 'APEF notification failed',
      };
    }
  }

  /**
   * Format date for APEF API (dd-MM-yyyy HH:mm:ss)
   */
  private formatDateForApef(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Map channel to APEF payment method
   */
  private mapChannelToPaymentMethod(channel: ApefChannel): string {
    const mapping: Record<ApefChannel, string> = {
      [ApefChannel.TIGO]: 'MOBILE_MONEY',
      [ApefChannel.VODA]: 'MOBILE_MONEY',
      [ApefChannel.BANK]: 'BANK_TRANSFER',
      [ApefChannel.NORMAL]: 'BANK_TRANSFER',
    };
    return mapping[channel] || 'BANK_TRANSFER';
  }

  /**
   * Generate unique transaction reference for APEF
   */
  private generateTransactionReference(paymentId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `UCG-${timestamp}-${random}`;
  }

  /**
   * Map channel to FSP code
   * Uses actual FSP codes from the database
   */
  private mapChannelToFspCode(channel: ApefChannel): string {
    const mapping: Record<ApefChannel, string> = {
      [ApefChannel.TIGO]: 'MIXX',      // TigoPesa uses MIXX
      [ApefChannel.VODA]: 'VODACOM',   // M-Pesa uses VODACOM
      [ApefChannel.BANK]: 'BANK',      // Generic bank
      [ApefChannel.NORMAL]: 'BANK',    // Normal channel defaults to BANK
    };
    return mapping[channel] || 'BANK';
  }

  /**
   * Retry APEF notification for pending payments
   */
  async retryPendingNotifications(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const pendingPayments = await this.apefPaymentRepo.find({
      where: { status: ApefPaymentStatus.PENDING_APEF_NOTIFICATION },
      relations: ['apefReference'],
      take: 100, // Process in batches
    });

    this.logger.log(`Found ${pendingPayments.length} payments pending APEF notification`);

    let succeeded = 0;
    let failed = 0;

    for (const payment of pendingPayments) {
      const result = await this.sendApefNotification(payment, payment.apefReference);

      if (result.success) {
        payment.status = ApefPaymentStatus.COMPLETED;
        payment.apefNotifiedAt = new Date();
        payment.apefTransactionReference = result.transactionReference;
        payment.apefDepositResponse = result.rawResponse;
        payment.apefNotificationError = null;
        await this.apefPaymentRepo.save(payment);
        succeeded++;
        this.logger.log(`APEF notification retry succeeded: ${payment.id}`);
      } else {
        payment.apefNotificationRetryCount += 1;
        payment.apefNotificationError = result.error;
        await this.apefPaymentRepo.save(payment);
        failed++;
        this.logger.warn(
          `APEF notification retry failed: ${payment.id}, attempt ${payment.apefNotificationRetryCount}`,
        );
      }
    }

    return {
      processed: pendingPayments.length,
      succeeded,
      failed,
    };
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<ApefPayment> {
    return this.apefPaymentRepo.findOne({
      where: { id: paymentId },
      relations: ['apefReference', 'cbsTransfer'],
    });
  }

  /**
   * Get payments by reference
   */
  async getPaymentsByReference(referenceNumber: string): Promise<ApefPayment[]> {
    const reference = await this.apefReferenceRepo.findOne({
      where: { referenceNumber },
    });

    if (!reference) {
      return [];
    }

    return this.apefPaymentRepo.find({
      where: { apefReferenceId: reference.id },
      relations: ['cbsTransfer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    const [total, validated, glDeposited, pending, completed, revoked, rejected] = await Promise.all([
      this.apefPaymentRepo.count(),
      this.apefPaymentRepo.count({ where: { status: ApefPaymentStatus.VALIDATED } }),
      this.apefPaymentRepo.count({ where: { status: ApefPaymentStatus.GL_DEPOSITED } }),
      this.apefPaymentRepo.count({ where: { status: ApefPaymentStatus.PENDING_APEF_NOTIFICATION } }),
      this.apefPaymentRepo.count({ where: { status: ApefPaymentStatus.COMPLETED } }),
      this.apefPaymentRepo.count({ where: { status: ApefPaymentStatus.REVOKED } }),
      this.apefPaymentRepo.count({ where: { status: ApefPaymentStatus.REJECTED } }),
    ]);

    return {
      total,
      byStatus: {
        validated,
        glDeposited,
        pendingNotification: pending,
        completed,
        revoked,
        rejected,
      },
      successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
    };
  }

  /**
   * List all APEF payments with pagination and filters
   */
  async listPayments(options: {
    page?: number;
    limit?: number;
    status?: ApefPaymentStatus;
    channel?: ApefChannel;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ data: ApefPayment[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.apefPaymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.apefReference', 'reference')
      .orderBy('payment.createdAt', 'DESC');

    if (options.status) {
      queryBuilder.andWhere('payment.status = :status', { status: options.status });
    }

    if (options.channel) {
      queryBuilder.andWhere('payment.channel = :channel', { channel: options.channel });
    }

    if (options.startDate) {
      queryBuilder.andWhere('payment.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      queryBuilder.andWhere('payment.createdAt <= :endDate', { endDate: options.endDate });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List all APEF references with pagination and filters
   */
  async listReferences(options: {
    page?: number;
    limit?: number;
    status?: ApefReferenceStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ data: ApefReference[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.apefReferenceRepo
      .createQueryBuilder('reference')
      .orderBy('reference.createdAt', 'DESC');

    if (options.status) {
      queryBuilder.andWhere('reference.status = :status', { status: options.status });
    }

    if (options.startDate) {
      queryBuilder.andWhere('reference.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      queryBuilder.andWhere('reference.createdAt <= :endDate', { endDate: options.endDate });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single APEF reference by reference number
   */
  async getReference(referenceNumber: string): Promise<ApefReference> {
    return this.apefReferenceRepo.findOne({
      where: { referenceNumber },
    });
  }
}
