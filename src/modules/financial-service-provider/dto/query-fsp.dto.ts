import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FspType, FspStatus } from '../entities/financial-service-provider.entity';

export class QueryFspDto {
  @ApiPropertyOptional({
    description: 'Filter by FSP type',
    enum: FspType,
  })
  @IsEnum(FspType)
  @IsOptional()
  type?: FspType;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: FspStatus,
  })
  @IsEnum(FspStatus)
  @IsOptional()
  status?: FspStatus;

  @ApiPropertyOptional({
    description: 'Search by name, short name, or FSP code',
    example: 'Vodacom',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
