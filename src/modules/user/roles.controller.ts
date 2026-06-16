import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole, UserType } from './entities/user.entity';
import { PermissionsService } from '../permission/permission.service';
import { RoleInfo, ROLE_DEFINITIONS } from '../permission/role-definitions.constant';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly permissionsService: PermissionsService) {}

  private readonly roleDefinitions: Record<UserRole, RoleInfo> = ROLE_DEFINITIONS;

  /**
   * Returns roles with metadata (label/description/userType) from the static map and
   * the `permissions` array replaced by the live, DB-sourced grants for each role.
   */
  private async withDbPermissions(roles: RoleInfo[]): Promise<RoleInfo[]> {
    return Promise.all(
      roles.map(async (role) => ({
        ...role,
        permissions: await this.permissionsService.getRolePermissions(role.value),
      })),
    );
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all available roles',
    description: 'Returns list of all user roles with descriptions and permissions',
  })
  @ApiQuery({
    name: 'userType',
    required: false,
    enum: UserType,
    description: 'Filter roles by user type (ADMIN or SERVICE_PROVIDER)',
  })
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            value: 'SUPER_ADMIN',
            label: 'Super Admin',
            description: 'System owner with full access',
            userType: 'ADMIN',
            permissions: ['users:*', 'service-providers:*'],
          },
        ],
      },
    },
  })
  async getRoles(@Query('userType') userType?: UserType) {
    let roles = Object.values(this.roleDefinitions);

    // Filter by userType if provided
    if (userType) {
      roles = roles.filter((role) => role.userType === userType);
    }

    // Exclude legacy roles by default
    const activRoles = roles.filter(
      (role) =>
        role.value !== UserRole.MANAGER &&
        role.value !== UserRole.OPERATOR &&
        role.value !== UserRole.VIEWER,
    );

    return {
      success: true,
      data: await this.withDbPermissions(activRoles),
    };
  }

  @Get('admin')
  @Public()
  @ApiOperation({
    summary: 'Get admin portal roles',
    description: 'Returns only roles for admin portal users',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin roles retrieved successfully',
  })
  async getAdminRoles() {
    const adminRoles = Object.values(this.roleDefinitions).filter(
      (role) =>
        role.userType === UserType.ADMIN &&
        role.value !== UserRole.MANAGER &&
        role.value !== UserRole.OPERATOR &&
        role.value !== UserRole.VIEWER,
    );

    return {
      success: true,
      data: await this.withDbPermissions(adminRoles),
    };
  }

  @Get('service-provider')
  @Public()
  @ApiOperation({
    summary: 'Get service provider portal roles',
    description: 'Returns only roles for service provider portal users',
  })
  @ApiResponse({
    status: 200,
    description: 'Service provider roles retrieved successfully',
  })
  async getServiceProviderRoles() {
    const spRoles = Object.values(this.roleDefinitions).filter(
      (role) => role.userType === UserType.SERVICE_PROVIDER,
    );

    return {
      success: true,
      data: await this.withDbPermissions(spRoles),
    };
  }

  @Get('user-types')
  @Public()
  @ApiOperation({
    summary: 'Get all user types',
    description: 'Returns list of available user types',
  })
  @ApiResponse({
    status: 200,
    description: 'User types retrieved successfully',
  })
  getUserTypes() {
    return {
      success: true,
      data: [
        {
          value: UserType.ADMIN,
          label: 'Admin Portal User',
          description: 'Users who access the admin portal',
        },
        {
          value: UserType.SERVICE_PROVIDER,
          label: 'Service Provider User',
          description: 'Users from service provider organizations',
        },
        {
          value: UserType.PSP,
          label: 'Payment Service Provider (API Only)',
          description: 'API-only users for third-party payment integrations',
        },
      ],
    };
  }
}
