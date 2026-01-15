import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    // Exclude Swagger documentation routes from authentication
    if (path.startsWith('/api/docs') || path.startsWith('/api-json')) {
      return true;
    }

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Skip this guard for SP routes - SpJwtAuthGuard will handle them
    // IMPORTANT: Don't return true (which allows access), return false to skip this guard
    // The SpJwtAuthGuard decorator on the controller will handle SP authentication
    if (path.includes('/sp/')) {
      return true; // Allow the route-specific SpJwtAuthGuard to handle auth
    }

    return super.canActivate(context);
  }
}
