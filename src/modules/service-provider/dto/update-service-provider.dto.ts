import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OnboardingStatus } from '../entities/service-provider.entity';
import { CreateContactDto } from './contact.dto';
import { CreateBankAccountDto } from './bank-account.dto';
import { CreateSettingsDto } from './settings.dto';

export class UpdateServiceProviderDto {
  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Business type' })
  @IsOptional()
  businessType?: string;

  @ApiPropertyOptional({ description: 'Other business type (if businessType is OTHER)' })
  @IsOptional()
  otherBusinessType?: string;

  @ApiPropertyOptional({ description: 'Registration number' })
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'TIN number' })
  @IsOptional()
  tinNumber?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Physical address' })
  @IsOptional()
  physicalAddress?: string;

  @ApiPropertyOptional({ description: 'Region' })
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({
    description: 'Update onboarding status',
    enum: OnboardingStatus,
  })
  @IsOptional()
  @IsEnum(OnboardingStatus)
  status?: OnboardingStatus;

  @ApiPropertyOptional({
    description: 'Reason for rejection if status is REJECTED',
  })
  @IsOptional()
  rejectionReason?: string;

  @ApiPropertyOptional({
    description: 'Update contact person details',
    type: CreateContactDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContactDto)
  contact?: CreateContactDto;

  @ApiPropertyOptional({
    description: 'Update bank accounts (replaces all existing accounts)',
    type: [CreateBankAccountDto],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBankAccountDto)
  bankAccounts?: CreateBankAccountDto[];

  @ApiPropertyOptional({
    description: 'Update settings',
    type: CreateSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSettingsDto)
  settings?: CreateSettingsDto;
}
