import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * TigoPesa W2A Bill Payment Request DTO
 * Received from TigoPesa when customer pays from their wallet
 */
export class TigoPesaBillPayRequestDto {
  @IsString()
  TYPE: string; // SYNC_BILLPAY_REQUEST

  @IsString()
  TXNID: string; // TigoPesa transaction ID (e.g., BP140218.1240.B01530)

  @IsString()
  MSISDN: string; // Customer phone number (payer)

  @IsNumber()
  @Type(() => Number)
  AMOUNT: number; // Payment amount

  @IsString()
  COMPANYNAME: string; // Partner company identifier (e.g., "12345")

  @IsString()
  CUSTOMERREFERENCEID: string; // Bill/payment reference number

  @IsString()
  @IsOptional()
  SENDERNAME?: string; // Name of payer/sender (e.g., "James Kaparata")
}

/**
 * TigoPesa W2A Bill Payment Response DTO
 * Sent back to TigoPesa after processing payment
 */
export class TigoPesaBillPayResponseDto {
  TYPE: string; // SYNC_BILLPAY_RESPONSE

  TXNID: string; // Original TigoPesa transaction ID

  REFID: string; // Partner's reference/transaction ID

  RESULT: string; // "TS" (success) or "TF" (failure)

  ERRORCODE: string; // error000 (success), error001, error010, etc.

  ERRORDESC?: string; // Error description (optional)

  MSISDN: string; // Customer phone number

  FLAG: string; // "Y" or "N" - whether to show CONTENT to customer

  CONTENT?: string; // Message to display to customer (optional, pipe-delimited)
}

/**
 * TigoPesa Error Codes
 */
export enum TigoPesaErrorCode {
  SUCCESS = 'error000',
  SERVICE_NOT_AVAILABLE = 'error001',
  INVALID_REFERENCE = 'error010',
  ACCOUNT_LOCKED = 'error011',
  INVALID_AMOUNT = 'error012',
  INSUFFICIENT_AMOUNT = 'error013',
  AMOUNT_TOO_HIGH = 'error014',
  AMOUNT_TOO_LOW = 'error015',
  INVALID_PAYMENT = 'error016',
  GENERAL_ERROR = 'error100',
  RETRY_NO_RESPONSE = 'error111',
}

/**
 * TigoPesa Result Codes
 */
export enum TigoPesaResult {
  SUCCESS = 'TS',
  FAILURE = 'TF',
}
