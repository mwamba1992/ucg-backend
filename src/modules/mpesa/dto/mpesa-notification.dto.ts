import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * M-Pesa C2B Payment Notification DTO
 * Parsed from XML notification sent by M-Pesa
 */
export class MpesaC2BNotificationDto {
  // Service Provider
  @IsString()
  spId: string;

  @IsString()
  spPassword: string;

  @IsString()
  timestamp: string;

  // Transaction
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  commandID: string;

  @IsString()
  initiator: string; // Customer phone number

  @IsString()
  originatorConversationID: string;

  @IsString()
  recipient: string; // Business number

  @IsString()
  mpesaReceipt: string;

  @IsDateString()
  transactionDate: string;

  @IsString()
  accountReference: string; // Payment reference number

  @IsString()
  transactionID: string;

  @IsString()
  conversationID: string;
}

/**
 * Sync Response DTO
 * Immediate response sent back to M-Pesa
 */
export class MpesaSyncResponseDto {
  conversationID: string;
  originatorConversationID: string;
  transactionID: string;
  responseCode: string; // Always "0"
  responseDesc: string; // Always "Received"
  serviceStatus: string; // Always "Success"
}

/**
 * Callback DTO
 * Result sent back to M-Pesa after processing
 */
export class MpesaCallbackDto {
  // Service Provider
  spId: string;
  spPassword: string;
  timestamp: string;

  // Transaction Result
  resultType: string; // "Completed" or "Failed"
  resultCode: string; // "0" for success, "999" for failure
  resultDesc: string; // Description
  serviceReceipt: string; // M-Pesa receipt
  serviceDate: string; // ISO date
  originatorConversationID: string;
  conversationID: string;
  transactionID: string;
  initiator: string;
  initiatorPassword: string;
}
