import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * PSP API Authentication Guard
 *
 * This guard protects endpoints that should only be accessible to PSP users
 * with valid API keys. PSP users authenticate via Bearer token (API key).
 *
 * Usage:
 * @UseGuards(PspApiAuthGuard)
 */
@Injectable()
export class PspApiAuthGuard extends AuthGuard('psp-api') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
