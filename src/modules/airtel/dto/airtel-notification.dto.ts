import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Airtel Standard C2B contract DTOs.
 *
 * The wire format is XML under a <COMMAND> root element. Airtel POSTs these to
 * our partner-hosted endpoints and we parse the raw XML manually in
 * AirtelService, so the class-validator decorators below document the contract
 * rather than acting as an enforced ValidationPipe schema.
 *
 * Every response carries an HTTP-style <STATUS> element (see AirtelStatus).
 */

/**
 * Status codes returned in the <STATUS> element of every response.
 */
export enum AirtelStatus {
  OK = 200, // valid request / successful transaction / entity exists
  BAD_REQUEST = 400, // bad request / failed transaction / invalid reference
  NOT_FOUND = 404, // entity (txn / bill / user) does not exist
}

/* ============================================================
 * Request DTOs
 * ============================================================ */

/**
 * Validate & Process Transaction request (TYPE = "C2B").
 *
 * Both endpoints share this shape; Process additionally carries REFERENCE2.
 * Note: REFERENCE is the reference number entered by the user (our payment
 * reference / lookup key) and REFERENCE1 is Airtel's own system transaction id
 * (used for de-duplication and status enquiry).
 */
export class AirtelC2BRequestDto {
  @IsString()
  TYPE: string; // Static value: "C2B"

  @IsString()
  CUSTOMERMSISDN: string; // Payer msisdn, including country code

  @IsString()
  MERCHANTMSISDN: string; // Partner msisdn

  @IsString()
  @IsOptional()
  CUSTOMERNAME?: string; // Name of the customer

  @IsNumber()
  @Type(() => Number)
  AMOUNT: number; // Amount to be paid (up to 2 decimals)

  @IsString()
  @IsOptional()
  PIN?: string;

  @IsString()
  @IsOptional()
  REFERENCE?: string; // User-entered reference -> our payment reference number

  @IsString()
  @IsOptional()
  USERNAME?: string;

  @IsString()
  @IsOptional()
  PASSWORD?: string;

  @IsString()
  REFERENCE1: string; // Airtel system transaction id (dedup / enquiry key)

  @IsString()
  @IsOptional()
  REFERENCE2?: string; // Mobiquity (AM) transaction id (Process only)
}

/**
 * Transaction Enquiry request.
 */
export class AirtelEnquiryRequestDto {
  @IsString()
  TXNID: string; // Airtel system transaction id (== REFERENCE1)

  @IsString()
  MSISDN: string; // Subscriber's mobile number
}

/**
 * Bill Fetch request (TYPE = "BILLFETCH").
 */
export class AirtelBillFetchRequestDto {
  @IsString()
  TYPE: string; // Static value: "BILLFETCH"

  @IsString()
  CUSTOMERMSISDN: string; // Msisdn of the subscriber

  @IsString()
  @IsOptional()
  USERNAME?: string;

  @IsString()
  @IsOptional()
  PASSWORD?: string;

  @IsString()
  @IsOptional()
  CUSTOMERREF?: string; // Reference number to fetch the bill for
}

/**
 * Lookup Details request (TYPE = "LOOKUP").
 */
export class AirtelLookupRequestDto {
  @IsString()
  TYPE: string; // Static value: "LOOKUP"

  @IsString()
  CUSTOMERMSISDN: string; // Msisdn of the subscriber

  @IsString()
  @IsOptional()
  USERNAME?: string;

  @IsString()
  @IsOptional()
  PASSWORD?: string;

  @IsString()
  @IsOptional()
  CUSTOMERREF?: string; // Reference number to look up
}

/* ============================================================
 * Response DTOs
 * ============================================================ */

/**
 * Validate Transaction response: <STATUS> 200 | 400.
 */
export class AirtelValidateResponseDto {
  STATUS: AirtelStatus;
  MESSAGE: string;
}

/**
 * Process Transaction response: <STATUS> 200 | 400.
 */
export class AirtelProcessResponseDto {
  STATUS: AirtelStatus;
  TXNID: string; // Partner's transaction id
  MESSAGE: string;
}

/**
 * Transaction Enquiry response: <STATUS> 200 | 400 | 404.
 */
export class AirtelEnquiryResponseDto {
  STATUS: AirtelStatus;
  MESSAGE: string;
  REF: string; // Partner's transaction id
}

/**
 * Bill Fetch response: <STATUS> 200 | 404.
 */
export class AirtelBillFetchResponseDto {
  STATUS: AirtelStatus;
  FIRSTNAME: string;
  LASTNAME: string;
  DUEDATE?: string; // YYYY-MM-DD
  AMOUNT: string;
  CURRENCY: string; // ISO-4217, e.g. "TZS"
  MESSAGE?: string;
}

/**
 * Lookup Details response: <STATUS> 200 | 404.
 */
export class AirtelLookupResponseDto {
  STATUS: AirtelStatus;
  FIRSTNAME: string;
  LASTNAME: string;
  MESSAGE?: string;
}

/* ============================================================
 * Internal bookkeeping codes.
 *
 * NOT part of the Airtel wire contract — persisted on
 * AirtelTransaction.resultCode for audit and internal status tracking.
 * ============================================================ */
export enum AirtelErrorCode {
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
