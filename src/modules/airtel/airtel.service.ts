import { Injectable, Logger, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as xml2js from 'xml2js';
import * as crypto from 'crypto';
import {
  AirtelTransaction,
  AirtelTransactionStatus,
} from './entities/airtel-transaction.entity';
import { AirtelConfig } from './entities/airtel-config.entity';
import {
  AirtelC2BRequestDto,
  AirtelEnquiryRequestDto,
  AirtelBillFetchRequestDto,
  AirtelBillFetchResponseDto,
  AirtelLookupRequestDto,
  AirtelLookupResponseDto,
  AirtelStatus,
  AirtelErrorCode,
} from './dto/airtel-notification.dto';
import {
  AirtelPaymentMessage,
  AirtelPaymentProcessingResponse,
} from './dto/airtel-queue.dto';
import { ReferenceService } from '../reference/reference.service';
import { PaymentOption, ReferenceStatus } from '../reference/entities/payment-reference.entity';
import { PaymentService } from '../payment/payment.service';
import { CBSService } from '../cbs/cbs.service';
import { ApefPaymentService } from '../apef/apef-payment.service';
import { ApefChannel } from '../apef/entities/apef-payment.entity';

@Injectable()
export class AirtelService {
  private readonly logger = new Logger(AirtelService.name);
  private readonly APEF_PREFIXES = ['001', '002'];

  constructor(
    @InjectRepository(AirtelTransaction)
    private readonly airtelTransactionRepo: Repository<AirtelTransaction>,
    @InjectRepository(AirtelConfig)
    private readonly airtelConfigRepo: Repository<AirtelConfig>,
    private readonly configService: ConfigService,
    private readonly referenceService: ReferenceService,
    private readonly paymentService: PaymentService,
    private readonly cbsService: CBSService,
    @Inject(forwardRef(() => ApefPaymentService))
    private readonly apefPaymentService: ApefPaymentService,
  ) {}

  /**
   * Check if reference is APEF (starts with 001 or 002)
   */
  private isApefReference(reference: string): boolean {
    return this.APEF_PREFIXES.some(prefix => reference?.startsWith(prefix));
  }

  /**
   * Parse Airtel XML request to DTO
   */
  async parseXmlRequest(xmlBody: string): Promise<Record<string, any>> {
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlBody);
      return result.COMMAND;
    } catch (error) {
      this.logger.error(`Failed to parse Airtel XML: ${error.message}`);
      throw new BadRequestException('Invalid XML format');
    }
  }

  /**
   * Build Airtel response XML
   */
  buildResponseXml(response: Record<string, any>): string {
    const builder = new xml2js.Builder({ rootName: 'COMMAND', headless: true });
    return `<?xml version="1.0"?>\n${builder.buildObject(response)}`;
  }

  /**
   * Whether the <USERNAME>/<PASSWORD> pair Airtel sends is checked.
   *
   * Enforcement switches on by itself once both AIRTEL_USERNAME and
   * AIRTEL_PASSWORD are configured, so an environment that has not yet issued
   * credentials to Airtel keeps working. Set AIRTEL_AUTH_ENABLED=false to hold
   * it off even after the values are in place (useful while Airtel is still
   * wiring them into their side).
   */
  private isAuthEnforced(): boolean {
    if (this.configService.get<string>('AIRTEL_AUTH_ENABLED') === 'false') {
      return false;
    }

    return Boolean(
      this.configService.get<string>('AIRTEL_USERNAME') &&
        this.configService.get<string>('AIRTEL_PASSWORD'),
    );
  }

  /**
   * Constant-time secret comparison. Digesting first keeps timingSafeEqual
   * happy for values of differing length and stops the comparison itself from
   * leaking how much of the secret was correct.
   */
  private secretsMatch(received: string, expected: string): boolean {
    const a = crypto.createHash('sha256').update(received).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    return crypto.timingSafeEqual(a, b);
  }

  /**
   * Verify the credentials carried in the request body. Returns true when
   * enforcement is off, so callers can guard unconditionally.
   */
  private isAuthorized(username?: string, password?: string): boolean {
    if (!this.isAuthEnforced()) {
      return true;
    }

    const expectedUsername = this.configService.get<string>('AIRTEL_USERNAME') ?? '';
    const expectedPassword = this.configService.get<string>('AIRTEL_PASSWORD') ?? '';

    return (
      this.secretsMatch(username ?? '', expectedUsername) &&
      this.secretsMatch(password ?? '', expectedPassword)
    );
  }

  /**
   * Handle Validate Transaction request
   */
  async handleValidateTransaction(xmlBody: string): Promise<string> {
    try {
      const command = await this.parseXmlRequest(xmlBody);

      const dto: AirtelC2BRequestDto = {
        TYPE: command.TYPE,
        CUSTOMERMSISDN: command.CUSTOMERMSISDN,
        MERCHANTMSISDN: command.MERCHANTMSISDN,
        CUSTOMERNAME: command.CUSTOMERNAME,
        AMOUNT: parseFloat(command.AMOUNT),
        PIN: command.PIN,
        REFERENCE: command.REFERENCE,
        USERNAME: command.USERNAME,
        PASSWORD: command.PASSWORD,
        REFERENCE1: command.REFERENCE1,
      };

      this.logger.log(
        `Airtel Validate: Ref=${dto.REFERENCE}, AirtelTxnId=${dto.REFERENCE1}, Amount=${dto.AMOUNT}, MSISDN=${dto.CUSTOMERMSISDN}`,
      );

      if (!this.isAuthorized(dto.USERNAME, dto.PASSWORD)) {
        this.logger.warn(
          `Airtel Validate rejected: invalid credentials (USERNAME=${dto.USERNAME ?? ''})`,
        );
        return this.buildStatusResponse(AirtelStatus.BAD_REQUEST, 'Authentication failed');
      }

      // Required fields: Airtel txn id, bill reference, positive amount
      if (!dto.REFERENCE1 || !dto.REFERENCE || !dto.AMOUNT || dto.AMOUNT <= 0) {
        return this.buildStatusResponse(
          AirtelStatus.BAD_REQUEST,
          'Required payment details are missing. Please provide a valid reference number and amount.',
        );
      }

      // Validate reference against our records
      const validation = await this.validateReference(dto.REFERENCE, dto.AMOUNT);

      if (!validation.valid) {
        return this.buildStatusResponse(AirtelStatus.BAD_REQUEST, validation.errorDescription);
      }

      return this.buildStatusResponse(AirtelStatus.OK, 'Validation successful');
    } catch (error) {
      this.logger.error(`Airtel Validate error: ${error.message}`, error.stack);
      return this.buildStatusResponse(AirtelStatus.BAD_REQUEST, 'Internal error');
    }
  }

  /**
   * Handle Process Transaction request
   */
  async handleProcessTransaction(xmlBody: string): Promise<string> {
    try {
      const command = await this.parseXmlRequest(xmlBody);

      const dto: AirtelC2BRequestDto = {
        TYPE: command.TYPE,
        CUSTOMERMSISDN: command.CUSTOMERMSISDN,
        MERCHANTMSISDN: command.MERCHANTMSISDN,
        CUSTOMERNAME: command.CUSTOMERNAME,
        AMOUNT: parseFloat(command.AMOUNT),
        PIN: command.PIN,
        REFERENCE: command.REFERENCE,
        USERNAME: command.USERNAME,
        PASSWORD: command.PASSWORD,
        REFERENCE1: command.REFERENCE1,
        REFERENCE2: command.REFERENCE2,
      };

      this.logger.log(
        `Airtel Process: AirtelTxnId=${dto.REFERENCE1}, Ref=${dto.REFERENCE}, Amount=${dto.AMOUNT}, MSISDN=${dto.CUSTOMERMSISDN}`,
      );

      if (!this.isAuthorized(dto.USERNAME, dto.PASSWORD)) {
        this.logger.warn(
          `Airtel Process rejected: invalid credentials (USERNAME=${dto.USERNAME ?? ''})`,
        );
        return this.buildProcessResponse(AirtelStatus.BAD_REQUEST, '', 'Authentication failed');
      }

      // Required fields: Airtel txn id, payer msisdn, bill reference, positive amount
      if (!dto.REFERENCE1 || !dto.CUSTOMERMSISDN || !dto.REFERENCE || !dto.AMOUNT || dto.AMOUNT <= 0) {
        return this.buildProcessResponse(
          AirtelStatus.BAD_REQUEST,
          '',
          'Required payment details are missing. Please provide a valid reference number and amount.',
        );
      }

      // Check for duplicate transaction (keyed on Airtel's transaction id)
      const isDuplicate = await this.checkDuplicate(dto.REFERENCE1);
      if (isDuplicate) {
        this.logger.log(`Duplicate Airtel transaction: ${dto.REFERENCE1}`);
        const existing = await this.getTransaction(dto.REFERENCE1);
        const completed = existing?.status === AirtelTransactionStatus.COMPLETED;
        return this.buildProcessResponse(
          completed ? AirtelStatus.OK : AirtelStatus.BAD_REQUEST,
          existing?.refId || '',
          completed ? 'Transaction already processed' : 'Transaction already received',
        );
      }

      // Create transaction record
      await this.createTransaction(dto);

      // Process payment
      const message: AirtelPaymentMessage = {
        txnId: dto.REFERENCE1,
        msisdn: dto.CUSTOMERMSISDN,
        amount: dto.AMOUNT,
        companyName: dto.MERCHANTMSISDN,
        customerReferenceId: dto.REFERENCE,
        senderName: dto.CUSTOMERNAME,
      };

      const result = await this.processPayment(message);

      if (result.success) {
        return this.buildProcessResponse(AirtelStatus.OK, result.refId || '', 'Payment processed successfully');
      } else {
        return this.buildProcessResponse(AirtelStatus.BAD_REQUEST, '', result.errorDescription || 'Payment failed');
      }
    } catch (error) {
      this.logger.error(`Airtel Process error: ${error.message}`, error.stack);
      return this.buildProcessResponse(AirtelStatus.BAD_REQUEST, '', 'Internal error');
    }
  }

  /**
   * Handle Transaction Enquiry request
   */
  async handleTransactionEnquiry(xmlBody: string): Promise<string> {
    try {
      const command = await this.parseXmlRequest(xmlBody);

      const dto: AirtelEnquiryRequestDto = {
        TXNID: command.TXNID,
        MSISDN: command.MSISDN,
      };

      this.logger.log(`Airtel Enquiry: AirtelTxnId=${dto.TXNID}, MSISDN=${dto.MSISDN}`);

      if (!dto.TXNID) {
        return this.buildEnquiryResponse(AirtelStatus.BAD_REQUEST, '', 'TXNID is required');
      }

      const transaction = await this.getTransaction(dto.TXNID);

      if (!transaction) {
        return this.buildEnquiryResponse(AirtelStatus.NOT_FOUND, '', 'Transaction not found');
      }

      const isCompleted = transaction.status === AirtelTransactionStatus.COMPLETED;

      return this.buildEnquiryResponse(
        isCompleted ? AirtelStatus.OK : AirtelStatus.BAD_REQUEST,
        transaction.refId || '',
        isCompleted
          ? 'Transaction completed'
          : transaction.errorDescription || String(transaction.status),
      );
    } catch (error) {
      this.logger.error(`Airtel Enquiry error: ${error.message}`, error.stack);
      return this.buildEnquiryResponse(AirtelStatus.BAD_REQUEST, '', 'Internal error');
    }
  }

  /**
   * Handle Bill Fetch request
   */
  async handleBillFetch(xmlBody: string): Promise<string> {
    try {
      const command = await this.parseXmlRequest(xmlBody);

      const dto: AirtelBillFetchRequestDto = {
        TYPE: command.TYPE,
        CUSTOMERMSISDN: command.CUSTOMERMSISDN,
        USERNAME: command.USERNAME,
        PASSWORD: command.PASSWORD,
        CUSTOMERREF: command.CUSTOMERREF,
      };

      this.logger.log(`Airtel BillFetch: Ref=${dto.CUSTOMERREF}, MSISDN=${dto.CUSTOMERMSISDN}`);

      if (!this.isAuthorized(dto.USERNAME, dto.PASSWORD)) {
        this.logger.warn(
          `Airtel BillFetch rejected: invalid credentials (USERNAME=${dto.USERNAME ?? ''})`,
        );
        return this.buildResponseXml({
          STATUS: AirtelStatus.BAD_REQUEST,
          MESSAGE: 'Authentication failed',
        });
      }

      if (!dto.CUSTOMERREF) {
        return this.buildResponseXml({
          STATUS: AirtelStatus.NOT_FOUND,
          MESSAGE: 'Please provide a reference number.',
        });
      }

      const reference = await this.referenceService.findByReferenceNumber(dto.CUSTOMERREF);

      if (!reference) {
        return this.buildResponseXml({
          STATUS: AirtelStatus.NOT_FOUND,
          MESSAGE: 'This reference number does not exist. Please check the number and try again.',
        });
      }

      if (!reference.isValid()) {
        return this.buildResponseXml({
          STATUS: AirtelStatus.NOT_FOUND,
          MESSAGE: this.referenceUnavailableMessage(reference),
        });
      }

      if (reference.isFullyPaid() && reference.paymentOption !== PaymentOption.PERPETUAL) {
        return this.buildResponseXml({
          STATUS: AirtelStatus.NOT_FOUND,
          MESSAGE: 'This reference number has already been fully paid.',
        });
      }

      const remainingAmount = reference.getRemainingAmount();
      const { firstName, lastName } = this.splitName(reference.customerName);
      const dueDate = this.formatDate(reference.expiresAt);

      const response: AirtelBillFetchResponseDto = {
        STATUS: AirtelStatus.OK,
        FIRSTNAME: firstName,
        LASTNAME: lastName,
        AMOUNT: String(remainingAmount),
        CURRENCY: reference.currency || 'TZS',
        MESSAGE: reference.description || 'Bill found',
      };
      if (dueDate) {
        response.DUEDATE = dueDate;
      }

      return this.buildResponseXml(response);
    } catch (error) {
      this.logger.error(`Airtel BillFetch error: ${error.message}`, error.stack);
      return this.buildResponseXml({
        STATUS: AirtelStatus.NOT_FOUND,
        MESSAGE: 'Internal error',
      });
    }
  }

  /**
   * Handle Lookup Details request
   */
  async handleLookupDetails(xmlBody: string): Promise<string> {
    try {
      const command = await this.parseXmlRequest(xmlBody);

      const dto: AirtelLookupRequestDto = {
        TYPE: command.TYPE,
        CUSTOMERMSISDN: command.CUSTOMERMSISDN,
        USERNAME: command.USERNAME,
        PASSWORD: command.PASSWORD,
        CUSTOMERREF: command.CUSTOMERREF,
      };

      this.logger.log(`Airtel Lookup: Ref=${dto.CUSTOMERREF}, MSISDN=${dto.CUSTOMERMSISDN}`);

      if (!this.isAuthorized(dto.USERNAME, dto.PASSWORD)) {
        this.logger.warn(
          `Airtel Lookup rejected: invalid credentials (USERNAME=${dto.USERNAME ?? ''})`,
        );
        return this.buildResponseXml({
          STATUS: AirtelStatus.BAD_REQUEST,
          MESSAGE: 'Authentication failed',
        });
      }

      if (!dto.CUSTOMERREF) {
        return this.buildResponseXml({
          STATUS: AirtelStatus.NOT_FOUND,
          MESSAGE: 'Please provide a reference number.',
        });
      }

      const reference = await this.referenceService.findByReferenceNumber(dto.CUSTOMERREF);

      if (!reference) {
        return this.buildResponseXml({
          STATUS: AirtelStatus.NOT_FOUND,
          MESSAGE: 'This reference number does not exist. Please check the number and try again.',
        });
      }

      // Reject expired / non-active references, consistent with billfetch & validate.
      if (!reference.isValid()) {
        return this.buildResponseXml({
          STATUS: AirtelStatus.NOT_FOUND,
          MESSAGE: this.referenceUnavailableMessage(reference),
        });
      }

      const { firstName, lastName } = this.splitName(reference.customerName);

      const response: AirtelLookupResponseDto = {
        STATUS: AirtelStatus.OK,
        FIRSTNAME: firstName,
        LASTNAME: lastName,
        MESSAGE: reference.description || 'Details found',
      };

      return this.buildResponseXml(response);
    } catch (error) {
      this.logger.error(`Airtel Lookup error: ${error.message}`, error.stack);
      return this.buildResponseXml({
        STATUS: AirtelStatus.NOT_FOUND,
        MESSAGE: 'Internal error',
      });
    }
  }

  /**
   * Validate reference and amount
   */
  async validateReference(
    referenceNumber: string,
    amount: number,
  ): Promise<{ valid: boolean; errorCode?: string; errorDescription?: string; reference?: any }> {
    try {
      const reference = await this.referenceService.findByReferenceNumber(referenceNumber);

      if (!reference) {
        return {
          valid: false,
          errorCode: AirtelErrorCode.INVALID_REFERENCE,
          errorDescription: 'This reference number does not exist. Please check the number and try again.',
        };
      }

      if (!reference.isValid()) {
        return {
          valid: false,
          errorCode: AirtelErrorCode.ACCOUNT_LOCKED,
          errorDescription: this.referenceUnavailableMessage(reference),
        };
      }

      if (reference.isFullyPaid() && reference.paymentOption !== PaymentOption.PERPETUAL) {
        return {
          valid: false,
          errorCode: AirtelErrorCode.ACCOUNT_LOCKED,
          errorDescription: 'This reference number has already been fully paid.',
        };
      }

      const validation = reference.canAcceptPayment(amount);
      if (!validation.allowed) {
        let errorCode = AirtelErrorCode.INVALID_AMOUNT;
        if (validation.reason.includes('too low') || validation.reason.includes('less than')) {
          errorCode = AirtelErrorCode.AMOUNT_TOO_LOW;
        } else if (validation.reason.includes('too high') || validation.reason.includes('exceeds')) {
          errorCode = AirtelErrorCode.AMOUNT_TOO_HIGH;
        }

        return {
          valid: false,
          errorCode,
          errorDescription: this.amountNotAllowedMessage(reference, validation.reason),
        };
      }

      return { valid: true, reference };
    } catch (error) {
      this.logger.error(`Reference validation failed: ${error.message}`);
      return {
        valid: false,
        errorCode: AirtelErrorCode.GENERAL_ERROR,
        errorDescription: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Check for duplicate transaction
   */
  async checkDuplicate(txnId: string): Promise<boolean> {
    const existing = await this.airtelTransactionRepo.findOne({
      where: { txnId },
    });
    return !!existing;
  }

  /**
   * Create Airtel transaction record
   */
  async createTransaction(
    dto: AirtelC2BRequestDto,
    status: AirtelTransactionStatus = AirtelTransactionStatus.RECEIVED,
  ): Promise<AirtelTransaction> {
    const transaction = this.airtelTransactionRepo.create({
      txnId: dto.REFERENCE1,
      referenceNumber: dto.REFERENCE,
      amount: dto.AMOUNT,
      customerPhone: dto.CUSTOMERMSISDN,
      customerName: dto.CUSTOMERNAME,
      companyName: dto.MERCHANTMSISDN,
      status,
      rawNotification: dto as any,
    });

    return await this.airtelTransactionRepo.save(transaction);
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    txnId: string,
    status: AirtelTransactionStatus,
    refId?: string,
    paymentId?: string,
    cbsTransferId?: string,
    resultCode?: string,
    errorDescription?: string,
  ): Promise<void> {
    await this.airtelTransactionRepo.update(
      { txnId },
      {
        status,
        refId,
        paymentId,
        cbsTransferId,
        resultCode,
        errorDescription,
        processedAt: status === AirtelTransactionStatus.COMPLETED ? new Date() : undefined,
      },
    );
  }

  /**
   * Get transaction by txnId
   */
  async getTransaction(txnId: string): Promise<AirtelTransaction> {
    return await this.airtelTransactionRepo.findOne({
      where: { txnId },
      relations: ['payment', 'cbsTransfer'],
    });
  }

  /**
   * Process Airtel payment (main business logic)
   */
  async processPayment(
    message: AirtelPaymentMessage,
  ): Promise<AirtelPaymentProcessingResponse> {
    this.logger.log(`Processing Airtel payment: ${message.txnId}`);

    try {
      // Check if this is an APEF reference (starts with 001 or 002)
      if (this.isApefReference(message.customerReferenceId)) {
        this.logger.log(`Reference ${message.customerReferenceId} is APEF - routing to APEF flow`);
        return await this.processApefPayment(message);
      }

      // 1. Validate reference and amount
      const validation = await this.validateReference(
        message.customerReferenceId,
        message.amount,
      );

      if (!validation.valid) {
        this.logger.warn(
          `Airtel payment validation failed: ${message.txnId} - ${validation.errorDescription}`,
        );

        await this.updateTransactionStatus(
          message.txnId,
          AirtelTransactionStatus.FAILED,
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
        paymentChannel: 'Airtel Money',
        fspCode: 'AIRTEL',
        payerName: message.senderName || message.msisdn,
        payerPhone: message.msisdn,
        transactionId: message.txnId,
        currency: reference.currency || 'TZS',
        description: `Airtel payment: ${message.txnId}`,
      });

      this.logger.log(`Payment created: ${payment.id} - CBS transfer handled by PaymentService`);

      // 4. Update Airtel transaction status
      await this.updateTransactionStatus(
        message.txnId,
        AirtelTransactionStatus.COMPLETED,
        refId,
        payment.id,
        null,
        AirtelErrorCode.SUCCESS,
      );

      this.logger.log(
        `Airtel payment processed successfully: ${message.txnId} - Payment ID: ${payment.id}`,
      );

      return {
        success: true,
        txnId: message.txnId,
        refId,
        paymentId: payment.id,
        cbsTransferId: undefined,
        errorCode: AirtelErrorCode.SUCCESS,
      };
    } catch (error) {
      this.logger.error(
        `Error processing Airtel payment ${message.txnId}: ${error.message}`,
        error.stack,
      );

      await this.updateTransactionStatus(
        message.txnId,
        AirtelTransactionStatus.FAILED,
        null,
        null,
        null,
        AirtelErrorCode.GENERAL_ERROR,
        error.message,
      );

      return {
        success: false,
        txnId: message.txnId,
        errorCode: AirtelErrorCode.GENERAL_ERROR,
        errorDescription: error.message,
      };
    }
  }

  /**
   * Process APEF payment (for references starting with 001/002)
   */
  private async processApefPayment(
    message: AirtelPaymentMessage,
  ): Promise<AirtelPaymentProcessingResponse> {
    this.logger.log(`Processing APEF payment via Airtel: ${message.txnId}`);

    try {
      const apefResult = await this.apefPaymentService.processPayment({
        reference: message.customerReferenceId,
        amount: message.amount,
        externalTxnId: message.txnId,
        channel: ApefChannel.AIRTEL,
        payerName: message.senderName || message.msisdn,
        payerPhone: message.msisdn,
        rawPayload: message as any,
      });

      if (apefResult.success) {
        const refId = this.generateRefId();
        await this.updateTransactionStatus(
          message.txnId,
          AirtelTransactionStatus.COMPLETED,
          refId,
          null,
          null,
          AirtelErrorCode.SUCCESS,
        );

        return {
          success: true,
          txnId: message.txnId,
          refId,
          paymentId: apefResult.paymentId,
          errorCode: AirtelErrorCode.SUCCESS,
        };
      } else {
        await this.updateTransactionStatus(
          message.txnId,
          AirtelTransactionStatus.FAILED,
          null,
          null,
          null,
          apefResult.errorCode || AirtelErrorCode.GENERAL_ERROR,
          apefResult.errorDescription,
        );

        return {
          success: false,
          txnId: message.txnId,
          errorCode: apefResult.errorCode || AirtelErrorCode.GENERAL_ERROR,
          errorDescription: apefResult.errorDescription,
        };
      }
    } catch (error) {
      this.logger.error(`APEF payment failed via Airtel: ${error.message}`, error.stack);

      await this.updateTransactionStatus(
        message.txnId,
        AirtelTransactionStatus.FAILED,
        null,
        null,
        null,
        AirtelErrorCode.GENERAL_ERROR,
        error.message,
      );

      return {
        success: false,
        txnId: message.txnId,
        errorCode: AirtelErrorCode.GENERAL_ERROR,
        errorDescription: error.message,
      };
    }
  }

  /**
   * Generate partner reference ID
   */
  private generateRefId(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `AR${timestamp.slice(-10)}${random}`;
  }

  /**
   * Build Validate Transaction response
   */
  private buildStatusResponse(status: AirtelStatus, message: string): string {
    return this.buildResponseXml({ STATUS: status, MESSAGE: message });
  }

  /**
   * Build Process Transaction response: <STATUS><TXNID><MESSAGE>
   */
  private buildProcessResponse(
    status: AirtelStatus,
    partnerTxnId: string,
    message: string,
  ): string {
    return this.buildResponseXml({
      STATUS: status,
      TXNID: partnerTxnId || '',
      MESSAGE: message,
    });
  }

  /**
   * Build Transaction Enquiry response: <STATUS><MESSAGE><REF>
   */
  private buildEnquiryResponse(
    status: AirtelStatus,
    ref: string,
    message: string,
  ): string {
    return this.buildResponseXml({
      STATUS: status,
      MESSAGE: message,
      REF: ref || '',
    });
  }

  /**
   * Build a clear, customer-friendly message explaining why a reference cannot
   * be paid (does not exist / expired / cancelled / already paid / inactive).
   */
  private referenceUnavailableMessage(reference: any): string {
    if (!reference) {
      return 'This reference number does not exist. Please check the number and try again.';
    }
    if (reference.isExpired && reference.isExpired()) {
      return 'This reference number has expired and can no longer be used for payment.';
    }
    if (reference.status === ReferenceStatus.CANCELLED) {
      return 'This reference number has been cancelled and cannot be used for payment.';
    }
    if (reference.isFullyPaid && reference.isFullyPaid()) {
      return 'This reference number has already been fully paid.';
    }
    return 'This reference number is not valid for payment.';
  }

  /**
   * Build a customer-friendly message when the entered amount is not allowed
   * for a reference's payment option.
   */
  private amountNotAllowedMessage(reference: any, reason: string): string {
    const currency = reference.currency || 'TZS';
    const remaining = reference.getRemainingAmount();
    const full = Number(reference.amount);
    const r = reason || '';

    if (r.includes('exceeds') || r.includes('<=')) {
      return `The amount entered is more than the outstanding balance of ${currency} ${remaining} for this reference.`;
    }
    if (r.includes('exactly')) {
      return `This reference must be paid exactly ${currency} ${full}.`;
    }
    if (r.includes('>=')) {
      return `This reference must be paid in full. The required amount is ${currency} ${full}.`;
    }
    if (r.includes('already fully paid') || r.includes('only one payment')) {
      return 'This reference number has already been fully paid.';
    }
    return 'The amount entered is not allowed for this reference. Please check the amount and try again.';
  }

  /**
   * Split a stored full name into FIRSTNAME / LASTNAME for Airtel responses.
   * First token becomes FIRSTNAME, the remainder (if any) becomes LASTNAME.
   */
  private splitName(fullName?: string): { firstName: string; lastName: string } {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return { firstName: 'N/A', lastName: '' };
    }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  /**
   * Format a date as YYYY-MM-DD (Airtel DUEDATE format), or undefined.
   */
  private formatDate(date?: Date): string | undefined {
    if (!date) {
      return undefined;
    }
    return new Date(date).toISOString().slice(0, 10);
  }

  /**
   * Get Airtel configuration
   */
  async getAirtelConfig(): Promise<AirtelConfig> {
    let config = await this.airtelConfigRepo.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (!config) {
      const partnerCode = this.configService.get<string>('AIRTEL_PARTNER_CODE');
      const sharedKey = this.configService.get<string>('AIRTEL_SHARED_KEY');

      if (!partnerCode || !sharedKey) {
        throw new Error('Airtel configuration not found in database or environment');
      }

      config = this.airtelConfigRepo.create({
        partnerCode,
        sharedKey,
        isActive: true,
      });

      config = await this.airtelConfigRepo.save(config);
      this.logger.log('Airtel config created from environment variables');
    }

    return config;
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const queryBuilder = this.airtelTransactionRepo.createQueryBuilder('tx');

    if (startDate && endDate) {
      queryBuilder.where('tx.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [total, received, processing, completed, failed] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: AirtelTransactionStatus.RECEIVED }).getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: AirtelTransactionStatus.PROCESSING }).getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: AirtelTransactionStatus.COMPLETED }).getCount(),
      queryBuilder.clone().where('tx.status = :status', { status: AirtelTransactionStatus.FAILED }).getCount(),
    ]);

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
      .setParameter('completed', AirtelTransactionStatus.COMPLETED)
      .setParameter('failed', AirtelTransactionStatus.FAILED)
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
  async retryTransaction(txnId: string): Promise<AirtelPaymentProcessingResponse> {
    const transaction = await this.getTransaction(txnId);

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    if (transaction.status !== AirtelTransactionStatus.FAILED) {
      throw new BadRequestException('Only failed transactions can be retried');
    }

    await this.updateTransactionStatus(txnId, AirtelTransactionStatus.RECEIVED);

    const message: AirtelPaymentMessage = {
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
