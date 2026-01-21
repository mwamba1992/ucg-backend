import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus, UserType } from '../../user/entities/user.entity';

/**
 * PSP API Key Strategy
 *
 * This strategy validates API keys for Payment Service Provider (PSP) users.
 * PSP users are API-only and cannot login to web portals.
 * They authenticate using Bearer tokens that are their API keys.
 */
@Injectable()
export class PspApiStrategy extends PassportStrategy(Strategy, 'psp-api') {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();
  }

  async validate(apiKey: string): Promise<User> {
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Find user by API key
    const user = await this.userRepository.findOne({
      where: { apiKey },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Verify user is PSP type
    if (user.userType !== UserType.PSP) {
      throw new UnauthorizedException('Invalid API key type');
    }

    // Check if user account is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('PSP account is not active');
    }

    // Check if user is not deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('PSP account has been deleted');
    }

    // Update last login time for audit trail
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    return user;
  }
}
