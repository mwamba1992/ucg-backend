import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class ModifyRolePermissionsDto {
  @ApiProperty({
    description: 'Permission codes to add to / remove from the role',
    example: ['service-providers:approve'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
