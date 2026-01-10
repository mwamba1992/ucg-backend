import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole, UserType } from './entities/user.entity';

interface RoleInfo {
  value: string;
  label: string;
  description: string;
  permissions: string[];
  userType: UserType;
}

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  private readonly roleDefinitions: Record<UserRole, RoleInfo> = {
    // Admin Portal Roles
    [UserRole.SUPER_ADMIN]: {
      value: UserRole.SUPER_ADMIN,
      label: 'Super Admin',
      description: 'System owner with full access to all features and configurations',
      userType: UserType.ADMIN,
      permissions: [
        'users:*',
        'service-providers:*',
        'references:*',
        'payments:*',
        'reconciliation:*',
        'workflows:*',
        'fsp:*',
        'dashboard:*',
        'system:config',
        'system:hard-delete',
      ],
    },
    [UserRole.ADMIN]: {
      value: UserRole.ADMIN,
      label: 'Admin',
      description: 'Platform administrator with full access except system configurations',
      userType: UserType.ADMIN,
      permissions: [
        'users:create',
        'users:read',
        'users:update',
        'users:delete',
        'service-providers:*',
        'references:*',
        'payments:*',
        'reconciliation:*',
        'workflows:*',
        'fsp:*',
        'dashboard:*',
      ],
    },
    [UserRole.FINANCE_MANAGER]: {
      value: UserRole.FINANCE_MANAGER,
      label: 'Finance Manager',
      description: 'Manage financial operations, payments, reconciliations, and settlements',
      userType: UserType.ADMIN,
      permissions: [
        'payments:read',
        'payments:manage',
        'reconciliation:*',
        'settlements:*',
        'dashboard:financial',
        'reports:financial',
        'service-providers:read',
        'references:read',
      ],
    },
    [UserRole.OPERATIONS_MANAGER]: {
      value: UserRole.OPERATIONS_MANAGER,
      label: 'Operations Manager',
      description: 'Manage daily operations including SPs, references, and workflows',
      userType: UserType.ADMIN,
      permissions: [
        'service-providers:read',
        'service-providers:update',
        'service-providers:approve',
        'references:*',
        'workflows:*',
        'dashboard:operations',
        'payments:read',
      ],
    },
    [UserRole.COMPLIANCE_OFFICER]: {
      value: UserRole.COMPLIANCE_OFFICER,
      label: 'Compliance Officer',
      description: 'Approve/reject service providers and monitor compliance',
      userType: UserType.ADMIN,
      permissions: [
        'service-providers:read',
        'service-providers:approve',
        'service-providers:reject',
        'workflows:read',
        'workflows:approve',
        'reports:compliance',
        'audit-logs:read',
      ],
    },
    [UserRole.SUPPORT_AGENT]: {
      value: UserRole.SUPPORT_AGENT,
      label: 'Support Agent',
      description: 'Customer support with view access and limited modifications',
      userType: UserType.ADMIN,
      permissions: [
        'service-providers:read',
        'references:read',
        'payments:read',
        'support:tickets',
      ],
    },
    [UserRole.ANALYST]: {
      value: UserRole.ANALYST,
      label: 'Analyst',
      description: 'View all dashboards, analytics, and generate reports',
      userType: UserType.ADMIN,
      permissions: [
        'dashboard:*',
        'analytics:*',
        'reports:*',
        'service-providers:read',
        'references:read',
        'payments:read',
      ],
    },
    [UserRole.AUDITOR]: {
      value: UserRole.AUDITOR,
      label: 'Auditor',
      description: 'Read-only access to all data for audit and compliance purposes',
      userType: UserType.ADMIN,
      permissions: [
        'audit-logs:read',
        'users:read',
        'service-providers:read',
        'references:read',
        'payments:read',
        'reconciliation:read',
        'workflows:read',
        'reports:compliance',
      ],
    },

    // Service Provider Portal Roles
    [UserRole.SP_ADMIN]: {
      value: UserRole.SP_ADMIN,
      label: 'SP Admin',
      description: 'Service Provider account owner with full access',
      userType: UserType.SERVICE_PROVIDER,
      permissions: [
        'sp:profile:*',
        'sp:users:*',
        'sp:references:*',
        'sp:payments:read',
        'sp:reconciliation:*',
        'sp:settings:*',
        'sp:bank-accounts:*',
        'sp:dashboard:*',
      ],
    },
    [UserRole.SP_FINANCE]: {
      value: UserRole.SP_FINANCE,
      label: 'SP Finance',
      description: 'Finance team with access to payments, reconciliations, and settlements',
      userType: UserType.SERVICE_PROVIDER,
      permissions: [
        'sp:references:create',
        'sp:references:read',
        'sp:payments:read',
        'sp:reconciliation:*',
        'sp:dashboard:financial',
      ],
    },
    [UserRole.SP_OPERATOR]: {
      value: UserRole.SP_OPERATOR,
      label: 'SP Operator',
      description: 'Operations staff who generate references and view basic data',
      userType: UserType.SERVICE_PROVIDER,
      permissions: [
        'sp:references:create',
        'sp:references:read',
        'sp:references:update',
        'sp:payments:read',
        'sp:dashboard:basic',
      ],
    },
    [UserRole.SP_VIEWER]: {
      value: UserRole.SP_VIEWER,
      label: 'SP Viewer',
      description: 'View-only access to references and basic statistics',
      userType: UserType.SERVICE_PROVIDER,
      permissions: [
        'sp:references:read',
        'sp:payments:read',
        'sp:dashboard:basic',
      ],
    },

    // Legacy Roles (Deprecated)
    [UserRole.MANAGER]: {
      value: UserRole.MANAGER,
      label: 'Manager (Legacy)',
      description: 'Legacy role - Use Operations Manager instead',
      userType: UserType.ADMIN,
      permissions: [
        'service-providers:read',
        'references:read',
        'payments:read',
        'dashboard:read',
      ],
    },
    [UserRole.OPERATOR]: {
      value: UserRole.OPERATOR,
      label: 'Operator (Legacy)',
      description: 'Legacy role - Use appropriate new role instead',
      userType: UserType.ADMIN,
      permissions: [
        'references:read',
        'payments:read',
      ],
    },
    [UserRole.VIEWER]: {
      value: UserRole.VIEWER,
      label: 'Viewer (Legacy)',
      description: 'Legacy role - Use Analyst or Auditor instead',
      userType: UserType.ADMIN,
      permissions: [
        'dashboard:read',
        'reports:read',
      ],
    },
  };

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
  getRoles(@Query('userType') userType?: UserType) {
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
      data: activRoles,
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
  getAdminRoles() {
    const adminRoles = Object.values(this.roleDefinitions).filter(
      (role) =>
        role.userType === UserType.ADMIN &&
        role.value !== UserRole.MANAGER &&
        role.value !== UserRole.OPERATOR &&
        role.value !== UserRole.VIEWER,
    );

    return {
      success: true,
      data: adminRoles,
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
  getServiceProviderRoles() {
    const spRoles = Object.values(this.roleDefinitions).filter(
      (role) => role.userType === UserType.SERVICE_PROVIDER,
    );

    return {
      success: true,
      data: spRoles,
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
      ],
    };
  }
}
