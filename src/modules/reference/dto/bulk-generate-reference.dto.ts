import { IsArray, IsBoolean, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateReferenceDto } from './create-reference.dto';

export class BulkGenerateReferenceDto {
  @ApiProperty({
    description: 'Array of reference requests',
    type: [CreateReferenceDto],
    maxItems: 1000,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReferenceDto)
  references: CreateReferenceDto[];

  @ApiProperty({
    description: 'Default expiry days for all references (can be overridden per reference)',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  defaultExpiryDays?: number;

  @ApiProperty({
    description: 'Send SMS/Email notifications to customers',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyCustomers?: boolean;
}
