import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceProviderType } from '../entities/service-provider.entity';
import { CreateContactDto } from './contact.dto';
import { CreateBankAccountDto } from './bank-account.dto';
import { CreateSettingsDto } from './settings.dto';

export class CreateServiceProviderDto {
  @ApiProperty({
    description: 'Business name',
    example: 'Mwanga Primary School',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  businessName: string;

  @ApiProperty({
    description: 'Type of service provider',
    enum: ServiceProviderType,
    example: ServiceProviderType.SCHOOL,
  })
  @IsNotEmpty()
  @IsEnum(ServiceProviderType)
  businessType: ServiceProviderType;

  @ApiPropertyOptional({
    description: 'Specify business type when businessType is OTHER',
    example: 'Community Center',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  otherBusinessType?: string;

  @ApiProperty({
    description: 'Business registration number from BRELA (unique)',
    example: 'BN123456789',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  registrationNumber: string;

  @ApiProperty({
    description: 'Tax Identification Number from TRA (unique)',
    example: '123-456-789',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  tinNumber: string;

  @ApiProperty({
    description: 'Business phone number',
    example: '+255712345678',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  phoneNumber: string;

  @ApiProperty({
    description: 'Business email address',
    example: 'info@mwangaschool.co.tz',
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiPropertyOptional({
    description: 'Physical address',
    example: 'Plot 123, Uhuru Street, Dar es Salaam',
  })
  @IsOptional()
  @IsString()
  physicalAddress?: string;

  @ApiPropertyOptional({
    description: 'Region',
    example: 'Dar es Salaam',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({
    description: 'District',
    example: 'Kinondoni',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiProperty({
    description: 'Primary contact person details',
    type: CreateContactDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateContactDto)
  contact: CreateContactDto;

  @ApiProperty({
    description: 'Bank account details (at least one required)',
    type: [CreateBankAccountDto],
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one bank account is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateBankAccountDto)
  bankAccounts: CreateBankAccountDto[];

  @ApiPropertyOptional({
    description: 'Settlement and configuration settings',
    type: CreateSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSettingsDto)
  settings?: CreateSettingsDto;
}
