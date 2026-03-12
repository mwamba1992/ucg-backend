// payment.service.ts
import { Injectable, BadRequestException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { ReferenceService } from '../reference/reference.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { PaymentReference, ReferenceStatus } from '../reference/entities/payment-reference.entity';
import { PaymentProducer } from './payment.producer';
import { NotificationService } from '../notification/notification.service';
import { CBSService } from '../cbs/cbs.service';
import { TransferType } from '../cbs/entities/cbs-transfer.entity';
import { FinancialServiceProvider } from '../financial-service-provider/entities/financial-service-provider.entity';
import { ApefPaymentService } from '../apef/apef-payment.service';
import { ApefChannel } from '../apef/entities/apef-payment.entity';
import { User } from '../user/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly APEF_PREFIXES = ['001', '002'];

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentReference)
    private readonly referenceRepo: Repository<PaymentReference>,
    @InjectRepository(FinancialServiceProvider)
    private readonly fspRepo: Repository<FinancialServiceProvider>,
    private readonly referenceService: ReferenceService,
    @Inject(forwardRef(() => PaymentProducer))
    private readonly paymentProducer: PaymentProducer,
    private readonly notificationService: NotificationService,
    private readonly cbsService: CBSService,
    @Inject(forwardRef(() => ApefPaymentService))
    private readonly apefPaymentService: ApefPaymentService,
  ) {}

  /**
   * Check if a reference is an APEF reference (starts with 001 or 002)
   */
  private isApefReference(reference: string): boolean {
    return this.APEF_PREFIXES.some(prefix => reference?.startsWith(prefix));
  }

  /**
   * Map payment channel to APEF channel
   */
  private mapToApefChannel(paymentChannel: string): ApefChannel {
    const channelMap: Record<string, ApefChannel> = {
      'MPESA': ApefChannel.VODA,
      'M-PESA': ApefChannel.VODA,
      'VODACOM': ApefChannel.VODA,
      'TIGO': ApefChannel.TIGO,
      'TIGOPESA': ApefChannel.TIGO,
      'MIXX': ApefChannel.TIGO,
      'AIRTEL': ApefChannel.AIRTEL,
      'AIRTEL MONEY': ApefChannel.AIRTEL,
      'BANK': ApefChannel.BANK,
      'MHB': ApefChannel.BANK,
      'NMB': ApefChannel.BANK,
      'CRDB': ApefChannel.BANK,
      'NBC': ApefChannel.BANK,
      'STANBIC': ApefChannel.BANK,
      'EQUITY': ApefChannel.BANK,
      'DTB': ApefChannel.BANK,
      'STANDARD_CHARTERED': ApefChannel.BANK,
      'TPB': ApefChannel.BANK,
      'EXIM': ApefChannel.BANK,
      'AMANA': ApefChannel.BANK,
    };
    return channelMap[paymentChannel?.toUpperCase()] || ApefChannel.NORMAL;
  }

  /**
   * Process APEF payment via ApefPaymentService
   */
  private async processApefPayment(dto: CreatePaymentDto): Promise<Payment> {
    this.logger.log(`Routing payment to APEF flow: reference=${dto.referenceNumber}`);

    const apefResult = await this.apefPaymentService.processPayment({
      reference: dto.referenceNumber,
      amount: dto.amountPaid,
      currency: dto.currency || 'TZS',
      channel: this.mapToApefChannel(dto.paymentChannel),
      externalTxnId: dto.transactionId || crypto.randomUUID(),
      payerName: dto.payerName,
      payerPhone: dto.payerPhone,
      fspCode: dto.fspCode,
      rawPayload: dto as any,
    });

    if (!apefResult.success) {
      throw new BadRequestException(
        apefResult.errorDescription || 'APEF payment processing failed',
      );
    }

    // Create a synthetic Payment object to return for API compatibility
    const payment = this.paymentRepo.create({
      referenceNumber: dto.referenceNumber,
      amountPaid: dto.amountPaid,
      payerName: dto.payerName,
      payerPhone: dto.payerPhone,
      paymentChannel: dto.paymentChannel,
      fspCode: dto.fspCode,
      currency: dto.currency || 'TZS',
      status: apefResult.status === 'COMPLETED' ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
    });

    // Note: We don't save this to the normal Payment table as APEF has its own tables
    // But we set the id from APEF for tracking
    payment.id = apefResult.paymentId;
    payment.paidAt = new Date();

    this.logger.log(`APEF payment processed: paymentId=${apefResult.paymentId}, status=${apefResult.status}`);

    return payment;
  }

  /**
   * Validate PSP user is authorized to use the specified FSP
   */
  private validatePspFspAuthorization(pspUser: User | null, fspCode: string): void {
    if (!pspUser) {
      // No PSP user context (e.g., internal call) - skip validation
      return;
    }

    // If allowedFspCodes is null or empty, all FSPs are allowed
    if (!pspUser.allowedFspCodes || pspUser.allowedFspCodes.length === 0) {
      return;
    }

    // Check if the fspCode is in the allowed list
    if (!pspUser.allowedFspCodes.includes(fspCode)) {
      this.logger.warn(
        `PSP user ${pspUser.email} attempted to use unauthorized FSP: ${fspCode}. ` +
        `Allowed FSPs: ${pspUser.allowedFspCodes.join(', ')}`,
      );
      throw new ForbiddenException(
        `PSP user is not authorized to process payments via ${fspCode}. ` +
        `Allowed FSPs: ${pspUser.allowedFspCodes.join(', ')}`,
      );
    }
  }

  /**
   * Process payment with payment option validation
   * CBS transfer is executed FIRST - payment is only saved if CBS succeeds
   * @param dto - Payment data
   * @param pspUser - Optional PSP user for FSP authorization validation
   */
  async createPayment(dto: CreatePaymentDto, pspUser?: User): Promise<Payment> {
    // Validate PSP user is authorized to use this FSP
    this.validatePspFspAuthorization(pspUser, dto.fspCode);

    // Check if this is an APEF reference (starts with 001 or 002)
    if (this.isApefReference(dto.referenceNumber)) {
      this.logger.log(`Reference ${dto.referenceNumber} is APEF - routing to APEF flow`);
      return await this.processApefPayment(dto);
    }

    // Normal (non-APEF) payment flow
    const reference = await this.referenceService.findByReferenceNumber(dto.referenceNumber);

    if (!reference) {
      throw new BadRequestException('Invalid reference number');
    }

    // Check if reference is valid (not expired, not cancelled)
    if (!reference.isValid()) {
      throw new BadRequestException(
        `Reference is not valid. Status: ${reference.status}`,
      );
    }

    // Check if already fully paid
    if (reference.isFullyPaid()) {
      throw new BadRequestException(
        'Reference has been fully paid. No further payments accepted.',
      );
    }

    // Validate payment amount according to payment option
    const validation = reference.canAcceptPayment(dto.amountPaid);
    if (!validation.allowed) {
      throw new BadRequestException(
        `Payment not allowed: ${validation.reason}`,
      );
    }

    // Check if CBS transfer is enabled and validate FSP/GL account BEFORE creating payment
    const cbsTransferEnabled = process.env.CBS_TRANSFER_ENABLED === 'true';
    let fsp: FinancialServiceProvider = null;
    let primaryBankAccount = null;

    if (cbsTransferEnabled) {
      const serviceProvider = reference.serviceProvider;
      const settings = serviceProvider.settings;

      if (!settings) {
        throw new BadRequestException(
          `Service provider has no settings configured - cannot process payment`,
        );
      }

      // Get primary bank account for service provider
      primaryBankAccount = serviceProvider.bankAccounts?.find(
        (account) => account.isPrimary && account.isActive,
      );

      if (!primaryBankAccount) {
        throw new BadRequestException(
          `Service provider has no active primary bank account - cannot process payment`,
        );
      }

      // Get FSP GL account from database based on payment's fspCode
      fsp = await this.fspRepo.findOne({
        where: { fspCode: dto.fspCode },
      });

      if (!fsp) {
        throw new BadRequestException(
          `FSP not found for code: ${dto.fspCode} - cannot process payment`,
        );
      }

      if (!fsp.glAccountNumber) {
        throw new BadRequestException(
          `FSP ${fsp.name} (${fsp.fspCode}) has no GL account configured - cannot process payment`,
        );
      }

      // Execute CBS transfer FIRST - before saving payment
      // This ensures we only save payment if GL transfer succeeds
      const transferResult = await this.executeCBSTransferBeforePayment(
        dto,
        reference,
        fsp,
        primaryBankAccount,
      );

      if (!transferResult.success) {
        // CBS transfer failed - don't save payment or update reference
        this.logger.error(
          `CBS transfer failed - payment not saved: ${transferResult.error}`,
        );
        throw new BadRequestException(
          `Payment processing failed: CBS transfer error - ${transferResult.error}`,
        );
      }

      this.logger.log(
        `CBS transfer successful - now saving payment and updating reference`,
      );
    }

    // CBS transfer succeeded (or CBS disabled) - now save payment and update reference
    const payment = this.paymentRepo.create({
      ...dto,
      status: PaymentStatus.SUCCESS,
    });

    const savedPayment = await this.paymentRepo.save(payment);

    // Update reference with payment info
    await this.updateReferenceWithPayment(reference, dto.amountPaid, savedPayment.id);

    this.logger.log(
      `Payment saved: ${dto.amountPaid} for reference ${dto.referenceNumber}. ` +
      `Total paid: ${Number(reference.totalPaid) + Number(dto.amountPaid)}/${reference.amount}`,
    );

    // Send notifications after successful payment (non-blocking)
    try {
      // Notify customer
      await this.notificationService.notifyCustomerPaymentSuccess(
        reference.customerPhone,
        reference.customerName,
        reference.referenceNumber,
        Number(dto.amountPaid),
        reference.serviceProvider.businessName,
      );

      const spSettings = reference.serviceProvider.settings;

      // Notify service provider via SMS/Email based on settings
      if (!spSettings || spSettings.smsNotifications || spSettings.emailNotifications) {
        await this.notificationService.notifyPaymentReceived(
          spSettings?.emailNotifications !== false ? reference.serviceProvider.email : null,
          spSettings?.smsNotifications !== false ? reference.serviceProvider.phoneNumber : null,
          reference.referenceNumber,
          Number(dto.amountPaid),
          reference.customerName,
          reference.serviceProvider.businessName,
        );
      }

      // Send webhook notification if enabled in SP settings
      if (spSettings?.webhookEnabled && spSettings?.webhookUrl) {
        const totalPaid = Number(reference.totalPaid) + Number(dto.amountPaid);
        const remainingAmount = Number(reference.amount) - totalPaid;

        await this.notificationService.sendPaymentWebhook(
          spSettings.webhookUrl,
          spSettings.webhookSecret || null,
          {
            event: 'payment.received',
            transactionId: savedPayment.id,
            referenceNumber: reference.referenceNumber,
            amountPaid: Number(dto.amountPaid),
            currency: dto.currency || 'TZS',
            customerName: reference.customerName,
            payerName: dto.payerName,
            payerPhone: dto.payerPhone,
            paymentChannel: dto.paymentChannel,
            fspCode: dto.fspCode,
            totalPaid,
            remainingAmount: Math.max(0, remainingAmount),
            isFullyPaid: remainingAmount <= 0,
            paidAt: savedPayment.paidAt?.toISOString() || new Date().toISOString(),
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send payment notifications: ${error.message}`);
      // Don't fail payment for notification errors
    }

    return savedPayment;
  }

  /**
   * Execute CBS transfer BEFORE saving payment
   * This ensures payment is only saved if GL transfer succeeds
   */
  private async executeCBSTransferBeforePayment(
    dto: CreatePaymentDto,
    reference: PaymentReference,
    fsp: FinancialServiceProvider,
    primaryBankAccount: any,
  ): Promise<{ success: boolean; error?: string }> {
    const serviceProvider = reference.serviceProvider;

    // Calculate commission and net amount
    const grossAmount = Number(dto.amountPaid);
    const commissionRate = 0; // TODO: Make configurable via settings or config
    const commission = this.cbsService.calculateCommission(
      grossAmount,
      commissionRate,
    );
    const netAmount = grossAmount - commission;

    // Use FSP's GL account as the source (debit account)
    const fspGLAccount = fsp.glAccountNumber;
    const spDepositAccount = primaryBankAccount.accountNumber;

    this.logger.log(
      `Initiating CBS transfer (before payment save): ` +
      `FSP: ${fsp.name} (${fsp.fspCode}) | ` +
      `Amount: ${netAmount} (Gross: ${grossAmount}, Commission: ${commission}, Rate: ${commissionRate}%) | ` +
      `From: ${fspGLAccount} (${fsp.glAccountName || 'FSP GL Account'}) | ` +
      `To: ${spDepositAccount} (${serviceProvider.businessName})`,
    );

    // Execute transfer without payment ID (will be null in cbs_transfers table)
    const transferResult = await this.cbsService.executeTransfer(
      {
        reference: dto.referenceNumber,
        creditAccount: spDepositAccount,
        debitAccount: fspGLAccount,
        currency: dto.currency || 'TZS',
        amount: netAmount,
        description: `Payment settlement for ${reference.referenceNumber} via ${fsp.name} - ${serviceProvider.businessName}`,
        type: TransferType.GL_TO_DEPOSIT,
      },
      null, // No payment ID yet - payment will be saved after CBS success
    );

    if (transferResult.success) {
      this.logger.log(
        `CBS transfer successful: ${transferResult.cbsReference}`,
      );
      return { success: true };
    } else {
      this.logger.error(
        `CBS transfer failed: ${transferResult.error}`,
      );
      return {
        success: false,
        error: transferResult.error || 'CBS transfer failed',
      };
    }
  }

  /**
   * Execute CBS transfer for payment settlement (OPTIONAL - for backward compatibility)
   */
  private async executeCBSTransfer(
    payment: Payment,
    reference: PaymentReference,
  ): Promise<void> {
    // Check if CBS transfer is enabled
    const cbsTransferEnabled = process.env.CBS_TRANSFER_ENABLED === 'true';

    if (!cbsTransferEnabled) {
      this.logger.log('CBS transfer is disabled - skipping');
      return;
    }

    const serviceProvider = reference.serviceProvider;
    const settings = serviceProvider.settings;

    if (!settings) {
      this.logger.warn(
        `Service provider ${serviceProvider.id} has no settings configured - skipping CBS transfer`,
      );
      return;
    }

    // Get primary bank account for service provider
    const primaryBankAccount = serviceProvider.bankAccounts?.find(
      (account) => account.isPrimary && account.isActive,
    );

    if (!primaryBankAccount) {
      this.logger.warn(
        `Service provider ${serviceProvider.businessName} has no active primary bank account - skipping CBS transfer`,
      );
      return;
    }

    // Get FSP GL account from database based on payment's fspCode
    const fsp = await this.fspRepo.findOne({
      where: { fspCode: payment.fspCode },
    });

    if (!fsp) {
      this.logger.error(
        `FSP not found for code: ${payment.fspCode} - cannot execute CBS transfer`,
      );
      return;
    }

    if (!fsp.glAccountNumber) {
      this.logger.error(
        `FSP ${fsp.name} (${fsp.fspCode}) has no GL account configured - cannot execute CBS transfer`,
      );
      return;
    }

    // Calculate commission and net amount
    // NOTE: Commission rate is set to 0 for now (configurable in future)
    const grossAmount = Number(payment.amountPaid);
    const commissionRate = 0; // TODO: Make configurable via settings or config
    const commission = this.cbsService.calculateCommission(
      grossAmount,
      commissionRate,
    );
    const netAmount = grossAmount - commission;

    // Use FSP's GL account as the source (debit account)
    const fspGLAccount = fsp.glAccountNumber;
    const spDepositAccount = primaryBankAccount.accountNumber;

    this.logger.log(
      `Initiating CBS transfer: ` +
      `FSP: ${fsp.name} (${fsp.fspCode}) | ` +
      `Amount: ${netAmount} (Gross: ${grossAmount}, Commission: ${commission}, Rate: ${commissionRate}%) | ` +
      `From: ${fspGLAccount} (${fsp.glAccountName || 'FSP GL Account'}) | ` +
      `To: ${spDepositAccount} (${serviceProvider.businessName})`,
    );

    // Execute transfer
    const transferResult = await this.cbsService.executeTransfer(
      {
        reference: payment.referenceNumber,
        creditAccount: spDepositAccount,
        debitAccount: fspGLAccount,
        currency: payment.currency || 'TZS',
        amount: netAmount,
        description: `Payment settlement for ${reference.referenceNumber} via ${fsp.name} - ${serviceProvider.businessName}`,
        type: TransferType.GL_TO_DEPOSIT,
      },
      payment.id,
    );

    if (transferResult.success) {
      this.logger.log(
        `CBS transfer successful for payment ${payment.id}: ${transferResult.cbsReference}`,
      );
    } else {
      this.logger.error(
        `CBS transfer failed for payment ${payment.id}: ${transferResult.error}`,
      );
      // Log but don't throw - transfer can be retried
    }
  }

  /**
   * Update reference after successful payment
   */
  private async updateReferenceWithPayment(
    reference: PaymentReference,
    amountPaid: number,
    paymentId: string,
  ): Promise<void> {
    // Update totals
    reference.totalPaid = Number(reference.totalPaid) + Number(amountPaid);
    reference.installmentCount += 1;

    // Check if fully paid
    if (reference.isFullyPaid()) {
      reference.status = ReferenceStatus.USED;
      reference.usedAt = new Date();
      reference.transactionId = paymentId;

      this.logger.log(
        `Reference ${reference.referenceNumber} marked as USED (fully paid)`,
      );
    }

    await this.referenceRepo.save(reference);
  }

  /**
   * Get all payments for a reference
   */
  async getPaymentsByReference(referenceNumber: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { referenceNumber },
      order: { paidAt: 'ASC' },
    });
  }

  /**
   * Get payment summary for a reference
   */
  async getPaymentSummary(referenceNumber: string) {
    const reference = await this.referenceService.findByReferenceNumber(referenceNumber);

    if (!reference) {
      throw new BadRequestException('Invalid reference number');
    }

    const payments = await this.getPaymentsByReference(referenceNumber);

    return {
      referenceNumber: reference.referenceNumber,
      invoiceAmount: reference.amount,
      totalPaid: reference.totalPaid,
      remainingAmount: reference.getRemainingAmount(),
      installmentCount: reference.installmentCount,
      paymentOption: reference.paymentOption,
      isFullyPaid: reference.isFullyPaid(),
      status: reference.status,
      payments: payments.map(p => ({
        id: p.id,
        amountPaid: p.amountPaid,
        payerName: p.payerName,
        paymentChannel: p.paymentChannel,
        fspCode: p.fspCode,
        paidAt: p.paidAt,
        status: p.status,
      })),
    };
  }

  // ========== ASYNC RABBITMQ METHODS ==========

  /**
   * Process payment asynchronously using RabbitMQ
   * Returns immediately with request ID, actual processing happens in the background
   */
  async createPaymentAsync(dto: CreatePaymentDto, useQueue: boolean = false): Promise<any> {
    if (!useQueue) {
      // Synchronous payment processing (default behavior)
      return await this.createPayment(dto);
    }

    // Asynchronous payment processing via RabbitMQ
    const requestId = crypto.randomUUID();

    const message = {
      referenceNumber: dto.referenceNumber,
      amountPaid: dto.amountPaid,
      paymentChannel: dto.paymentChannel || 'Bank',
      fspCode: dto.fspCode,
      payerName: dto.payerName,
      payerPhone: dto.payerPhone,
      transactionId: dto.transactionId,
      currency: dto.currency,
      description: dto.description,
      requestId,
    };

    // Queue the payment processing (fire-and-forget)
    this.paymentProducer.emitPaymentProcessing(message);

    return {
      status: 'QUEUED',
      requestId,
      message: 'Payment processing queued. Processing will complete shortly.',
    };
  }

  /**
   * Send payment notification asynchronously
   * Useful for sending notifications without blocking payment processing
   */
  async sendPaymentNotificationAsync(
    paymentId: string,
    notificationType: 'EMAIL' | 'SMS' | 'WEBHOOK' = 'WEBHOOK',
  ): Promise<any> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    const reference = await this.referenceService.findByReferenceNumber(payment.referenceNumber);

    if (!reference) {
      throw new BadRequestException('Reference not found');
    }

    const requestId = crypto.randomUUID();

    const message = {
      paymentId: payment.id,
      referenceNumber: payment.referenceNumber,
      amountPaid: payment.amountPaid,
      status: payment.status,
      serviceProviderId: reference.serviceProviderId,
      notificationType,
      requestId,
    };

    // Queue the notification (fire-and-forget)
    this.paymentProducer.emitPaymentNotification(message);

    return {
      status: 'QUEUED',
      requestId,
      notificationType,
      message: `Payment notification (${notificationType}) queued for delivery.`,
    };
  }
}
