import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReferenceStatus } from '../entities/payment-reference.entity';

export class QueryReferenceDto {
  @ApiPropertyOptional({
    description: 'Filter by service provider ID',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsUUID()
  serviceProviderId?: string;

  @ApiPropertyOptional({
    description: 'Filter by reference status',
    enum: ReferenceStatus,
  })
  @IsOptional()
  @IsEnum(ReferenceStatus)
  status?: ReferenceStatus;

  @ApiPropertyOptional({
    description: 'Search by customer name, phone, or reference number',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer phone',
    example: '+255712345678',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Include expired references',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  includeExpired?: boolean;

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
