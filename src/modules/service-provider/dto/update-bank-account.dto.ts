import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateBankAccountDto {
  @ApiPropertyOptional({
    description: 'Bank name',
    example: 'CRDB Bank',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Bank account number',
    example: '0150123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountNumber?: string;

  @ApiPropertyOptional({
    description: 'Bank account name',
    example: 'Mwanga Primary School',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountName?: string;

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
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountType?: string;

  @ApiPropertyOptional({
    description: 'Is this the primary account for settlements',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Is this account active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
