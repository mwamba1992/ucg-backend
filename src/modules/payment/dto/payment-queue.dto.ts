import { PaymentStatus } from '../entities/payment.entity';

/**
 * Message DTO for processing a payment
 */
export class ProcessPaymentMessage {
  referenceNumber: string;
  amountPaid: number;
  paymentChannel: string; // Payment channel/method (e.g., 'Bank', 'Mobile Money')
  payerName?: string;
  payerPhone?: string;
  transactionId?: string;
  currency?: string;
  description?: string;
  requestId?: string; // For tracking and idempotency
}

/**
 * Message DTO for payment notification
 */
export class PaymentNotificationMessage {
  paymentId: string;
  referenceNumber: string;
  amountPaid: number;
  status: PaymentStatus;
  serviceProviderId: string;
  notificationType: 'EMAIL' | 'SMS' | 'WEBHOOK';
  requestId?: string;
}

/**
 * Response DTO for async payment processing
 */
export class PaymentProcessedResponse {
  success: boolean;
  payment?: any;
  error?: string;
  validationError?: string;
  requestId?: string;
}

/**
 * Response DTO for payment notification
 */
export class PaymentNotificationResponse {
  success: boolean;
  notificationId?: string;
  notificationType: string;
  error?: string;
  requestId?: string;
}
