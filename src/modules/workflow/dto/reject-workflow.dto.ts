import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectWorkflowDto {
  @ApiProperty({
    description: 'Reason for rejecting the workflow',
    example: 'Incomplete documentation provided',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
