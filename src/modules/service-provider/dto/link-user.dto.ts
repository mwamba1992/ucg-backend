import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SP_ROLES } from '../../user/sp-membership.service';

export class LinkUserDto {
  @ApiProperty({ example: 'owner@example.com', description: 'Email of an existing service provider user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ enum: SP_ROLES, description: "Role within this service provider. Omit to use the user's own role." })
  @IsOptional()
  @IsIn(SP_ROLES)
  role?: string;

  @ApiPropertyOptional({ description: 'Open this service provider by default when the user logs in' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
