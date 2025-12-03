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
    // TEMPORARY: Allow all routes without authentication
    // TODO: Remove this and enable proper authentication before production
    return true;

    /*
    // Uncomment below to re-enable authentication
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

    return super.canActivate(context);
    */
  }
}
