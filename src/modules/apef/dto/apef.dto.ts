import { IsString, IsNumber, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { ApefChannel } from '../entities/apef-payment.entity';

// ============ INCOMING PAYMENT REQUEST ============

export class ApefPaymentRequestDto {
  @IsString()
  @IsNotEmpty()
  reference: string; // APEF account number (e.g., 906781576)

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  externalTxnId: string; // Unique transaction ID from channel

  @IsEnum(ApefChannel)
  @IsNotEmpty()
  channel: ApefChannel; // TIGO | VODA | BANK | NORMAL

  @IsOptional()
  rawPayload?: Record<string, any>;

  @IsOptional()
  @IsString()
  payerName?: string;

  @IsOptional()
  @IsString()
  payerPhone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  fspCode?: string; // Original FSP code from PSP payload (e.g., MHB, NMB, CRDB)
}

// ============ APEF API DTOs ============

// Login Request
export class ApefLoginRequestDto {
  clientId: string;
  clientSecret: string;
}

// Login Response
export class ApefLoginResponseDto {
  token: string;
  bankCode: string;
  bankName: string;
}

// Validate Account Request
export class ApefValidateAccountRequestDto {
  apefAccountNumber: string;
}

// Validate Account Response
export class ApefValidateAccountResponseDto {
  success: boolean;
  customerName?: string;
  amount?: number;
  currency?: string;
  billDescription?: string;
  rawResponse?: Record<string, any>;
  errorMessage?: string;
}

// Deposit Notification Request
export class ApefDepositNotificationRequestDto {
  transactionReference: string; // Our unique transaction ID
  apefAccountNumber: string;    // APEF reference
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  bankCode: string;
  receiptDateAndTime: string;   // ISO format
}

// Deposit Notification Response
export class ApefDepositNotificationResponseDto {
  success: boolean;
  message?: string;
  rawResponse?: Record<string, any>;
  errorMessage?: string;
}

// ============ PAYMENT PROCESSING RESPONSE ============

export class ApefPaymentResponseDto {
  success: boolean;
  paymentId?: string;
  referenceNumber?: string;
  status?: string;
  message?: string;
  errorCode?: string;
  errorDescription?: string;
}

// ============ ERROR CODES ============

export enum ApefErrorCode {
  SUCCESS = 'SUCCESS',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_REFERENCE_PREFIX = 'INVALID_REFERENCE_PREFIX',
  APEF_VALIDATION_FAILED = 'APEF_VALIDATION_FAILED',
  APEF_TOKEN_ERROR = 'APEF_TOKEN_ERROR',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  GL_DEPOSIT_FAILED = 'GL_DEPOSIT_FAILED',
  APEF_NOTIFICATION_FAILED = 'APEF_NOTIFICATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
