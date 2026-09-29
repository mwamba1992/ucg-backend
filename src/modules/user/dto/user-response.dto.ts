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

  @ApiProperty({ example: UserRole.ANALYST, description: 'Role name (built-in or custom)' })
  @Expose()
  role: string;

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
    // No ClassSerializerInterceptor is registered, so @Exclude() has no effect;
    // strip credentials explicitly. PSP API keys are only returned on create/regenerate.
    const self = this as any;
    delete self.password;
    delete self.refreshToken;
    delete self.resetPasswordToken;
    delete self.resetPasswordExpires;
    delete self.apiKey;
  }
}
