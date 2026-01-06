import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { UserResponseDto } from '../user/dto/user-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'User with email already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return await this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return await this.authService.login(loginDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(@CurrentUser() user: User): Promise<void> {
    await this.authService.logout(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully', type: UserResponseDto })
  async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
    const profile = await this.authService.getProfile(user.id);
    return new UserResponseDto(profile);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body('userId') userId: string,
    @Body('refreshToken') refreshToken: string,
  ): Promise<{ accessToken: string }> {
    return await this.authService.refreshToken(userId, refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('verify')
  @ApiOperation({ summary: 'Verify JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Token is invalid' })
  async verifyToken(@CurrentUser() user: User): Promise<{ message: string; user: UserResponseDto }> {
    return {
      message: 'Token is valid',
      user: new UserResponseDto(user),
    };
  }

  /**
   * Service Provider Login
   */
  @Public()
  @Post('sp/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login for Service Providers',
    description: 'Authenticate service provider and return JWT token for SP portal access. Includes user object with role if a User account exists for the SP.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service Provider login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        serviceProvider: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          spCode: 'MWA',
          businessName: 'Mwanga Secondary School',
          businessType: 'SCHOOL',
          email: 'admin@mwanga.school.tz',
          phoneNumber: '+255712345678',
          status: 'APPROVED',
          isActive: true,
        },
        user: {
          id: '660e8400-e29b-41d4-a716-446655440001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'admin@mwanga.school.tz',
          phoneNumber: '+255712345678',
          role: 'SP_ADMIN',
          userType: 'SERVICE_PROVIDER',
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account not approved' })
  async spLogin(@Body() loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    serviceProvider: any;
    user?: any;
  }> {
    return await this.authService.spLogin(loginDto);
  }

  /**
   * Service Provider Registration
   */
  @Public()
  @Post('sp/register')
  @ApiOperation({
    summary: 'Self-registration for Service Providers',
    description: `Register a new service provider. The account will be in PENDING status and requires admin approval before login.

Required fields:
- businessName, businessType, email, phoneNumber
- contact.fullName (not firstName/lastName - use full name)
- contact.phoneNumber, contact.email
- At least one bank account with: bankName, accountNumber, accountName`,
  })
  @ApiResponse({
    status: 201,
    description: 'Service Provider registration successful. Account pending approval.',
    schema: {
      example: {
        success: true,
        message: 'Registration successful. Your account is pending approval.',
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          spCode: 'MWA',
          businessName: 'Mwanga Secondary School',
          businessType: 'SCHOOL',
          email: 'admin@mwanga.school.tz',
          phoneNumber: '+255712345678',
          status: 'PENDING',
          isActive: false,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Service provider with this email already exists' })
  async spRegister(@Body() registerDto: any): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    return await this.authService.spRegister(registerDto);
  }
}
