import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  MaxLength,
  IsDateString,
  IsObject,
  IsEnum,
} from 'class-validator';
import { PaymentOption } from '../entities/payment-reference.entity';

export class CreateReferenceDto {
  @ApiProperty({
    description: 'Service Provider ID',
    example: 'uuid-here',
  })
  @IsNotEmpty()
  @IsUUID()
  serviceProviderId: string;

  @ApiProperty({
    description: 'Customer full name',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  customerName: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+255712345678',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  customerPhone: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 50000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({
    description: 'Payment description/purpose',
    example: 'School fees for Term 1',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'TZS',
    default: 'TZS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Payment option defining how payment should be received',
    enum: PaymentOption,
    default: PaymentOption.COMPLETE,
    example: PaymentOption.COMPLETE,
  })
  @IsOptional()
  @IsEnum(PaymentOption)
  paymentOption?: PaymentOption;

  @ApiPropertyOptional({
    description: 'Reference expiry date (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { studentId: 'STD001', class: 'Form 1' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
