import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../user/entities/user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionsService } from '../../permission/permission.service';

/**
 * Global guard that enforces @RequirePermissions(...) on admin routes.
 *
 * Behaviour:
 *  - Respects @Public() (skips).
 *  - NO-OP when a route has no @RequirePermissions metadata. This keeps every
 *    currently-unprotected route — including all /sp/ and /psp/ routes whose
 *    request.user is not an admin User — working unchanged.
 *  - SUPER_ADMIN always passes.
 *  - Otherwise resolves the user's role to its permission set (cached) and requires
 *    ALL listed codes to match (exact code or `<module>:*` wildcard).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const granted = await this.permissionsService.getPermissionsForRole(user.role);
    const allowed = required.every((code) => this.matches(granted, code));
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private matches(granted: Set<string>, code: string): boolean {
    if (granted.has(code)) {
      return true;
    }
    const module = code.split(':')[0];
    return granted.has(`${module}:*`);
  }
}
