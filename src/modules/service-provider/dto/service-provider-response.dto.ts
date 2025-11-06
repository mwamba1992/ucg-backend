import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceProviderType,
  OnboardingStatus,
} from '../entities/service-provider.entity';

export class ServiceProviderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  spCode: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty({ enum: ServiceProviderType })
  businessType: ServiceProviderType;

  @ApiPropertyOptional()
  registrationNumber?: string;

  @ApiPropertyOptional()
  tinNumber?: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  physicalAddress?: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional()
  district?: string;

  @ApiProperty()
  contactPersonName: string;

  @ApiProperty()
  contactPersonPhone: string;

  @ApiProperty()
  contactPersonEmail: string;

  @ApiPropertyOptional()
  contactPersonIdNumber?: string;

  @ApiPropertyOptional()
  bankName?: string;

  @ApiPropertyOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional()
  bankAccountName?: string;

  @ApiProperty({ enum: OnboardingStatus })
  status: OnboardingStatus;

  @ApiProperty()
  nidaVerified: boolean;

  @ApiProperty()
  brelaVerified: boolean;

  @ApiProperty()
  traVerified: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  apiKey?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
