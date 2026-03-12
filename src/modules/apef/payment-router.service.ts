import { Injectable, Logger } from '@nestjs/common';
import { ApefPaymentService } from './apef-payment.service';
import { PaymentService } from '../payment/payment.service';
import { ApefPaymentRequestDto, ApefPaymentResponseDto, ApefErrorCode } from './dto/apef.dto';
import { ApefChannel } from './entities/apef-payment.entity';

export interface UnifiedPaymentRequest {
  reference: string;
  amount: number;
  externalTxnId: string;
  channel: string; // TIGO | VODA | BANK | NORMAL
  rawPayload?: Record<string, any>;
  payerName?: string;
  payerPhone?: string;
  currency?: string;
}

export interface UnifiedPaymentResponse {
  success: boolean;
  paymentId?: string;
  referenceNumber?: string;
  flow: 'APEF' | 'INTERNAL';
  status?: string;
  message?: string;
  errorCode?: string;
  errorDescription?: string;
}

@Injectable()
export class PaymentRouterService {
  private readonly logger = new Logger(PaymentRouterService.name);
  private readonly APEF_PREFIXES = ['001', '002'];

  constructor(
    private readonly apefPaymentService: ApefPaymentService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Route payment to correct flow based on reference prefix
   *
   * Core Principle (Non-Negotiable):
   * - References starting with '001' or '002' → APEF (External/APEX)
   * - References NOT starting with '001' or '002' → Internal Billing
   *
   * No fallback. No cross-calling. No mixing.
   */
  async processPayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    const { reference } = request;

    // Log classification decision (mandatory per spec)
    const isApef = this.isApefReference(reference);
    this.logger.log(
      `Payment classification: reference=${reference}, prefix=${reference?.substring(0, 3)}, ` +
      `flow=${isApef ? 'APEF' : 'INTERNAL'}`,
    );

    if (isApef) {
      return this.routeToApef(request);
    } else {
      return this.routeToInternal(request);
    }
  }

  /**
   * Check if reference is APEF (starts with 001 or 002)
   */
  isApefReference(reference: string): boolean {
    return this.APEF_PREFIXES.some(prefix => reference?.startsWith(prefix));
  }

  /**
   * Route to APEF flow
   */
  private async routeToApef(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    this.logger.log(`Routing to APEF flow: ${request.reference}`);

    // Map channel string to enum
    const channel = this.mapChannelToEnum(request.channel);
    if (!channel) {
      return {
        success: false,
        flow: 'APEF',
        errorCode: ApefErrorCode.MISSING_REQUIRED_FIELD,
        errorDescription: `Invalid channel: ${request.channel}. Must be TIGO, VODA, BANK, or NORMAL`,
      };
    }

    const apefRequest: ApefPaymentRequestDto = {
      reference: request.reference,
      amount: request.amount,
      externalTxnId: request.externalTxnId,
      channel,
      rawPayload: request.rawPayload,
      payerName: request.payerName,
      payerPhone: request.payerPhone,
      currency: request.currency,
    };

    const result = await this.apefPaymentService.processPayment(apefRequest);

    return {
      success: result.success,
      paymentId: result.paymentId,
      referenceNumber: result.referenceNumber,
      flow: 'APEF',
      status: result.status,
      message: result.message,
      errorCode: result.errorCode,
      errorDescription: result.errorDescription,
    };
  }

  /**
   * Route to Internal flow
   */
  private async routeToInternal(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    this.logger.log(`Routing to INTERNAL flow: ${request.reference}`);

    try {
      // Use existing PaymentService
      const payment = await this.paymentService.createPayment({
        referenceNumber: request.reference,
        amountPaid: request.amount,
        paymentChannel: request.channel,
        fspCode: this.mapChannelToFspCode(request.channel),
        payerName: request.payerName,
        payerPhone: request.payerPhone,
        transactionId: request.externalTxnId,
        currency: request.currency || 'TZS',
        description: `Payment via ${request.channel}`,
      });

      return {
        success: true,
        paymentId: payment.id,
        referenceNumber: request.reference,
        flow: 'INTERNAL',
        status: payment.status,
        message: 'Payment processed successfully',
      };
    } catch (error) {
      this.logger.error(`Internal payment failed: ${error.message}`);
      return {
        success: false,
        flow: 'INTERNAL',
        errorCode: 'INTERNAL_PAYMENT_FAILED',
        errorDescription: error.message,
      };
    }
  }

  /**
   * Map channel string to ApefChannel enum
   */
  private mapChannelToEnum(channel: string): ApefChannel | null {
    const normalized = channel?.toUpperCase();
    switch (normalized) {
      case 'TIGO':
        return ApefChannel.TIGO;
      case 'VODA':
      case 'VODACOM':
        return ApefChannel.VODA;
      case 'AIRTEL':
        return ApefChannel.AIRTEL;
      case 'BANK':
        return ApefChannel.BANK;
      case 'NORMAL':
        return ApefChannel.NORMAL;
      default:
        return null;
    }
  }

  /**
   * Map channel to FSP code for internal payments
   * Uses actual FSP codes from the database
   */
  private mapChannelToFspCode(channel: string): string {
    const normalized = channel?.toUpperCase();
    switch (normalized) {
      case 'TIGO':
      case 'MIXX':
        return 'MIXX';      // TigoPesa uses MIXX
      case 'VODA':
      case 'VODACOM':
      case 'MPESA':
        return 'VODACOM';   // M-Pesa uses VODACOM
      case 'AIRTEL':
        return 'AIRTEL';    // Airtel Money
      case 'BANK':
        return 'BANK';
      default:
        return 'BANK';
    }
  }
}
