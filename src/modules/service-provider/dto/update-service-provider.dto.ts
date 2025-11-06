import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateServiceProviderDto } from './create-service-provider.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { OnboardingStatus } from '../entities/service-provider.entity';

export class UpdateServiceProviderDto extends PartialType(
  CreateServiceProviderDto,
) {
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
}
