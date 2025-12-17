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
import { User, UserStatus, UserRole } from '../user/entities/user.entity';
import { ServiceProvider, OnboardingStatus } from '../service-provider/entities/service-provider.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { SpJwtPayload } from './strategies/sp-jwt.strategy';
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
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,
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
   * Login user
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
        role: user.role,
        status: user.status,
      },
    };
  }

  /**
   * Register new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.userService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create new user
    const user = await this.userService.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      phoneNumber: registerDto.phoneNumber,
      password: registerDto.password,
      role: registerDto.role || UserRole.VIEWER,
      status: UserStatus.PENDING, // Default to PENDING for approval
    });

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
        role: user.role,
        status: user.status,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string, refreshToken: string): Promise<{ accessToken: string }> {
    const user = await this.userService.findOne(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
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
      role: user.role,
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
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET', 'your-secret-key-change-this'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'your-refresh-secret-change-this'),
        expiresIn: '7d',
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
   */
  async spLogin(loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    serviceProvider: any;
  }> {
    // Find service provider by email
    const serviceProvider = await this.serviceProviderRepository.findOne({
      where: { email: loginDto.email },
      relations: ['contact', 'bankAccounts', 'settings'],
    });

    if (!serviceProvider) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // NOTE: Service providers use the contact person's phone or a set password
    // For now, we'll use email as password (TEMPORARY - should implement proper password management)
    // TODO: Add password field to ServiceProvider entity or use contact email
    // For demo purposes, accepting if the SP exists and is active

    // Verify service provider is active and approved
    if (!serviceProvider.isActive) {
      throw new UnauthorizedException('Service Provider account is not active');
    }

    if (serviceProvider.status !== OnboardingStatus.APPROVED && serviceProvider.status !== OnboardingStatus.ACTIVE) {
      throw new UnauthorizedException(`Account not approved. Current status: ${serviceProvider.status}`);
    }

    if (serviceProvider.deletedAt) {
      throw new UnauthorizedException('Service Provider account has been deleted');
    }

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
        secret: this.configService.get<string>('JWT_SECRET', 'your-secret-key-change-this'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'your-refresh-secret-change-this'),
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

}
