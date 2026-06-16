import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  @ApiProperty({
    description: 'Full list of permission codes the role should have (replaces existing)',
    example: ['service-providers:read', 'service-providers:approve'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
