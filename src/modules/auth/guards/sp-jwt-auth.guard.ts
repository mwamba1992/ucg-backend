import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Service Provider JWT Authentication Guard
 *
 * This guard uses the 'sp-jwt' strategy to validate service provider tokens.
 * Use this guard on all SP portal endpoints that require authentication.
 *
 * Usage:
 * @UseGuards(SpJwtAuthGuard)
 * @Controller('sp/dashboard')
 * export class SpDashboardController { ... }
 */
@Injectable()
export class SpJwtAuthGuard extends AuthGuard('sp-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, serviceProvider: any, info: any) {
    if (err || !serviceProvider) {
      throw err || new Error('Unauthorized');
    }
    return serviceProvider;
  }
}
