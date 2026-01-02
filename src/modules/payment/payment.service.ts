// payment.service.ts
import { Injectable, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
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
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentReference)
    private readonly referenceRepo: Repository<PaymentReference>,
    private readonly referenceService: ReferenceService,
    @Inject(forwardRef(() => PaymentProducer))
    private readonly paymentProducer: PaymentProducer,
    private readonly notificationService: NotificationService,
    private readonly cbsService: CBSService,
  ) {}

  /**
   * Process payment with payment option validation
   */
  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
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

    // Create payment record
    const payment = this.paymentRepo.create({
      ...dto,
      status: PaymentStatus.SUCCESS,
    });

    const savedPayment = await this.paymentRepo.save(payment);

    // Update reference with payment info
    await this.updateReferenceWithPayment(reference, dto.amountPaid, savedPayment.id);

    this.logger.log(
      `Payment processed: ${dto.amountPaid} for reference ${dto.referenceNumber}. ` +
      `Total paid: ${Number(reference.totalPaid) + Number(dto.amountPaid)}/${reference.amount}`,
    );

    // Execute CBS transfer to settle funds
    try {
      await this.executeCBSTransfer(savedPayment, reference);
    } catch (error) {
      this.logger.error(`Failed to execute CBS transfer: ${error.message}`);
      // Don't fail the payment, but log the error
      // Transfer can be retried later
    }

    // Send notifications after successful payment
    try {
      // Notify customer
      await this.notificationService.notifyCustomerPaymentSuccess(
        reference.customerPhone,
        reference.customerName,
        reference.referenceNumber,
        Number(dto.amountPaid),
        reference.serviceProvider.businessName,
      );

      // Notify service provider
      await this.notificationService.notifyPaymentReceived(
        reference.serviceProvider.email,
        reference.serviceProvider.phoneNumber,
        reference.referenceNumber,
        Number(dto.amountPaid),
        reference.customerName,
        reference.serviceProvider.businessName,
      );
    } catch (error) {
      this.logger.error(`Failed to send payment notifications: ${error.message}`);
    }

    return savedPayment;
  }

  /**
   * Execute CBS transfer for payment settlement
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

    // Calculate commission and net amount
    // NOTE: Commission rate is set to 0 for now (configurable in future)
    const grossAmount = Number(payment.amountPaid);
    const commissionRate = 0; // TODO: Make configurable via settings or config
    const commission = this.cbsService.calculateCommission(
      grossAmount,
      commissionRate,
    );
    const netAmount = grossAmount - commission;

    // Get UCG GL account from environment or config
    const ucgGLAccount = process.env.UCG_GL_ACCOUNT;
    const spDepositAccount = primaryBankAccount.accountNumber;

    this.logger.log(
      `Initiating CBS transfer: ` +
      `Amount: ${netAmount} (Gross: ${grossAmount}, Commission: ${commission}, Rate: ${commissionRate}%) ` +
      `from ${ucgGLAccount} to ${spDepositAccount}`,
    );

    // Execute transfer
    const transferResult = await this.cbsService.executeTransfer(
      {
        reference: payment.referenceNumber,
        creditAccount: spDepositAccount,
        debitAccount: ucgGLAccount,
        currency: payment.currency || 'TZS',
        amount: netAmount,
        description: `Payment settlement for ${reference.referenceNumber} - ${serviceProvider.businessName}`,
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
