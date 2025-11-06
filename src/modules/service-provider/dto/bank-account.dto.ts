import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBankAccountDto {
  @ApiProperty({
    description: 'Bank name',
    example: 'CRDB Bank',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  bankName: string;

  @ApiProperty({
    description: 'Bank account number',
    example: '0150123456789',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  accountNumber: string;

  @ApiProperty({
    description: 'Bank account name',
    example: 'Mwanga Primary School',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  accountName: string;

  @ApiPropertyOptional({
    description: 'Bank SWIFT code',
    example: 'CORUTZTZ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  swiftCode?: string;

  @ApiPropertyOptional({
    description: 'Branch name',
    example: 'Dar es Salaam Branch',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchName?: string;

  @ApiPropertyOptional({
    description: 'Branch code',
    example: '001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchCode?: string;

  @ApiPropertyOptional({
    description: 'Account type',
    example: 'SAVINGS',
    default: 'SAVINGS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountType?: string;

  @ApiPropertyOptional({
    description: 'Is this the primary account for settlements',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
