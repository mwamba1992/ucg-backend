/**
 * M-Pesa Queue Message DTOs
 * Used for RabbitMQ message passing
 */

/**
 * Payment Processing Queue Message
 * Sent to queue for async processing
 */
export class MpesaPaymentMessage {
  mpesaReceipt: string;
  conversationId: string;
  originatorConversationId: string;
  transactionId: string;
  referenceNumber: string;
  amount: number;
  customerPhone: string;
  customerName?: string;
  commandId: string;
  transactionDate: string;
}

/**
 * Callback Queue Message
 * Sent to queue for callback delivery
 */
export class MpesaCallbackMessage {
  conversationId: string;
  originatorConversationId: string;
  transactionId: string;
  mpesaReceipt: string;
  resultCode: string; // "0" or "999"
  resultType: string; // "Completed" or "Failed"
  resultDesc: string;
}

/**
 * Validation Queue Message
 * Sent to queue for async validation
 */
export class MpesaValidationMessage {
  mpesaReceipt: string;
  referenceNumber: string;
  amount: number;
  customerPhone: string;
}

/**
 * Payment Processing Response
 */
export interface MpesaPaymentProcessingResponse {
  success: boolean;
  mpesaReceipt: string;
  paymentId?: string;
  cbsTransferId?: string;
  error?: string;
}

/**
 * Callback Response
 */
export interface MpesaCallbackResponse {
  success: boolean;
  conversationId: string;
  sentAt?: Date;
  error?: string;
}
