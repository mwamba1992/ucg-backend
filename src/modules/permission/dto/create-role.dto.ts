import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name; normalized to UPPER_SNAKE_CASE (e.g. "Branch Manager" -> BRANCH_MANAGER)',
    example: 'Branch Manager',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Human-friendly label', example: 'Branch Manager' })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({ description: 'Description of the role' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
