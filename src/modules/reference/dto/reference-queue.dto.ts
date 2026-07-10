import { IsString, IsBoolean, IsOptional, IsNumber, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentOption } from '../entities/payment-reference.entity';

/**
 * Line item interface for queue messages
 */
export interface ReferenceLineItemMessage {
  serviceDepartment: string;
  serviceType: string;
  serviceReference?: string;
  serviceDescription?: string;
  serviceAmount: number;
  paymentPriority?: number;
  metadata?: Record<string, any>;
}

/**
 * Message DTO for creating a single reference
 */
export class CreateReferenceMessage {
  serviceProviderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerId?: string;
  customerIdType?: string;
  customerAccount?: string;
  amount: number;
  minPaymentAmount?: number;
  paymentOption?: PaymentOption; // Optional with default
  description?: string;
  currency?: string;
  exchangeRate?: number;
  workstation?: string;
  issuedBy?: string;
  approvedBy?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  lineItems?: ReferenceLineItemMessage[];
  requestId?: string; // For tracking and idempotency
  callbackUrl?: string; // Webhook URL for async notifications
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
    customerId?: string;
    customerIdType?: string;
    customerAccount?: string;
    amount: number;
    minPaymentAmount?: number;
    paymentOption?: PaymentOption; // Optional with default
    description?: string;
    currency?: string;
    exchangeRate?: number;
    workstation?: string;
    issuedBy?: string;
    approvedBy?: string;
    expiresAt?: Date;
    metadata?: Record<string, any>;
    lineItems?: ReferenceLineItemMessage[];
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

/**
 * Message DTO for reference notification callbacks
 */
export class ReferenceNotificationMessage {
  @IsString()
  callbackUrl: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsBoolean()
  success: boolean;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsObject()
  reference?: {
    id: string;
    referenceNumber: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    currency: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
  };

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  apiKey?: string; // SP's API key, sent as x-api-key header on the callback

  @IsOptional()
  @IsNumber()
  retryCount?: number;
}
