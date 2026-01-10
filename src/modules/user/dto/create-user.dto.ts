import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus, UserType } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+255712345678', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    enum: UserType,
    example: UserType.ADMIN,
    description: 'User type: ADMIN for admin portal users, SERVICE_PROVIDER for SP portal users'
  })
  @IsEnum(UserType)
  @IsNotEmpty()
  userType: UserType;

  @ApiProperty({ enum: UserRole, example: UserRole.ANALYST })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE, required: false })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
