import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole, UserType } from './entities/user.entity';
import { PermissionsService } from '../permission/permission.service';
import { RolesService } from '../permission/roles.service';
import { RoleInfo } from '../permission/role-definitions.constant';

const LEGACY_ROLES: string[] = [UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER];

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Build RoleInfo[] from DB roles, attaching live DB-sourced permission codes.
   * label/description/userType come from the roles table.
   */
  private async toRoleInfos(
    filter: (userType: string) => boolean = () => true,
    includeLegacy = false,
  ): Promise<RoleInfo[]> {
    const roles = await this.rolesService.list();
    const visible = roles.filter(
      (r) => filter(r.userType) && (includeLegacy || !LEGACY_ROLES.includes(r.name)),
    );
    return Promise.all(
      visible.map(async (r) => ({
        value: r.name,
        label: r.label,
        description: r.description || '',
        userType: r.userType as UserType,
        isSystem: r.isSystem,
        permissions: await this.permissionsService.getRolePermissions(r.name),
      })),
    );
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all available roles',
    description: 'Returns list of all user roles with descriptions and DB-sourced permissions',
  })
  @ApiQuery({ name: 'userType', required: false, enum: UserType })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  async getRoles(@Query('userType') userType?: UserType) {
    const data = await this.toRoleInfos((ut) => (userType ? ut === userType : true));
    return { success: true, data };
  }

  @Get('admin')
  @Public()
  @ApiOperation({ summary: 'Get admin portal roles' })
  @ApiResponse({ status: 200, description: 'Admin roles retrieved successfully' })
  async getAdminRoles() {
    const data = await this.toRoleInfos((ut) => ut === UserType.ADMIN);
    return { success: true, data };
  }

  @Get('service-provider')
  @Public()
  @ApiOperation({ summary: 'Get service provider portal roles' })
  @ApiResponse({ status: 200, description: 'Service provider roles retrieved successfully' })
  async getServiceProviderRoles() {
    const data = await this.toRoleInfos((ut) => ut === UserType.SERVICE_PROVIDER, true);
    return { success: true, data };
  }

  @Get('user-types')
  @Public()
  @ApiOperation({ summary: 'Get all user types' })
  @ApiResponse({ status: 200, description: 'User types retrieved successfully' })
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
