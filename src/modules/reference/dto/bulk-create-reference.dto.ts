import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateReferenceDto } from './create-reference.dto';

export class BulkCreateReferenceDto {
  @ApiProperty({
    description: 'Array of references to create',
    type: [CreateReferenceDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one reference is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateReferenceDto)
  references: CreateReferenceDto[];
}

export class BulkCreateResponseDto {
  @ApiProperty()
  totalRequested: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failureCount: number;

  @ApiProperty()
  createdReferences: ReferenceResponseDto[];

  @ApiProperty()
  errors: Array<{ index: number; error: string }>;
}

class ReferenceResponseDto {
  id: string;
  referenceNumber: string;
  customerName: string;
  amount: number;
}
