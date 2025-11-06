import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReferenceStatus } from '../entities/payment-reference.entity';

export class ReferenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  referenceNumber: string;

  @ApiProperty()
  serviceProviderId: string;

  @ApiPropertyOptional()
  serviceProviderName?: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  customerPhone: string;

  @ApiProperty()
  amount: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty({ enum: ReferenceStatus })
  status: ReferenceStatus;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  usedAt?: Date;

  @ApiPropertyOptional()
  transactionId?: string;

  @ApiProperty()
  isValid: boolean;

  @ApiProperty()
  isExpired: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ValidateReferenceResponseDto {
  @ApiProperty()
  isValid: boolean;

  @ApiProperty()
  referenceNumber: string;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  reference?: ReferenceResponseDto;
}
