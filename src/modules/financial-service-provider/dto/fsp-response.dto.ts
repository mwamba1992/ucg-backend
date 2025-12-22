import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FspType, FspStatus } from '../entities/financial-service-provider.entity';

export class FspResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fspCode: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  shortName?: string;

  @ApiProperty({ enum: FspType })
  type: FspType;

  @ApiProperty({ enum: FspStatus })
  status: FspStatus;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  physicalAddress?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  swiftCode?: string;

  @ApiPropertyOptional()
  bankCode?: string;

  @ApiPropertyOptional()
  mnoCode?: string;

  @ApiPropertyOptional()
  ussdCode?: string;

  @ApiPropertyOptional()
  apiBaseUrl?: string;

  @ApiPropertyOptional()
  callbackUrl?: string;

  @ApiPropertyOptional()
  webhookUrl?: string;

  @ApiPropertyOptional()
  glAccountNumber?: string;

  @ApiPropertyOptional()
  glAccountName?: string;

  @ApiPropertyOptional()
  glSettlementAccount?: string;

  @ApiPropertyOptional()
  glCommissionAccount?: string;

  @ApiPropertyOptional()
  glSuspenseAccount?: string;

  @ApiPropertyOptional()
  glRevenueAccount?: string;

  @ApiPropertyOptional()
  glChargesAccount?: string;

  @ApiPropertyOptional()
  transactionFeePercentage?: number;

  @ApiPropertyOptional()
  transactionFeeFixed?: number;

  @ApiProperty()
  settlementPeriodDays: number;

  @ApiProperty()
  totalTransactions: number;

  @ApiProperty()
  totalVolume: number;

  @ApiPropertyOptional()
  lastTransactionAt?: Date;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
