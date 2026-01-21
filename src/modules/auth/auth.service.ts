import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { User, UserStatus, UserRole, UserType } from '../user/entities/user.entity';
import { ServiceProvider, OnboardingStatus, ServiceProviderType } from '../service-provider/entities/service-provider.entity';
import { ServiceProviderContact } from '../service-provider/entities/service-provider-contact.entity';
import { ServiceProviderBankAccount } from '../service-provider/entities/service-provider-bank-account.entity';
import { ServiceProviderSettings, SettlementFrequency } from '../service-provider/entities/service-provider-settings.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { SpJwtPayload } from './strategies/sp-jwt.strategy';
import { NotificationService } from '../notification/notification.service';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly cbsApiUrl: string;
    private readonly clientId: string;
    private readonly clientSecret: string;
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly notificationService: NotificationService,
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,
    @InjectRepository(ServiceProviderContact)
    private readonly contactRepository: Repository<ServiceProviderContact>,
    @InjectRepository(ServiceProviderBankAccount)
    private readonly bankAccountRepository: Repository<ServiceProviderBankAccount>,
    @InjectRepository(ServiceProviderSettings)
    private readonly settingsRepository: Repository<ServiceProviderSettings>,
  ) {
    this.cbsApiUrl = this.configService.get<string>('CBS_API_URL');
    this.clientId = this.configService.get<string>('CBS_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('CBS_CLIENT_SECRET');
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('User account has been deleted');
    }

    return user;
  }

  /**
   * Login user (Admin Portal Only)
   * Service Provider users must use /auth/sp/login endpoint
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // SECURITY: Prevent Service Provider users from logging into admin portal
    if (user.userType === UserType.SERVICE_PROVIDER) {
      throw new UnauthorizedException('Service Provider users must use the Service Provider portal to login');
    }

    // Only allow ADMIN type users
    if (user.userType !== UserType.ADMIN) {
      throw new UnauthorizedException('Access denied. This endpoint is for admin users only.');
    }

    // Get full user details including mustChangePassword flag
    const fullUser = await this.userService.findOne(user.id);

    // Update last login time
    await this.userService.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        role: user.role,
        status: user.status,
        mustChangePassword: fullUser.mustChangePassword,
      } as any,
    };
  }

  /**
   * Register new user (Admin Portal Only)
   * Service Provider registration should use /auth/sp/register
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.userService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // SECURITY: Prevent Service Provider registration through admin endpoint
    if (registerDto.userType === UserType.SERVICE_PROVIDER) {
      throw new BadRequestException('Service Provider registration must use the /auth/sp/register endpoint');
    }

    // Create new user
    const user = await this.userService.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      phoneNumber: registerDto.phoneNumber,
      password: registerDto.password,
      userType: registerDto.userType || UserType.ADMIN,
      role: registerDto.role || UserRole.VIEWER,
      status: UserStatus.PENDING, // Default to PENDING for approval
    });

    // Ensure only ADMIN users are created
    if (user.userType !== UserType.ADMIN) {
      throw new BadRequestException('Only ADMIN users can register through this endpoint');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        role: user.role,
        status: user.status,
      },
    };
  }

  /**
   * Refresh access token (Admin Portal)
   */
  async refreshToken(userId: string, refreshToken: string): Promise<{ accessToken: string }> {
    const user = await this.userService.findOne(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // SECURITY: Only allow ADMIN users to refresh admin tokens
    if (user.userType !== UserType.ADMIN) {
      throw new UnauthorizedException('Access denied. Admin users only.');
    }

    // Verify refresh token
    const isTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new access token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      role: user.role,
      type: 'ADMIN', // Mark token as admin type
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    await this.userService.updateRefreshToken(userId, null);
  }

  /**
   * Generate access and refresh tokens for admin users
   */
  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      role: user.role,
      type: 'ADMIN', // Mark token as admin type
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key-change-this',
        expiresIn: '60m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret-change-this',
        expiresIn: '30d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<User> {
    return await this.userService.findOne(userId);
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.userService.changePassword(userId, currentPassword, newPassword);

    // Reset mustChangePassword flag after successful password change
    await this.userService.update(userId, {
      mustChangePassword: false,
    } as any);
  }

  /**
   * Login client to get access token
   */
  public async loginClient(): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<any>(
          `${this.cbsApiUrl}/auth/login/client`,
          {
            clientId: this.clientId,
            clientSecret: this.clientSecret,
          },
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const token = response.data?.data?.accessToken;
      if (!token) {
        throw new Error('Failed to retrieve access token');
      }

      return token;
    } catch (error: any) {
      this.logger.error('Client login failed', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Service Provider Login
   * Login with email and password for service provider portal access
   * SECURITY: Requires User account with password validation
   * Supports both main SP accounts and SP staff users
   */
  async spLogin(loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    serviceProvider: any;
    user?: any;
  }> {
    // STEP 1: Find user by email first
    const userRecord = await this.userService.findByEmail(loginDto.email);

    if (!userRecord) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (userRecord.userType !== UserType.SERVICE_PROVIDER) {
      throw new UnauthorizedException('Invalid credentials - not a service provider user');
    }

    // STEP 2: Validate password
    const isPasswordValid = await userRecord.validatePassword(loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // STEP 3: Verify user account is active
    if (userRecord.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    if (userRecord.deletedAt) {
      throw new UnauthorizedException('User account has been deleted');
    }

    // STEP 4: Find associated service provider
    // First try by email (main SP account), then by createdBy (staff user)
    let serviceProvider = await this.serviceProviderRepository.findOne({
      where: { email: loginDto.email },
      relations: ['contact', 'bankAccounts', 'settings'],
    });

    // If not found by email, this is a staff user - find SP by createdBy
    if (!serviceProvider && userRecord.createdBy) {
      serviceProvider = await this.serviceProviderRepository.findOne({
        where: { id: userRecord.createdBy },
        relations: ['contact', 'bankAccounts', 'settings'],
      });
    }

    if (!serviceProvider) {
      throw new UnauthorizedException('No associated service provider found');
    }

    // STEP 5: Verify service provider is active and approved
    if (!serviceProvider.isActive) {
      throw new UnauthorizedException('Service Provider account is not active');
    }

    if (serviceProvider.status !== OnboardingStatus.APPROVED && serviceProvider.status !== OnboardingStatus.ACTIVE) {
      throw new UnauthorizedException(`Account not approved. Current status: ${serviceProvider.status}`);
    }

    if (serviceProvider.deletedAt) {
      throw new UnauthorizedException('Service Provider account has been deleted');
    }

    // Get full user details including mustChangePassword flag
    const fullUser = await this.userService.findOne(userRecord.id);

    // Update last login time
    await this.userService.updateLastLogin(userRecord.id);

    const user = {
      id: userRecord.id,
      firstName: userRecord.firstName,
      lastName: userRecord.lastName,
      email: userRecord.email,
      phoneNumber: userRecord.phoneNumber,
      role: userRecord.role,
      userType: userRecord.userType,
      status: userRecord.status,
      mustChangePassword: fullUser.mustChangePassword,
    };

    // Generate SP tokens
    const tokens = await this.generateSpTokens(serviceProvider);

    return {
      ...tokens,
      serviceProvider: {
        id: serviceProvider.id,
        spCode: serviceProvider.spCode,
        businessName: serviceProvider.businessName,
        businessType: serviceProvider.businessType,
        email: serviceProvider.email,
        phoneNumber: serviceProvider.phoneNumber,
        status: serviceProvider.status,
        isActive: serviceProvider.isActive,
      },
      user,
    };
  }

  /**
   * Generate SP access and refresh tokens
   */
  private async generateSpTokens(serviceProvider: ServiceProvider): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: SpJwtPayload = {
      sub: serviceProvider.id,
      email: serviceProvider.email,
      spCode: serviceProvider.spCode,
      type: 'SERVICE_PROVIDER',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key-change-this',
        expiresIn: '60m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret-change-this',
        expiresIn: '30d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Service Provider Self-Registration
   * Allows service providers to register themselves for approval
   */
  async spRegister(registerDto: any): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    // Log the incoming registration payload for troubleshooting
    this.logger.log('SP Registration Request Received');
    this.logger.log(`Payload: ${JSON.stringify(registerDto, null, 2)}`);

    // Check if service provider with email already exists
    const existingSp = await this.serviceProviderRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingSp) {
      this.logger.warn(`Registration failed: Email already exists - ${registerDto.email}`);
      throw new ConflictException('Service provider with this email already exists');
    }

    // Generate SP code from business name (first 3 letters)
    const spCode = this.generateSpCode(registerDto.businessName);
    this.logger.log(`Generated SP Code: ${spCode}`);

    try {
      // Create service provider entity
      this.logger.log('Creating Service Provider entity...');
      const serviceProvider = this.serviceProviderRepository.create({
        businessName: registerDto.businessName,
        businessType: registerDto.businessType,
        otherBusinessType: registerDto.otherBusinessType,
        registrationNumber: registerDto.registrationNumber,
        tinNumber: registerDto.tinNumber,
        phoneNumber: registerDto.phoneNumber,
        email: registerDto.email,
        physicalAddress: registerDto.physicalAddress,
        region: registerDto.region,
        district: registerDto.district,
        spCode,
        status: OnboardingStatus.PENDING,
        isActive: false,
      });

      await this.serviceProviderRepository.save(serviceProvider);
      this.logger.log(`Service Provider created with ID: ${serviceProvider.id}`);

      // Create contact
      if (registerDto.contact) {
        this.logger.log('Creating Contact...');
        this.logger.log(`Contact data: ${JSON.stringify(registerDto.contact, null, 2)}`);

        const contact = this.contactRepository.create({
          ...registerDto.contact,
          serviceProvider,
        });

        this.logger.log(`Contact entity prepared for: ${registerDto.contact.fullName}`);

        await this.contactRepository.save(contact);
        this.logger.log('Contact created successfully');
      }

      // Create bank accounts
      if (registerDto.bankAccounts && registerDto.bankAccounts.length > 0) {
        this.logger.log(`Creating ${registerDto.bankAccounts.length} bank account(s)...`);
        const bankAccounts = registerDto.bankAccounts.map((account: any, index: number) =>
          this.bankAccountRepository.create({
            ...account,
            serviceProvider,
            isPrimary: index === 0, // First account is primary
          })
        );
        await this.bankAccountRepository.save(bankAccounts);
        this.logger.log('Bank accounts created successfully');
      }

      // Create settings
      if (registerDto.settings) {
        this.logger.log('Creating custom settings...');
        const settings = this.settingsRepository.create({
          ...registerDto.settings,
          serviceProvider,
        });
        await this.settingsRepository.save(settings);
        this.logger.log('Settings created successfully');
      } else {
        this.logger.log('Creating default settings...');
        const defaultSettings = this.settingsRepository.create({
          serviceProvider,
          commissionRate: 2.5,
          settlementFrequency: SettlementFrequency.DAILY,
          autoSettlement: false,
        });
        await this.settingsRepository.save(defaultSettings);
        this.logger.log('Default settings created successfully');
      }

      this.logger.log(`SP Registration completed successfully for: ${serviceProvider.email}`);

      return {
        success: true,
        message: 'Registration successful. Your account is pending approval. You will be notified once approved.',
        data: {
          id: serviceProvider.id,
          spCode: serviceProvider.spCode,
          businessName: serviceProvider.businessName,
          businessType: serviceProvider.businessType,
          email: serviceProvider.email,
          phoneNumber: serviceProvider.phoneNumber,
          status: serviceProvider.status,
          isActive: serviceProvider.isActive,
        },
      };
    } catch (error) {
      this.logger.error('SP Registration failed with error:', error);
      this.logger.error(`Error details: ${error.message}`);
      if (error.detail) {
        this.logger.error(`Database error detail: ${error.detail}`);
      }
      throw error;
    }
  }

  /**
   * Generate SP code from business name
   */
  private generateSpCode(businessName: string): string {
    return businessName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 3);
  }

  /**
   * Change password for Service Provider user
   */
  async spChangePassword(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Find the user by email (SP users have a User record created during approval)
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User account not found');
    }

    // Verify current password
    const isPasswordValid = await user.validatePassword(currentPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Change the password
    await this.userService.changePassword(user.id, currentPassword, newPassword);

    // Reset mustChangePassword flag
    await this.userService.update(user.id, {
      mustChangePassword: false,
    } as any);

    this.logger.log(`Password changed successfully for SP user: ${email}`);
  }

  /**
   * Create PSP (Payment Service Provider) User
   * Creates API-only user with generated API key
   * PSP users cannot login to any portal, only use API
   */
  async createPspUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    organizationName?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      id: string;
      email: string;
      apiKey: string;
      userType: string;
      status: string;
    };
  }> {
    // Check if user with email already exists
    const existingUser = await this.userService.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate secure API key (64 characters: ucg_psp_ + 56 random chars)
    const apiKey = this.generateApiKey();

    // Create PSP user (no password needed - API key only)
    const user = await this.userService.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      userType: UserType.PSP,
      role: UserRole.PSP_API,
      status: UserStatus.ACTIVE, // PSP users are active immediately
      password: Math.random().toString(36).substring(2, 15), // Random dummy password (won't be used)
    } as any);

    // Update user with API key
    await this.userService.update(user.id, { apiKey } as any);

    this.logger.log(`PSP user created: ${user.email} (ID: ${user.id})`);

    // Send API key via SMS (non-blocking)
    try {
      const organizationName = data.organizationName || `${data.firstName} ${data.lastName}`;
      const smsMessage = `Dear ${organizationName},\n\nYour PSP API account has been created successfully.\n\nAPI Key: ${apiKey}\n\nPlease keep this API key secure. Use it in your API requests as:\nAuthorization: Bearer ${apiKey}\n\nFor API documentation, contact UCG support.\n\nBest regards,\nUCG Team`;

      await this.notificationService.sendSMS(
        data.phoneNumber,
        smsMessage,
        'PSP API Key - UCG',
      );

      this.logger.log(`API key sent via SMS to ${data.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send API key via SMS: ${error.message}`);
      // Don't fail user creation for SMS error
    }

    return {
      success: true,
      message: 'PSP user created successfully. API key has been sent via SMS.',
      data: {
        id: user.id,
        email: user.email,
        apiKey, // Return API key only once during creation
        userType: user.userType,
        status: user.status,
      },
    };
  }

  /**
   * Regenerate API key for PSP user
   * Useful when API key is compromised or needs rotation
   */
  async regeneratePspApiKey(userId: string): Promise<{
    success: boolean;
    message: string;
    data: {
      apiKey: string;
    };
  }> {
    const user = await this.userService.findOne(userId);

    if (user.userType !== UserType.PSP) {
      throw new BadRequestException('Only PSP users can have API keys regenerated');
    }

    // Generate new API key
    const apiKey = this.generateApiKey();

    // Update user with new API key
    await this.userService.update(user.id, { apiKey } as any);

    this.logger.log(`API key regenerated for PSP user: ${user.email} (ID: ${user.id})`);

    // Send new API key via SMS (non-blocking)
    try {
      const userName = `${user.firstName} ${user.lastName}`;
      const smsMessage = `Dear ${userName},\n\nYour PSP API key has been regenerated.\n\nNew API Key: ${apiKey}\n\nPlease update your systems with this new API key. The old API key is no longer valid.\n\nUse it as:\nAuthorization: Bearer ${apiKey}\n\nBest regards,\nUCG Team`;

      await this.notificationService.sendSMS(
        user.phoneNumber,
        smsMessage,
        'PSP API Key Regenerated - UCG',
      );

      this.logger.log(`New API key sent via SMS to ${user.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send new API key via SMS: ${error.message}`);
      // Don't fail regeneration for SMS error
    }

    return {
      success: true,
      message: 'API key regenerated successfully. New API key has been sent via SMS.',
      data: {
        apiKey,
      },
    };
  }

  /**
   * Deactivate PSP user (soft delete / disable API access)
   */
  async deactivatePspUser(userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const user = await this.userService.findOne(userId);

    if (user.userType !== UserType.PSP) {
      throw new BadRequestException('Only PSP users can be deactivated this way');
    }

    // Deactivate user
    await this.userService.updateStatus(userId, UserStatus.INACTIVE);

    this.logger.log(`PSP user deactivated: ${user.email} (ID: ${user.id})`);

    return {
      success: true,
      message: 'PSP user deactivated successfully',
    };
  }

  /**
   * Generate secure API key
   * Format: ucg_psp_{56_random_characters}
   */
  private generateApiKey(): string {
    const crypto = require('crypto');
    const randomPart = crypto.randomBytes(32).toString('hex'); // 64 hex chars
    return `ucg_psp_${randomPart}`;
  }

}
