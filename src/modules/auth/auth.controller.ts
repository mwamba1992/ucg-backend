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
import { SpLoginDto, SpSwitchDto } from './dto/sp-login.dto';
import { SpRequestUser } from './strategies/sp-jwt.strategy';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SpJwtAuthGuard } from './guards/sp-jwt-auth.guard';
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
  async spLogin(@Body() loginDto: SpLoginDto) {
    return await this.authService.spLogin(loginDto);
  }

  /**
   * List the service providers the logged-in SP user can switch between
   */
  @ApiBearerAuth()
  @UseGuards(SpJwtAuthGuard)
  @Get('sp/service-providers')
  @ApiOperation({
    summary: 'List service providers available to the current SP user',
    description: 'Returns every active service provider this login can switch into, including the current one.',
  })
  @ApiResponse({ status: 200, description: 'Service providers retrieved successfully' })
  async spListServiceProviders(@CurrentUser() current: SpRequestUser) {
    return await this.authService.spListServiceProviders(current.userId, current);
  }

  /**
   * Add another service provider from the SP portal
   */
  @ApiBearerAuth()
  @UseGuards(SpJwtAuthGuard)
  @Post('sp/service-providers')
  @ApiOperation({
    summary: 'Add another service provider (SP_ADMIN only)',
    description: `Registers a new service provider owned by the current login. Same body as /auth/sp/register.
It starts PENDING and needs admin approval. Once approved it appears in /auth/sp/service-providers and
can be opened with /auth/sp/switch; no separate login is created for it.

The new service provider's email must be its own business email, not one already used by a user.`,
  })
  @ApiResponse({ status: 201, description: 'Service provider submitted for approval' })
  @ApiResponse({ status: 403, description: 'Caller is not SP_ADMIN in the current service provider' })
  @ApiResponse({ status: 409, description: 'Email already used by a service provider or user' })
  async spRequestServiceProvider(@CurrentUser() current: SpRequestUser, @Body() registerDto: any) {
    return await this.authService.spRequestServiceProvider(current, registerDto);
  }

  /**
   * Status of service providers the current user has requested
   */
  @ApiBearerAuth()
  @UseGuards(SpJwtAuthGuard)
  @Get('sp/service-providers/requests')
  @ApiOperation({
    summary: 'List pending or rejected service providers requested by the current user',
  })
  @ApiResponse({ status: 200, description: 'Requests retrieved successfully' })
  async spListServiceProviderRequests(@CurrentUser() current: SpRequestUser) {
    return await this.authService.spListServiceProviderRequests(current.userId);
  }

  /**
   * Switch the SP session to another service provider
   */
  @ApiBearerAuth()
  @UseGuards(SpJwtAuthGuard)
  @Post('sp/switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Switch to another service provider',
    description: 'Issues new tokens for the given service provider. Response has the same shape as SP login.',
  })
  @ApiResponse({ status: 200, description: 'Switched successfully' })
  @ApiResponse({ status: 401, description: 'No access to that service provider, or session predates multi-SP support' })
  async spSwitch(@CurrentUser() current: SpRequestUser, @Body() dto: SpSwitchDto) {
    return await this.authService.spSwitchServiceProvider(current.userId, dto.serviceProviderId);
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

  /**
   * Service Provider Change Password
   */
  @UseGuards(SpJwtAuthGuard)
  @Post('sp/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password for Service Provider users',
    description: 'Allows service provider users to change their password. This also clears the mustChangePassword flag.',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async spChangePassword(
    @CurrentUser() current: SpRequestUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.spChangePassword(
      { userId: current.userId, email: current.email },
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }
}
