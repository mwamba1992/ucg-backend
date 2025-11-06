import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ServiceProviderType,
  OnboardingStatus,
} from '../entities/service-provider.entity';

export class QueryServiceProviderDto {
  @ApiPropertyOptional({
    description: 'Filter by business type',
    enum: ServiceProviderType,
  })
  @IsOptional()
  @IsEnum(ServiceProviderType)
  businessType?: ServiceProviderType;

  @ApiPropertyOptional({
    description: 'Filter by onboarding status',
    enum: OnboardingStatus,
  })
  @IsOptional()
  @IsEnum(OnboardingStatus)
  status?: OnboardingStatus;

  @ApiPropertyOptional({
    description: 'Search by business name, email, or SP code',
    example: 'school',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by region',
    example: 'Dar es Salaam',
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;
}
