import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceProvider, OnboardingStatus } from '../../service-provider/entities/service-provider.entity';

export interface SpJwtPayload {
  sub: string; // Service Provider ID
  email: string;
  spCode: string;
  type: 'SERVICE_PROVIDER'; // To differentiate from admin user tokens
}

/**
 * Service Provider JWT Strategy
 *
 * This strategy validates JWT tokens for service provider authentication.
 * Used for SP portal endpoints under /api/v1/sp/*
 */
@Injectable()
export class SpJwtStrategy extends PassportStrategy(Strategy, 'sp-jwt') {
  constructor(
    private configService: ConfigService,
    @InjectRepository(ServiceProvider)
    private serviceProviderRepository: Repository<ServiceProvider>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key-change-this'),
    });
  }

  async validate(payload: SpJwtPayload): Promise<ServiceProvider & { serviceProviderId: string }> {
    // Ensure this is a service provider token
    if (payload.type !== 'SERVICE_PROVIDER') {
      throw new UnauthorizedException('Invalid token type. Service Provider token required.');
    }

    const { sub: serviceProviderId } = payload;

    const serviceProvider = await this.serviceProviderRepository.findOne({
      where: { id: serviceProviderId },
      relations: ['contact', 'bankAccounts', 'settings'],
    });

    if (!serviceProvider) {
      throw new UnauthorizedException('Service Provider not found');
    }

    // Check if service provider is active
    if (!serviceProvider.isActive) {
      throw new UnauthorizedException('Service Provider account is not active');
    }

    // Check if service provider is approved
    if (serviceProvider.status !== OnboardingStatus.APPROVED && serviceProvider.status !== OnboardingStatus.ACTIVE) {
      throw new UnauthorizedException(`Service Provider account is not approved. Current status: ${serviceProvider.status}`);
    }

    // Check if service provider is not deleted
    if (serviceProvider.deletedAt) {
      throw new UnauthorizedException('Service Provider account has been deleted');
    }

    // Add serviceProviderId to the returned object for easy access in controllers
    return {
      ...serviceProvider,
      serviceProviderId: serviceProvider.id,
    };
  }
}
