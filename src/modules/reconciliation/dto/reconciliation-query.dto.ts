import { IsOptional, IsDateString, IsEnum, IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SettlementPeriod, SettlementStatus } from '../entities/settlement.entity';

export class ReconciliationQueryDto {
  @ApiProperty({
    description: 'Service Provider ID',
    example: '58bfe4aa-0843-47ea-8a19-467f702aebc4',
  })
  @IsUUID()
  serviceProviderId: string;

  @ApiProperty({
    description: 'Start date (ISO 8601)',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date (ISO 8601)',
    example: '2025-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Settlement status',
    enum: SettlementStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(SettlementStatus)
  status?: SettlementStatus;

  @ApiProperty({
    description: 'Reconciliation status',
    example: true,
    required: false,
  })
  @IsOptional()
  isReconciled?: boolean;
}

export class TransactionQueryDto {
  @ApiProperty({
    description: 'Service Provider ID',
    example: '58bfe4aa-0843-47ea-8a19-467f702aebc4',
  })
  @IsUUID()
  serviceProviderId: string;

  @ApiProperty({
    description: 'Transaction date start (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Transaction date end (ISO 8601)',
    example: '2025-01-31T23:59:59Z',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Payment status filter',
    example: 'SUCCESS',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Payment channel filter',
    example: 'M-Pesa',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentChannel?: string;
}

export class GenerateSettlementDto {
  @ApiProperty({
    description: 'Service Provider ID',
    example: '58bfe4aa-0843-47ea-8a19-467f702aebc4',
  })
  @IsUUID()
  serviceProviderId: string;

  @ApiProperty({
    description: 'Period start date (ISO 8601)',
    example: '2025-01-01',
  })
  @IsDateString()
  periodStart: string;

  @ApiProperty({
    description: 'Period end date (ISO 8601)',
    example: '2025-01-31',
  })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({
    description: 'Settlement period type',
    enum: SettlementPeriod,
    example: SettlementPeriod.DAILY,
  })
  @IsEnum(SettlementPeriod)
  period: SettlementPeriod;
}
