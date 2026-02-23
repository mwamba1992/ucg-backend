import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Airtel C2B Validate Transaction Request DTO
 * Received from Airtel to validate if a reference/account exists
 */
export class AirtelValidateRequestDto {
  @IsString()
  TYPE: string; // VALIDATETXN

  @IsString()
  TXNID: string; // Airtel transaction ID

  @IsString()
  MSISDN: string; // Customer phone number (payer)

  @IsNumber()
  @Type(() => Number)
  AMOUNT: number; // Payment amount

  @IsString()
  COMPANYNAME: string; // Partner company identifier

  @IsString()
  CUSTOMERREFERENCEID: string; // Bill/payment reference number

  @IsString()
  @IsOptional()
  SENDERNAME?: string; // Name of payer/sender
}

/**
 * Airtel C2B Validate Transaction Response DTO
 */
export class AirtelValidateResponseDto {
  TYPE: string; // VALIDATETXNRESPONSE
  TXNID: string; // Original Airtel transaction ID
  REFID: string; // Partner's reference ID
  RESULT: string; // "TS" (success) or "TF" (failure)
  ERRORCODE: string; // error000 (success), etc.
  ERRORDESC?: string; // Error description
  MSISDN: string; // Customer phone number
  FLAG: string; // "Y" or "N" - show CONTENT to customer
  CONTENT?: string; // Message to display to customer
}

/**
 * Airtel C2B Process Transaction Request DTO
 * Received from Airtel to process the actual payment
 */
export class AirtelProcessRequestDto {
  @IsString()
  TYPE: string; // PROCESSTXN

  @IsString()
  TXNID: string; // Airtel transaction ID

  @IsString()
  MSISDN: string; // Customer phone number

  @IsNumber()
  @Type(() => Number)
  AMOUNT: number; // Payment amount

  @IsString()
  COMPANYNAME: string; // Partner company identifier

  @IsString()
  CUSTOMERREFERENCEID: string; // Bill/payment reference number

  @IsString()
  @IsOptional()
  SENDERNAME?: string; // Name of payer/sender
}

/**
 * Airtel C2B Process Transaction Response DTO
 */
export class AirtelProcessResponseDto {
  TYPE: string; // PROCESSTXNRESPONSE
  TXNID: string; // Original Airtel transaction ID
  REFID: string; // Partner's reference/transaction ID
  RESULT: string; // "TS" (success) or "TF" (failure)
  ERRORCODE: string; // error000 (success), etc.
  ERRORDESC?: string; // Error description
  MSISDN: string; // Customer phone number
  FLAG: string; // "Y" or "N"
  CONTENT?: string; // Message to display to customer
}

/**
 * Airtel C2B Transaction Enquiry Request DTO
 * Used by Airtel to check the status of a previously processed transaction
 */
export class AirtelEnquiryRequestDto {
  @IsString()
  TYPE: string; // TXNENQUIRY

  @IsString()
  TXNID: string; // Airtel transaction ID to enquire about

  @IsString()
  @IsOptional()
  MSISDN?: string;

  @IsString()
  @IsOptional()
  COMPANYNAME?: string;
}

/**
 * Airtel C2B Transaction Enquiry Response DTO
 */
export class AirtelEnquiryResponseDto {
  TYPE: string; // TXNENQUIRYRESPONSE
  TXNID: string;
  REFID: string;
  RESULT: string; // "TS" or "TF"
  ERRORCODE: string;
  ERRORDESC?: string;
  MSISDN?: string;
  FLAG: string;
  CONTENT?: string;
}

/**
 * Airtel C2B Bill Fetch Request DTO
 * Used by Airtel to fetch bill details for a customer reference
 */
export class AirtelBillFetchRequestDto {
  @IsString()
  TYPE: string; // BILLFETCH

  @IsString()
  CUSTOMERREFERENCEID: string; // Reference number to fetch bill for

  @IsString()
  @IsOptional()
  MSISDN?: string;

  @IsString()
  @IsOptional()
  COMPANYNAME?: string;
}

/**
 * Airtel C2B Bill Fetch Response DTO
 */
export class AirtelBillFetchResponseDto {
  TYPE: string; // BILLFETCHRESPONSE
  CUSTOMERREFERENCEID: string;
  RESULT: string; // "TS" or "TF"
  ERRORCODE: string;
  ERRORDESC?: string;
  AMOUNT?: string; // Bill amount
  CUSTOMERNAME?: string; // Customer name
  DESCRIPTION?: string; // Bill description
  FLAG: string;
  CONTENT?: string;
}

/**
 * Airtel C2B Lookup Details Request DTO
 * Used by Airtel to look up customer/reference details
 */
export class AirtelLookupRequestDto {
  @IsString()
  TYPE: string; // LOOKUPDETAILS

  @IsString()
  CUSTOMERREFERENCEID: string;

  @IsString()
  @IsOptional()
  MSISDN?: string;

  @IsString()
  @IsOptional()
  COMPANYNAME?: string;
}

/**
 * Airtel C2B Lookup Details Response DTO
 */
export class AirtelLookupResponseDto {
  TYPE: string; // LOOKUPDETAILSRESPONSE
  CUSTOMERREFERENCEID: string;
  RESULT: string; // "TS" or "TF"
  ERRORCODE: string;
  ERRORDESC?: string;
  CUSTOMERNAME?: string;
  AMOUNT?: string;
  DESCRIPTION?: string;
  FLAG: string;
  CONTENT?: string;
}

/**
 * Airtel Error Codes (same pattern as TigoPesa)
 */
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

/**
 * Airtel Result Codes
 */
export enum AirtelResult {
  SUCCESS = 'TS',
  FAILURE = 'TF',
}
