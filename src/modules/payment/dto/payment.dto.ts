import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  MaxLength,
  Min,
  IsUUID,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Unique payment reference number',
    example: 'SCHOOL-2025-0001',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  referenceNumber: string;

  @ApiProperty({
    description: 'Full name of the person making the payment',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  payerName: string;

  @ApiProperty({
    description: 'Phone number of the payer',
    example: '+255712345678',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  payerPhone: string;

  @ApiProperty({
    description: 'Amount paid by the payer',
    example: 50000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  amountPaid: number;

  @ApiPropertyOptional({
    description: 'Currency code used in payment (default TZS)',
    example: 'TZS',
    default: 'TZS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({
    description: 'Payment Channel, method used to pay',
    example: 'Bank',
    default: 'Bank',
  })@IsNotEmpty()
  @IsString()
  @MaxLength(10)
  paymentChannel?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID (if applicable)',
    example: 'string',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Optional payment description or purpose',
    example: 'Payment for service invoice #INV-1234',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
