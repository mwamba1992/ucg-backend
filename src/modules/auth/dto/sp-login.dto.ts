import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoginDto } from './login.dto';

export class SpLoginDto extends LoginDto {
  @ApiPropertyOptional({
    description: 'Service provider to open. Omit to open the default one.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  serviceProviderId?: string;
}

export class SpSwitchDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  serviceProviderId: string;
}
