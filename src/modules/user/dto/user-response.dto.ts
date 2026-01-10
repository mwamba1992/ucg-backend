import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus, UserType } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  phoneNumber: string;

  @ApiProperty({ enum: UserType })
  @Expose()
  userType: UserType;

  @ApiProperty({ enum: UserRole })
  @Expose()
  role: UserRole;

  @ApiProperty({ enum: UserStatus })
  @Expose()
  status: UserStatus;

  @ApiProperty()
  @Expose()
  isEmailVerified: boolean;

  @ApiProperty()
  @Expose()
  lastLoginAt: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;

  @Exclude()
  password: string;

  @Exclude()
  refreshToken: string;

  @Exclude()
  resetPasswordToken: string;

  @Exclude()
  resetPasswordExpires: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
