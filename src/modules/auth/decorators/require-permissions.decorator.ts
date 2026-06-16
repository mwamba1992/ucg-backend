import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require the current user's role to hold ALL of the given permission codes.
 * Enforced by PermissionsGuard. Codes follow the `module:action` convention and are
 * satisfied by an exact match or a module wildcard (e.g. `service-providers:*`).
 */
export const RequirePermissions = (...codes: string[]) =>
  SetMetadata(PERMISSIONS_KEY, codes);
