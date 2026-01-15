import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus, UserType } from '../../user/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  userType: string;
  role: string;
  type?: 'ADMIN'; // To differentiate from service provider tokens
}

/**
 * Admin Portal JWT Strategy
 *
 * This strategy validates JWT tokens for admin users only.
 * Service Provider users must use the SP JWT strategy.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key-change-this'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const { sub: userId } = payload;

    // SECURITY: Check token type - only ADMIN tokens allowed in admin portal
    if (payload.type && payload.type !== 'ADMIN') {
      throw new UnauthorizedException('Invalid token type. Admin token required.');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('User account has been deleted');
    }

    // SECURITY: Prevent Service Provider users from accessing admin portal
    // This is a defense-in-depth measure - login endpoint also checks this
    if (user.userType === UserType.SERVICE_PROVIDER) {
      throw new UnauthorizedException('Service Provider users cannot access admin portal. Please use the Service Provider portal.');
    }

    // Only allow ADMIN type users in admin portal
    if (user.userType !== UserType.ADMIN) {
      throw new UnauthorizedException('Access denied. Admin access only.');
    }

    return user;
  }
}
