import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartWorkflowDto {
  @ApiProperty({
    description: 'Entity type (e.g., SERVICE_PROVIDER, TRANSACTION)',
    example: 'SERVICE_PROVIDER',
  })
  @IsNotEmpty()
  @IsString()
  entityType: string;

  @ApiProperty({
    description: 'Entity ID (e.g., Service Provider ID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  entityId: string;

  @ApiProperty({
    description: 'Workflow name',
    example: 'Service Provider Onboarding',
  })
  @IsNotEmpty()
  @IsString()
  workflowName: string;

  @ApiProperty({
    description: 'Additional metadata for the workflow',
    example: { priority: 'HIGH', source: 'ADMIN_PORTAL' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
