import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteTaskDto {
  @ApiProperty({
    description: 'Task result data',
    example: { approved: true, score: 85 },
  })
  @IsNotEmpty()
  @IsObject()
  result: Record<string, any>;

  @ApiProperty({
    description: 'Optional comments about the task completion',
    example: 'All documents verified successfully',
    required: false,
  })
  @IsOptional()
  @IsString()
  comments?: string;
}
