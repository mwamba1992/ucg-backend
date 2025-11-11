import { PaymentOption } from '../entities/payment-reference.entity';

/**
 * Message DTO for creating a single reference
 */
export class CreateReferenceMessage {
  serviceProviderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  paymentOption?: PaymentOption; // Optional with default
  description?: string;
  metadata?: Record<string, any>;
  validUntil?: Date;
  currency?: string;
  expiresAt?: Date;
  requestId?: string; // For tracking and idempotency
}

/**
 * Message DTO for bulk reference generation
 */
export class BulkReferenceMessage {
  serviceProviderId: string;
  references: Array<{
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    amount: number;
    paymentOption?: PaymentOption; // Optional with default
    description?: string;
    metadata?: Record<string, any>;
  }>;
  requestId?: string;
}

/**
 * Message DTO for reference validation
 */
export class ValidateReferenceMessage {
  referenceNumber: string;
  requestId?: string;
}

/**
 * Response DTO for async reference creation
 */
export class ReferenceCreatedResponse {
  success: boolean;
  referenceNumber?: string;
  reference?: any;
  error?: string;
  requestId?: string;
}

/**
 * Response DTO for bulk reference creation
 */
export class BulkReferenceResponse {
  success: boolean;
  totalRequested: number;
  totalCreated: number;
  references?: any[];
  errors?: Array<{ index: number; error: string }>;
  requestId?: string;
}

/**
 * Response DTO for reference validation
 */
export class ReferenceValidationResponse {
  valid: boolean;
  referenceNumber: string;
  reference?: any;
  reason?: string;
  requestId?: string;
}
