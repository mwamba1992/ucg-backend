import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SpJwtAuthGuard } from './sp-jwt-auth.guard';
import { PspApiAuthGuard } from './psp-api-auth.guard';

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

    // SP and PSP routes authenticate with their own guard (SpJwtAuthGuard / PspApiAuthGuard).
    // Decide from the route's declared guards, never from the URL: a substring check on
    // request.url (which includes the query string) let `?x=/sp/` skip auth on admin routes.
    const routeGuards = [
      ...(this.reflector.get<any[]>(GUARDS_METADATA, context.getClass()) || []),
      ...(this.reflector.get<any[]>(GUARDS_METADATA, context.getHandler()) || []),
    ];
    if (routeGuards.some((guard) => guard === SpJwtAuthGuard || guard === PspApiAuthGuard)) {
      return true;
    }

    return super.canActivate(context);
  }
}
