import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SettlementFrequency } from '../entities/service-provider-settings.entity';

export class CreateSettingsDto {
  @ApiPropertyOptional({
    description: 'Commission rate percentage',
    example: 2.5,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({
    description: 'Settlement frequency',
    enum: SettlementFrequency,
    default: SettlementFrequency.DAILY,
  })
  @IsOptional()
  @IsEnum(SettlementFrequency)
  settlementFrequency?: SettlementFrequency;

  @ApiPropertyOptional({
    description: 'Enable automatic settlement',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoSettlement?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum settlement amount',
    example: 10000,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumSettlementAmount?: number;

  @ApiPropertyOptional({
    description: 'Webhook URL for notifications',
    example: 'https://mwangaschool.co.tz/api/webhook',
  })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({
    description: 'Enable webhook notifications',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  webhookEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable email notifications',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable SMS notifications',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Daily transaction limit amount',
    example: 1000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyTransactionLimit?: number;

  @ApiPropertyOptional({
    description: 'Daily transaction count limit',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyTransactionCount?: number;

  @ApiPropertyOptional({
    description: 'API rate limit (requests per minute)',
    example: 100,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  apiRateLimit?: number;
}
