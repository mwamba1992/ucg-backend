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
  IsUrl,
  IsEmail,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentOption } from '../entities/payment-reference.entity';

/**
 * DTO for reference line item (service breakdown)
 */
export class ReferenceLineItemDto {
  @ApiProperty({
    description: 'Service department code',
    example: '3001',
  })
  @IsNotEmpty()
  @IsString()
  serviceDepartment: string;

  @ApiProperty({
    description: 'Service type code',
    example: '140354565431',
  })
  @IsNotEmpty()
  @IsString()
  serviceType: string;

  @ApiPropertyOptional({
    description: 'Service reference/code',
    example: 'B1IT115800000',
  })
  @IsOptional()
  @IsString()
  serviceReference?: string;

  @ApiPropertyOptional({
    description: 'Service description',
    example: 'Consultation fee',
  })
  @IsOptional()
  @IsString()
  serviceDescription?: string;

  @ApiProperty({
    description: 'Service amount',
    example: 10000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  serviceAmount: number;

  @ApiPropertyOptional({
    description: 'Payment priority (1=highest)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  paymentPriority?: number;

  @ApiPropertyOptional({
    description: 'Additional service-specific metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

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

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  customerEmail?: string;

  @ApiPropertyOptional({
    description: 'Customer ID (National ID, Passport, Tax ID, etc.)',
    example: '19800101-12345-67890-12',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Customer ID Type (1=National ID, 2=Passport, 3=Driving License, 4=Tax ID, etc.)',
    example: '1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerIdType?: string;

  @ApiPropertyOptional({
    description: 'Customer account number with service provider',
    example: 'ACC-2024-00123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerAccount?: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 50000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({
    description: 'Minimum payment amount (for partial payments)',
    example: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPaymentAmount?: number;

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
    description: 'Exchange rate for multi-currency support',
    example: 1.0,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

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
    description: 'Workstation/terminal ID that generated the reference',
    example: 'TERMINAL-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  workstation?: string;

  @ApiPropertyOptional({
    description: 'Who created the reference',
    example: 'John Smith',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  issuedBy?: string;

  @ApiPropertyOptional({
    description: 'Who approved the reference',
    example: 'Jane Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  approvedBy?: string;

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

  @ApiPropertyOptional({
    description: 'Service line items breakdown (optional detailed breakdown of services)',
    type: [ReferenceLineItemDto],
    example: [
      {
        serviceDepartment: '3001',
        serviceType: '140354565431',
        serviceReference: 'B1IT115800000',
        serviceDescription: 'Consultation fee',
        serviceAmount: 30000,
        paymentPriority: 1,
      },
      {
        serviceDepartment: '3002',
        serviceType: '140354565432',
        serviceDescription: 'Laboratory tests',
        serviceAmount: 20000,
        paymentPriority: 2,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceLineItemDto)
  lineItems?: ReferenceLineItemDto[];

  @ApiPropertyOptional({
    description: 'Callback URL to receive notification when reference is generated (for async requests)',
    example: 'https://your-app.com/webhooks/reference-created',
  })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}
