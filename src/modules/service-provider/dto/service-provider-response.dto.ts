import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceProviderType,
  OnboardingStatus,
} from '../entities/service-provider.entity';
import { ServiceProviderContact } from '../entities/service-provider-contact.entity';
import { ServiceProviderBankAccount } from '../entities/service-provider-bank-account.entity';
import { ServiceProviderSettings } from '../entities/service-provider-settings.entity';

export class ContactResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  idNumber?: string;

  @ApiPropertyOptional()
  position?: string;
}

export class BankAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bankName: string;

  @ApiProperty()
  accountNumber: string;

  @ApiProperty()
  accountName: string;

  @ApiPropertyOptional()
  swiftCode?: string;

  @ApiPropertyOptional()
  branchName?: string;

  @ApiProperty()
  accountType: string;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  isActive: boolean;
}

export class SettingsResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  commissionRate: number;

  @ApiProperty()
  settlementFrequency: string;

  @ApiProperty()
  autoSettlement: boolean;

  @ApiProperty()
  minimumSettlementAmount: number;

  @ApiPropertyOptional()
  webhookUrl?: string;

  @ApiProperty()
  webhookEnabled: boolean;

  @ApiProperty()
  emailNotifications: boolean;

  @ApiProperty()
  smsNotifications: boolean;

  @ApiPropertyOptional()
  dailyTransactionLimit?: number;

  @ApiProperty()
  apiRateLimit: number;

  @ApiProperty()
  apiEnabled: boolean;
}

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

  // External reference-query integration (Flow A). outboundApiKey is a secret
  // and is never returned; hasOutboundApiKey indicates whether one is set.
  @ApiPropertyOptional({ description: "Leading characters of the SP's own references" })
  spReferencePrefix?: string;

  @ApiPropertyOptional({ description: 'SP base URL we call to query references' })
  referenceQueryUrl?: string;

  @ApiPropertyOptional({ description: 'Whether an outbound API key is configured for this SP' })
  hasOutboundApiKey?: boolean;

  @ApiProperty({ type: ContactResponseDto })
  contact: ContactResponseDto;

  @ApiProperty({ type: [BankAccountResponseDto] })
  bankAccounts: BankAccountResponseDto[];

  @ApiProperty({ type: SettingsResponseDto })
  settings: SettingsResponseDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
