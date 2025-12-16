import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as xml2js from 'xml2js';
import {
  MpesaTransaction,
  MpesaTransactionStatus,
} from './entities/mpesa-transaction.entity';
import { MpesaConfig } from './entities/mpesa-config.entity';
import {
  MpesaC2BNotificationDto,
  MpesaSyncResponseDto,
  MpesaCallbackDto,
} from './dto/mpesa-notification.dto';
import {
  MpesaPaymentMessage,
  MpesaCallbackMessage,
  MpesaPaymentProcessingResponse,
} from './dto/mpesa-queue.dto';
import { MpesaEncryption } from './utils/mpesa-encryption.util';
import { MpesaProducer } from './mpesa.producer';
import { ReferenceService } from '../reference/reference.service';
import { PaymentService } from '../payment/payment.service';
import { CBSService } from '../cbs/cbs.service';
import { TransferType } from '../cbs/entities/cbs-transfer.entity';
import { PaymentStatus } from '../payment/entities/payment.entity';

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);
  private readonly ucgGLAccount: string;
  private readonly mpesaCallbackUrl: string;

  constructor(
    @InjectRepository(MpesaTransaction)
    private readonly mpesaTransactionRepo: Repository<MpesaTransaction>,
    @InjectRepository(MpesaConfig)
    private readonly mpesaConfigRepo: Repository<MpesaConfig>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly mpesaProducer: MpesaProducer,
    private readonly referenceService: ReferenceService,
    private readonly paymentService: PaymentService,
    private readonly cbsService: CBSService,
  ) {
    this.ucgGLAccount = this.configService.get<string>('UCG_GL_ACCOUNT') || '1000000001';
    this.mpesaCallbackUrl = this.configService.get<string>('MPESA_CALLBACK_URL');
  }

  /**
   * Parse M-Pesa XML notification to DTO
   */
  async parseXmlNotification(xmlBody: string): Promise<MpesaC2BNotificationDto> {
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlBody);

      // Extract data from XML structure
      const request = result.request;

      return {
        spId: request.spId,
        spPassword: request.spPassword,
        timestamp: request.timeStamp,
        amount: parseFloat(request.amount),
        commandID: request.commandID,
        initiator: request.initiator,
        originatorConversationID: request.originatorConversationID,
        recipient: request.recipient,
        mpesaReceipt: request.serviceReceipt,
        transactionDate: request.serviceDate,
        accountReference: request.accountReference,
        transactionID: request.transactionID,
        conversationID: request.conversationID,
      };
    } catch (error) {
      this.logger.error(`Failed to parse M-Pesa XML notification: ${error.message}`);
      throw new BadRequestException('Invalid XML format');
    }
  }

  /**
   * Build sync success response (XML)
   */
  buildSyncSuccessResponse(
    conversationId: string,
    originatorConversationId: string,
    transactionId: string,
  ): string {
    const builder = new xml2js.Builder({ rootName: 'response' });

    const response: MpesaSyncResponseDto = {
      conversationID: conversationId,
      originatorConversationID: originatorConversationId,
      transactionID: transactionId,
      responseCode: '0',
      responseDesc: 'Received',
      serviceStatus: 'Success',
    };

    return builder.buildObject(response);
  }

  /**
   * Build callback XML for M-Pesa
   */
  async buildCallbackXml(callback: MpesaCallbackDto): Promise<string> {
    const builder = new xml2js.Builder({ rootName: 'request' });

    return builder.buildObject({
      spId: callback.spId,
      spPassword: callback.spPassword,
      timeStamp: callback.timestamp,
      resultType: callback.resultType,
      resultCode: callback.resultCode,
      resultDesc: callback.resultDesc,
      serviceReceipt: callback.serviceReceipt,
      serviceDate: callback.serviceDate,
      originatorConversationID: callback.originatorConversationID,
      conversationID: callback.conversationID,
      transactionID: callback.transactionID,
      initiator: callback.initiator,
      initiatorPassword: callback.initiatorPassword,
    });
  }

  /**
   * Validate notification format
   */
  validateNotificationFormat(notification: MpesaC2BNotificationDto): void {
    const errors: string[] = [];

    if (!notification.spId) errors.push('spId is required');
    if (!notification.spPassword) errors.push('spPassword is required');
    if (!notification.timestamp) errors.push('timestamp is required');
    if (!notification.amount || notification.amount <= 0) errors.push('Invalid amount');
    if (!notification.mpesaReceipt) errors.push('mpesaReceipt is required');
    if (!notification.accountReference) errors.push('accountReference is required');
    if (!notification.conversationID) errors.push('conversationID is required');
    if (!notification.transactionID) errors.push('transactionID is required');

    if (errors.length > 0) {
      throw new BadRequestException(`Invalid notification: ${errors.join(', ')}`);
    }
  }

  /**
   * Verify M-Pesa password
   */
  async verifyPassword(
    spId: string,
    encryptedPassword: string,
    timestamp: string,
  ): Promise<boolean> {
    try {
      // Get M-Pesa config
      const config = await this.getMpesaConfig();

      // Verify timestamp is recent (within 5 minutes)
      if (!MpesaEncryption.isTimestampRecent(timestamp, 5)) {
        this.logger.warn(`M-Pesa timestamp too old or invalid: ${timestamp}`);
        return false;
      }

      // Verify password
      return MpesaEncryption.verifyPassword(
        spId,
        config.spPassword,
        timestamp,
        encryptedPassword,
      );
    } catch (error) {
      this.logger.error(`Password verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check for duplicate transaction
   */
  async checkDuplicate(mpesaReceipt: string): Promise<boolean> {
    const existing = await this.mpesaTransactionRepo.findOne({
      where: { mpesaReceipt },
    });

    return !!existing;
  }

  /**
   * Validate reference and amount
   */
  async validateReference(
    referenceNumber: string,
    amount: number,
  ): Promise<{ valid: boolean; reason?: string; reference?: any }> {
    try {
      // Find reference
      const reference = await this.referenceService.findByReferenceNumber(referenceNumber);

      if (!reference) {
        return { valid: false, reason: 'Reference not found' };
      }

      // Check if reference is valid (not expired, not cancelled)
      if (!reference.isValid()) {
        return { valid: false, reason: `Reference ${reference.status}` };
      }

      // Check if already fully paid
      if (reference.isFullyPaid()) {
        return { valid: false, reason: 'Reference already fully paid' };
      }

      // Validate amount according to payment option
      const validation = reference.canAcceptPayment(amount);
      if (!validation.allowed) {
        return { valid: false, reason: validation.reason };
      }

      return { valid: true, reference };
    } catch (error) {
      this.logger.error(`Reference validation failed: ${error.message}`);
      return { valid: false, reason: `Validation error: ${error.message}` };
    }
  }

  /**
   * Create M-Pesa transaction record
   */
  async createTransaction(
    notification: MpesaC2BNotificationDto,
    status: MpesaTransactionStatus = MpesaTransactionStatus.RECEIVED,
  ): Promise<MpesaTransaction> {
    const transaction = this.mpesaTransactionRepo.create({
      mpesaReceipt: notification.mpesaReceipt,
      conversationId: notification.conversationID,
      originatorConversationId: notification.originatorConversationID,
      transactionId: notification.transactionID,
      referenceNumber: notification.accountReference,
      amount: notification.amount,
      customerPhone: notification.initiator,
      customerName: null, // Not provided in M-Pesa notification
      commandId: notification.commandID,
      transactionDate: MpesaEncryption.parseMpesaDate(notification.transactionDate),
      status,
      rawNotification: notification as any, // Store full notification for debugging
    });

    return await this.mpesaTransactionRepo.save(transaction);
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    mpesaReceipt: string,
    status: MpesaTransactionStatus,
    paymentId?: string,
    cbsTransferId?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.mpesaTransactionRepo.update(
      { mpesaReceipt },
      {
        status,
        paymentId,
        cbsTransferId,
        errorMessage,
        processedAt: status === MpesaTransactionStatus.COMPLETED ? new Date() : undefined,
      },
    );
  }

  /**
   * Get transaction by receipt
   */
  async getTransaction(mpesaReceipt: string): Promise<MpesaTransaction> {
    return await this.mpesaTransactionRepo.findOne({
      where: { mpesaReceipt },
      relations: ['payment', 'cbsTransfer'],
    });
  }

  /**
   * Process M-Pesa payment (main business logic)
   */
  async processPayment(
    message: MpesaPaymentMessage,
  ): Promise<MpesaPaymentProcessingResponse> {
    this.logger.log(`Processing M-Pesa payment: ${message.mpesaReceipt}`);

    try {
      // 1. Validate reference and amount
      const validation = await this.validateReference(
        message.referenceNumber,
        message.amount,
      );

      if (!validation.valid) {
        this.logger.warn(
          `M-Pesa payment validation failed: ${message.mpesaReceipt} - ${validation.reason}`,
        );

        await this.updateTransactionStatus(
          message.mpesaReceipt,
          MpesaTransactionStatus.FAILED,
          null,
          null,
          validation.reason,
        );

        return {
          success: false,
          mpesaReceipt: message.mpesaReceipt,
          error: validation.reason,
        };
      }

      const reference = validation.reference;

      // 2. Create payment record
      this.logger.log(
        `Creating payment record for ${message.referenceNumber}: ${message.amount}`,
      );

      const payment = await this.paymentService.createPayment({
        referenceNumber: message.referenceNumber,
        amountPaid: message.amount,
        paymentChannel: 'M-Pesa',
        payerName: message.customerName || message.customerPhone,
        payerPhone: message.customerPhone,
        transactionId: message.mpesaReceipt,
        currency: reference.currency || 'TZS',
        description: `M-Pesa payment: ${message.mpesaReceipt}`,
      });

      this.logger.log(`Payment created: ${payment.id}`);

      // 3. Execute CBS transfer (GL → Deposit)
      let cbsTransferId: string = null;

      try {
        const serviceProvider = reference.serviceProvider;
        const primaryBankAccount = serviceProvider.bankAccounts?.find(
          (account) => account.isPrimary && account.isActive,
        );

        if (!primaryBankAccount) {
          this.logger.warn(
            `No primary bank account for SP ${serviceProvider.businessName} - skipping CBS transfer`,
          );
        } else {
          this.logger.log(
            `Executing CBS transfer: ${message.amount} from ${this.ucgGLAccount} to ${primaryBankAccount.accountNumber}`,
          );

          const transferResult = await this.cbsService.executeTransfer(
            {
              reference: message.referenceNumber,
              creditAccount: primaryBankAccount.accountNumber,
              debitAccount: this.ucgGLAccount,
              currency: reference.currency || 'TZS',
              amount: message.amount,
              description: `M-Pesa settlement: ${message.mpesaReceipt}`,
              type: TransferType.GL_TO_DEPOSIT,
            },
            payment.id,
          );

          if (transferResult.success) {
            cbsTransferId = transferResult.transferId;
            this.logger.log(
              `CBS transfer successful: ${transferResult.cbsReference}`,
            );
          } else {
            this.logger.error(
              `CBS transfer failed: ${transferResult.error}`,
            );
            // Don't fail the payment, just log the error
          }
        }
      } catch (cbsError) {
        this.logger.error(
          `CBS transfer error: ${cbsError.message}`,
          cbsError.stack,
        );
        // Don't fail the payment
      }

      // 4. Update M-Pesa transaction status
      await this.updateTransactionStatus(
        message.mpesaReceipt,
        MpesaTransactionStatus.COMPLETED,
        payment.id,
        cbsTransferId,
      );

      this.logger.log(
        `M-Pesa payment processed successfully: ${message.mpesaReceipt} - Payment ID: ${payment.id}`,
      );

      return {
        success: true,
        mpesaReceipt: message.mpesaReceipt,
        paymentId: payment.id,
        cbsTransferId,
      };
    } catch (error) {
      this.logger.error(
        `Error processing M-Pesa payment ${message.mpesaReceipt}: ${error.message}`,
        error.stack,
      );

      await this.updateTransactionStatus(
        message.mpesaReceipt,
        MpesaTransactionStatus.FAILED,
        null,
        null,
        error.message,
      );

      return {
        success: false,
        mpesaReceipt: message.mpesaReceipt,
        error: error.message,
      };
    }
  }

  /**
   * Send callback to M-Pesa
   */
  async sendCallbackToMpesa(message: MpesaCallbackMessage): Promise<boolean> {
    try {
      if (!this.mpesaCallbackUrl) {
        this.logger.warn('M-Pesa callback URL not configured - skipping callback');
        return true; // Return true to prevent retries
      }

      // Get M-Pesa config
      const config = await this.getMpesaConfig();

      // Generate timestamp
      const timestamp = MpesaEncryption.generateTimestamp();

      // Encrypt password
      const encryptedPassword = MpesaEncryption.encryptPassword(
        config.spId,
        config.spPassword,
        timestamp,
      );

      // Encrypt initiator password
      const encryptedInitiatorPassword = MpesaEncryption.encryptPassword(
        config.spId,
        config.initiatorPassword,
        timestamp,
      );

      // Build callback DTO
      const callbackDto: MpesaCallbackDto = {
        spId: config.spId,
        spPassword: encryptedPassword,
        timestamp,
        resultType: message.resultType,
        resultCode: message.resultCode,
        resultDesc: message.resultDesc,
        serviceReceipt: message.mpesaReceipt,
        serviceDate: MpesaEncryption.formatMpesaDate(),
        originatorConversationID: message.originatorConversationId,
        conversationID: message.conversationId,
        transactionID: message.transactionId,
        initiator: config.initiator,
        initiatorPassword: encryptedInitiatorPassword,
      };

      // Build XML
      const xmlBody = await this.buildCallbackXml(callbackDto);

      this.logger.log(
        `Sending callback to M-Pesa: ${this.mpesaCallbackUrl} - Conversation: ${message.conversationId}`,
      );

      // Send HTTP POST to M-Pesa
      const response = await firstValueFrom(
        this.httpService.post(this.mpesaCallbackUrl, xmlBody, {
          headers: {
            'Content-Type': 'application/xml',
          },
          timeout: 30000, // 30 seconds timeout
        }),
      );

      if (response.status === 200) {
        this.logger.log(
          `Callback sent successfully to M-Pesa: ${message.conversationId}`,
        );

        // Update transaction callback status
        await this.mpesaTransactionRepo.update(
          { mpesaReceipt: message.mpesaReceipt },
          {
            callbackSent: true,
            callbackSentAt: new Date(),
          },
        );

        return true;
      } else {
        this.logger.warn(
          `M-Pesa callback returned non-200 status: ${response.status}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Failed to send callback to M-Pesa: ${error.message}`,
        error.stack,
      );

      // Increment retry count
      await this.mpesaTransactionRepo
        .createQueryBuilder()
        .update(MpesaTransaction)
        .set({
          callbackRetryCount: () => 'callbackRetryCount + 1',
        })
        .where('mpesaReceipt = :receipt', { receipt: message.mpesaReceipt })
        .execute();

      return false;
    }
  }

  /**
   * Queue callback for sending
   */
  queueCallback(callback: MpesaCallbackMessage): void {
    this.mpesaProducer.emitCallback(callback);
  }

  /**
   * Handle duplicate notification
   */
  async handleDuplicate(notification: MpesaC2BNotificationDto): Promise<void> {
    this.logger.warn(
      `Duplicate M-Pesa notification received: ${notification.mpesaReceipt}`,
    );

    // Just log, don't process again
    // The sync response will still be sent to M-Pesa
  }

  /**
   * Get M-Pesa configuration
   */
  async getMpesaConfig(): Promise<MpesaConfig> {
    // Try to get from database first
    let config = await this.mpesaConfigRepo.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    // If no config in database, create from environment variables
    if (!config) {
      const spId = this.configService.get<string>('MPESA_SP_ID');
      const spPassword = this.configService.get<string>('MPESA_SP_PASSWORD');
      const initiator = this.configService.get<string>('MPESA_INITIATOR') || 'ibm_in';
      const initiatorPassword = this.configService.get<string>('MPESA_INITIATOR_PASSWORD');

      if (!spId || !spPassword || !initiatorPassword) {
        throw new Error('M-Pesa configuration not found in database or environment');
      }

      // Create config record
      config = this.mpesaConfigRepo.create({
        spId,
        spPassword,
        initiator,
        initiatorPassword,
        callbackUrl: this.mpesaCallbackUrl,
        isActive: true,
      });

      config = await this.mpesaConfigRepo.save(config);
      this.logger.log('M-Pesa config created from environment variables');
    }

    return config;
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const queryBuilder = this.mpesaTransactionRepo.createQueryBuilder('tx');

    if (startDate && endDate) {
      queryBuilder.where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [total, received, processing, completed, failed] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: MpesaTransactionStatus.RECEIVED }).getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: MpesaTransactionStatus.PROCESSING }).getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: MpesaTransactionStatus.COMPLETED }).getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: MpesaTransactionStatus.FAILED }).getCount(),
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
      .setParameter('completed', MpesaTransactionStatus.COMPLETED)
      .setParameter('failed', MpesaTransactionStatus.FAILED)
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
  async retryTransaction(mpesaReceipt: string): Promise<MpesaPaymentProcessingResponse> {
    const transaction = await this.getTransaction(mpesaReceipt);

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    if (transaction.status !== MpesaTransactionStatus.FAILED) {
      throw new BadRequestException('Only failed transactions can be retried');
    }

    // Reset status to received
    await this.updateTransactionStatus(mpesaReceipt, MpesaTransactionStatus.RECEIVED);

    // Queue for processing
    const message: MpesaPaymentMessage = {
      mpesaReceipt: transaction.mpesaReceipt,
      conversationId: transaction.conversationId,
      originatorConversationId: transaction.originatorConversationId,
      transactionId: transaction.transactionId,
      referenceNumber: transaction.referenceNumber,
      amount: Number(transaction.amount),
      customerPhone: transaction.customerPhone,
      customerName: transaction.customerName,
      commandId: transaction.commandId,
      transactionDate: transaction.transactionDate.toISOString(),
    };

    this.mpesaProducer.emitPaymentProcessing(message);

    return {
      success: true,
      mpesaReceipt: transaction.mpesaReceipt,
    };
  }
}
