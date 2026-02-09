import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

/**
 * PSP Management Controller
 *
 * Admin-only endpoints for managing Payment Service Provider (PSP) users.
 * PSP users are API-only users that cannot login to web portals.
 */
@ApiTags('PSP Management (Admin Only)')
@Controller('admin/psp-users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PspManagementController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Create a new PSP user
   * Admin only
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create PSP user (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'PSP user created successfully',
    schema: {
      example: {
        success: true,
        message: 'PSP user created successfully',
        data: {
          id: 'uuid',
          email: 'psp@example.com',
          apiKey: 'ucg_psp_1234567890abcdef...',
          userType: 'PSP',
          status: 'ACTIVE',
          allowedFspCodes: ['VODACOM', 'TIGO'],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 409, description: 'User with email already exists' })
  async createPspUser(
    @Body()
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      organizationName?: string;
      allowedFspCodes?: string[]; // Optional: restrict to specific FSPs (null = all allowed)
    },
  ) {
    return await this.authService.createPspUser(data);
  }

  /**
   * Regenerate API key for PSP user
   * Admin only
   */
  @Put(':userId/regenerate-api-key')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate PSP user API key (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'API key regenerated successfully',
    schema: {
      example: {
        success: true,
        message: 'API key regenerated successfully',
        data: {
          apiKey: 'ucg_psp_newkey1234567890abcdef...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'PSP user not found' })
  async regenerateApiKey(@Param('userId') userId: string) {
    return await this.authService.regeneratePspApiKey(userId);
  }

  /**
   * Update allowed FSP codes for PSP user
   * Admin only
   */
  @Put(':userId/allowed-fsps')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update allowed FSP codes for PSP user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Allowed FSP codes updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Allowed FSP codes updated successfully',
        data: {
          allowedFspCodes: ['VODACOM', 'TIGO'],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'PSP user not found' })
  async updateAllowedFspCodes(
    @Param('userId') userId: string,
    @Body() data: { allowedFspCodes: string[] | null }, // null = all FSPs allowed
  ) {
    return await this.authService.updatePspAllowedFspCodes(userId, data.allowedFspCodes);
  }

  /**
   * Deactivate PSP user
   * Admin only
   */
  @Put(':userId/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate PSP user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'PSP user deactivated successfully',
    schema: {
      example: {
        success: true,
        message: 'PSP user deactivated successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'PSP user not found' })
  async deactivatePspUser(@Param('userId') userId: string) {
    return await this.authService.deactivatePspUser(userId);
  }
}
