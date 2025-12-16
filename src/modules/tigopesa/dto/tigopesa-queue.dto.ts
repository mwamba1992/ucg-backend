/**
 * TigoPesa Queue Message DTOs
 * Used for RabbitMQ message passing
 */

/**
 * Payment Processing Queue Message
 * Sent to queue for async processing
 */
export class TigoPesaPaymentMessage {
  txnId: string;
  msisdn: string;
  amount: number;
  companyName: string;
  customerReferenceId: string;
  senderName?: string;
}

/**
 * Payment Processing Response
 */
export interface TigoPesaPaymentProcessingResponse {
  success: boolean;
  txnId: string;
  refId?: string;
  paymentId?: string;
  cbsTransferId?: string;
  errorCode?: string;
  errorDescription?: string;
}
