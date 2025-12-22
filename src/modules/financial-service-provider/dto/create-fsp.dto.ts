import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsUrl,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsObject,
} from 'class-validator';
import { FspType } from '../entities/financial-service-provider.entity';

export class CreateFspDto {
  @ApiProperty({
    description: 'Unique FSP code (e.g., VODACOM, CRDB, NMB)',
    example: 'VODACOM',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  fspCode: string;

  @ApiProperty({
    description: 'Full name of the financial service provider',
    example: 'Vodacom Tanzania PLC',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Short name',
    example: 'Vodacom',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  shortName?: string;

  @ApiProperty({
    description: 'Type of financial service provider',
    enum: FspType,
    example: FspType.MNO,
  })
  @IsEnum(FspType)
  @IsNotEmpty()
  type: FspType;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+255712345678',
  })
  @IsString()
  @IsOptional()
  @MaxLength(15)
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'integration@vodacom.co.tz',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Physical address',
    example: 'Ali Hassan Mwinyi Road, Dar es Salaam',
  })
  @IsString()
  @IsOptional()
  physicalAddress?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://vodacom.co.tz',
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({
    description: 'SWIFT/BIC code (for banks)',
    example: 'CRDBTZTZ',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  swiftCode?: string;

  @ApiPropertyOptional({
    description: 'Central bank code (for banks)',
    example: '01',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  bankCode?: string;

  @ApiPropertyOptional({
    description: 'Mobile network operator code (for MNOs)',
    example: 'VDC',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  mnoCode?: string;

  @ApiPropertyOptional({
    description: 'USSD short code (for MNOs)',
    example: '*150#',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  ussdCode?: string;

  @ApiPropertyOptional({
    description: 'API base URL for integration',
    example: 'https://api.vodacom.co.tz/v1',
  })
  @IsUrl()
  @IsOptional()
  apiBaseUrl?: string;

  @ApiPropertyOptional({
    description: 'Callback URL for notifications',
    example: 'https://api.ucg.mhb.co.tz/api/v1/callbacks/vodacom',
  })
  @IsUrl()
  @IsOptional()
  callbackUrl?: string;

  @ApiPropertyOptional({
    description: 'Webhook URL',
    example: 'https://api.ucg.mhb.co.tz/api/v1/webhooks/vodacom',
  })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiPropertyOptional({
    description: 'API key (will be encrypted)',
    example: 'ak_live_xxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({
    description: 'API secret (will be encrypted)',
    example: 'sk_live_xxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsOptional()
  apiSecret?: string;

  @ApiPropertyOptional({
    description: 'Main GL account number for this FSP',
    example: '1001-2000-3000',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  glAccountNumber?: string;

  @ApiPropertyOptional({
    description: 'GL account name/description',
    example: 'Vodacom M-Pesa Collections',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  glAccountName?: string;

  @ApiPropertyOptional({
    description: 'Settlement GL account number',
    example: '1001-2000-3001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  glSettlementAccount?: string;

  @ApiPropertyOptional({
    description: 'Commission/fee GL account number',
    example: '1001-2000-3002',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  glCommissionAccount?: string;

  @ApiPropertyOptional({
    description: 'Suspense GL account for pending transactions',
    example: '1001-2000-3003',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  glSuspenseAccount?: string;

  @ApiPropertyOptional({
    description: 'Revenue GL account number',
    example: '4001-5000-6000',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  glRevenueAccount?: string;

  @ApiPropertyOptional({
    description: 'Charges/fees GL account number',
    example: '4001-5000-6001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  glChargesAccount?: string;

  @ApiPropertyOptional({
    description: 'Transaction fee percentage',
    example: 1.5,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  transactionFeePercentage?: number;

  @ApiPropertyOptional({
    description: 'Fixed transaction fee amount',
    example: 500,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  transactionFeeFixed?: number;

  @ApiPropertyOptional({
    description: 'Settlement period in days (T+N)',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  settlementPeriodDays?: number;

  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://cdn.ucg.co.tz/logos/vodacom.png',
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Description',
    example: 'Mobile money services via M-Pesa',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { supportedCurrencies: ['TZS'], maxTransactionAmount: 10000000 },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
