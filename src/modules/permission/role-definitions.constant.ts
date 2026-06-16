import { UserRole, UserType } from '../user/entities/user.entity';

export interface RoleInfo {
  value: string;
  label: string;
  description: string;
  permissions: string[];
  userType: UserType;
  isSystem?: boolean;
}

/**
 * Static role metadata (label, description, userType) and the DEFAULT permission set
 * used to SEED the database on first install. After seeding, the database
 * (permissions + role_permissions tables) is the source of truth for permissions —
 * this map is only used for labels/descriptions/userType and as the seed baseline.
 */
export const ROLE_DEFINITIONS: Record<UserRole, RoleInfo> = {
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
      'system:roles:manage',
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
      'system:roles:manage',
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
      // Generous initial grant (safe rollout): operations manages SPs end-to-end today,
      // so seed the full SP wildcard rather than only read/update/approve. Tighten via
      // the management interface (no deploy) once desired.
      'service-providers:*',
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
      // Generous initial grant (safe rollout): compliance handled SP onboarding before
      // enforcement existed, so seed the full SP wildcard. Tighten via the interface.
      'service-providers:*',
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
    permissions: ['sp:references:read', 'sp:payments:read', 'sp:dashboard:basic'],
  },

  // PSP (Payment Service Provider) Roles - API Only
  [UserRole.PSP_API]: {
    value: UserRole.PSP_API,
    label: 'PSP API',
    description: 'API-only access for third-party payment service providers (no portal login)',
    userType: UserType.PSP,
    permissions: ['api:payments:create', 'api:references:read', 'api:payments:read'],
  },

  // Legacy Roles (Deprecated)
  [UserRole.MANAGER]: {
    value: UserRole.MANAGER,
    label: 'Manager (Legacy)',
    description: 'Legacy role - Use Operations Manager instead',
    userType: UserType.ADMIN,
    permissions: ['service-providers:read', 'references:read', 'payments:read', 'dashboard:read'],
  },
  [UserRole.OPERATOR]: {
    value: UserRole.OPERATOR,
    label: 'Operator (Legacy)',
    description: 'Legacy role - Use appropriate new role instead',
    userType: UserType.ADMIN,
    permissions: ['references:read', 'payments:read'],
  },
  [UserRole.VIEWER]: {
    value: UserRole.VIEWER,
    label: 'Viewer (Legacy)',
    description: 'Legacy role - Use Analyst or Auditor instead',
    userType: UserType.ADMIN,
    permissions: ['dashboard:read', 'reports:read'],
  },
};

/**
 * Granular permission codes that endpoints check for but which the static map only
 * expresses via the `service-providers:*` wildcard. Seeded into the CATALOG so admins
 * can assign them individually through the management interface.
 */
export const ADDITIONAL_CATALOG_CODES: string[] = [
  'service-providers:create',
  'service-providers:read',
  'service-providers:update',
  'service-providers:approve',
  'service-providers:reject',
  'service-providers:delete',
  'service-providers:bank-accounts:read',
  'service-providers:bank-accounts:manage',
  'system:roles:manage',
];
