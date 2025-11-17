import { IsEmail, IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'john.doe@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+255712345678', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'NewPassword123!', required: false })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.VIEWER, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE, required: false })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
