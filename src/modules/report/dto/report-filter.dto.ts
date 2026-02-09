import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
}

export enum PaymentChannel {
  MPESA = 'MPESA',
  TIGO = 'TIGO',
  BANK = 'BANK',
  APEF = 'APEF',
}

export enum GroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum AgeingBucket {
  DAYS_0_30 = '0-30',
  DAYS_31_60 = '31-60',
  DAYS_61_90 = '61-90',
  DAYS_90_PLUS = '90+',
}

// Base filter DTO
export class BaseReportFilterDto {
  @ApiProperty({ description: 'Start date for report period' })
  @IsNotEmpty()
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ description: 'End date for report period' })
  @IsNotEmpty()
  @IsDateString()
  dateTo: string;

  @ApiProperty({ enum: ReportFormat, description: 'Output format' })
  @IsNotEmpty()
  @IsEnum(ReportFormat)
  format: ReportFormat;
}

// Payment Transaction Report Filter
export class PaymentReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by service provider ID' })
  @IsOptional()
  @IsUUID()
  serviceProviderId?: string;

  @ApiPropertyOptional({ enum: ['SUCCESS', 'FAILED', 'PENDING', 'REVERSED'] })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: PaymentChannel })
  @IsOptional()
  @IsEnum(PaymentChannel)
  channel?: PaymentChannel;

  @ApiPropertyOptional({ description: 'Minimum amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'FSP Code' })
  @IsOptional()
  fspCode?: string;
}

// Reference Report Filter
export class ReferenceReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by service provider ID' })
  @IsOptional()
  @IsUUID()
  serviceProviderId?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'] })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: ['COMPLETE', 'PARTIAL', 'PRECISE', 'LIMITED', 'PERPETUAL'] })
  @IsOptional()
  paymentOption?: string;

  @ApiPropertyOptional({ description: 'Customer name search' })
  @IsOptional()
  customerName?: string;
}

// Service Provider Report Filter
export class ServiceProviderReportFilterDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'UNDER_REVIEW', 'KYC_VERIFICATION', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ACTIVE'] })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: ['SCHOOL', 'MICROFINANCE', 'UTILITY', 'HEALTHCARE', 'GOVERNMENT', 'OTHER'] })
  @IsOptional()
  businessType?: string;

  @ApiPropertyOptional({ description: 'Region filter' })
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ description: 'District filter' })
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ enum: ReportFormat, description: 'Output format' })
  @IsNotEmpty()
  @IsEnum(ReportFormat)
  format: ReportFormat;
}

// Settlement Report Filter
export class SettlementReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by service provider ID' })
  @IsOptional()
  @IsUUID()
  serviceProviderId?: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DISPUTED'] })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'] })
  @IsOptional()
  period?: string;
}

// Revenue Summary Report Filter
export class RevenueSummaryReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by service provider ID' })
  @IsOptional()
  @IsUUID()
  serviceProviderId?: string;

  @ApiPropertyOptional({ enum: GroupBy, description: 'Group by period' })
  @IsOptional()
  @IsEnum(GroupBy)
  groupBy?: GroupBy;
}

// Channel Performance Report Filter
export class ChannelPerformanceReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by service provider ID' })
  @IsOptional()
  @IsUUID()
  serviceProviderId?: string;

  @ApiPropertyOptional({ enum: PaymentChannel })
  @IsOptional()
  @IsEnum(PaymentChannel)
  channel?: PaymentChannel;
}

// Collection Rate Report Filter
export class CollectionRateReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by service provider ID' })
  @IsOptional()
  @IsUUID()
  serviceProviderId?: string;

  @ApiPropertyOptional({ enum: ['SCHOOL', 'MICROFINANCE', 'UTILITY', 'HEALTHCARE', 'GOVERNMENT', 'OTHER'] })
  @IsOptional()
  businessType?: string;

  @ApiPropertyOptional({ enum: GroupBy, description: 'Group by period' })
  @IsOptional()
  @IsEnum(GroupBy)
  groupBy?: GroupBy;
}

// Outstanding Report Filter
export class OutstandingReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by service provider ID' })
  @IsOptional()
  @IsUUID()
  serviceProviderId?: string;

  @ApiPropertyOptional({ enum: AgeingBucket, description: 'Ageing bucket' })
  @IsOptional()
  @IsEnum(AgeingBucket)
  ageingBucket?: AgeingBucket;

  @ApiPropertyOptional({ description: 'Minimum amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiProperty({ enum: ReportFormat, description: 'Output format' })
  @IsNotEmpty()
  @IsEnum(ReportFormat)
  format: ReportFormat;
}

// Daily Trends Report Filter
export class DailyTrendsReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by service provider ID' })
  @IsOptional()
  @IsUUID()
  serviceProviderId?: string;
}

// Top Service Providers Report Filter
export class TopServiceProvidersReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Limit results', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: ['SCHOOL', 'MICROFINANCE', 'UTILITY', 'HEALTHCARE', 'GOVERNMENT', 'OTHER'] })
  @IsOptional()
  businessType?: string;
}
