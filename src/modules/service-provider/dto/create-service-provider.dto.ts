import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ServiceProviderType } from '../entities/service-provider.entity';

export class CreateServiceProviderDto {
  @ApiProperty({ description: 'Business name', example: 'Mwanga Primary School' })
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
    description: 'Business registration number from BRELA',
    example: 'BN123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Tax Identification Number from TRA',
    example: '123-456-789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tinNumber?: string;

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
    description: 'Contact person full name',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  contactPersonName: string;

  @ApiProperty({
    description: 'Contact person phone number',
    example: '+255712345678',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  contactPersonPhone: string;

  @ApiProperty({
    description: 'Contact person email',
    example: 'john.doe@mwangaschool.co.tz',
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(100)
  contactPersonEmail: string;

  @ApiPropertyOptional({
    description: 'Contact person NIDA number',
    example: '19901231-12345-67890-12',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactPersonIdNumber?: string;

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
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    description: 'Bank account name',
    example: 'Mwanga Primary School',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankAccountName?: string;

  @ApiPropertyOptional({
    description: 'Bank SWIFT code',
    example: 'CORUTZTZ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankSwiftCode?: string;

  @ApiPropertyOptional({
    description: 'Webhook URL for notifications',
    example: 'https://mwangaschool.co.tz/api/webhook',
  })
  @IsOptional()
  @IsString()
  webhookUrl?: string;
}
