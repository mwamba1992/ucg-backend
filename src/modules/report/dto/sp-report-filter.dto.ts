import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
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

// Base SP filter DTO - serviceProviderId is injected from JWT
export class SpBaseReportFilterDto {
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

// SP Payment Report Filter
export class SpPaymentReportFilterDto extends SpBaseReportFilterDto {
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
}

// SP Reference Report Filter
export class SpReferenceReportFilterDto extends SpBaseReportFilterDto {
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

// SP Revenue Summary Report Filter
export class SpRevenueSummaryReportFilterDto extends SpBaseReportFilterDto {
  @ApiPropertyOptional({ enum: GroupBy, description: 'Group by period' })
  @IsOptional()
  @IsEnum(GroupBy)
  groupBy?: GroupBy;
}

// SP Channel Performance Report Filter
export class SpChannelPerformanceReportFilterDto extends SpBaseReportFilterDto {
  @ApiPropertyOptional({ enum: PaymentChannel })
  @IsOptional()
  @IsEnum(PaymentChannel)
  channel?: PaymentChannel;
}

// SP Outstanding Report Filter
export class SpOutstandingReportFilterDto {
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

// SP Daily Trends Report Filter
export class SpDailyTrendsReportFilterDto extends SpBaseReportFilterDto {}

// SP Collection Rate Report Filter
export class SpCollectionRateReportFilterDto extends SpBaseReportFilterDto {
  @ApiPropertyOptional({ enum: GroupBy, description: 'Group by period' })
  @IsOptional()
  @IsEnum(GroupBy)
  groupBy?: GroupBy;
}

// SP Customer Report Filter
export class SpCustomerReportFilterDto extends SpBaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Customer name search' })
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Limit results', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number;
}

// SP Settlement Report Filter
export class SpSettlementReportFilterDto extends SpBaseReportFilterDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DISPUTED'] })
  @IsOptional()
  status?: string;
}
