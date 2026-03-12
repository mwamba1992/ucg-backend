import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { AirtelConfig } from '../entities/airtel-config.entity';

@Injectable()
export class AirtelJwtGuard implements CanActivate {
  private readonly logger = new Logger(AirtelJwtGuard.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AirtelConfig)
    private readonly airtelConfigRepository: Repository<AirtelConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      this.logger.warn('Missing Authorization header in Airtel request');
      throw new UnauthorizedException('Missing Authorization header');
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      throw new UnauthorizedException('Invalid Authorization header format');
    }

    try {
      const sharedKey = await this.getSharedKey();

      if (!sharedKey) {
        this.logger.error('Airtel shared key not configured');
        throw new UnauthorizedException('Airtel authentication not configured');
      }

      const decoded = jwt.verify(token, sharedKey, {
        algorithms: ['HS512'],
      });

      request['airtelAuth'] = decoded;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`Airtel JWT verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async getSharedKey(): Promise<string | null> {
    // Try from database config first
    const config = await this.airtelConfigRepository.findOne({
      where: { isActive: true },
    });

    if (config?.sharedKey) {
      return config.sharedKey;
    }

    // Fall back to environment variable
    return this.configService.get<string>('AIRTEL_SHARED_KEY') || null;
  }
}
