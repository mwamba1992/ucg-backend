import { DataSource } from 'typeorm';
import { Permission } from '../../modules/permission/entities/permission.entity';
import { RolePermission } from '../../modules/permission/entities/role-permission.entity';
import {
  ADDITIONAL_CATALOG_CODES,
  ROLE_DEFINITIONS,
} from '../../modules/permission/role-definitions.constant';

/**
 * Seeds the permission catalog and the initial role -> permission mappings.
 *
 * NOTE on initial grants: the role permission lists in ROLE_DEFINITIONS use a GENEROUS
 * baseline for operational admin roles (OPERATIONS_MANAGER / COMPLIANCE_OFFICER hold
 * `service-providers:*`) so that enabling enforcement does not remove access anyone
 * relied on before. Tighten these later via the management API — no deploy needed.
 *
 * Idempotent: safe to run repeatedly.
 */
export async function seedPermissions(dataSource: DataSource) {
  const permissionRepository = dataSource.getRepository(Permission);
  const rolePermissionRepository = dataSource.getRepository(RolePermission);

  // 1. Build the catalog: every code referenced by any role + the granular SP codes.
  const catalogCodes = new Set<string>(ADDITIONAL_CATALOG_CODES);
  for (const def of Object.values(ROLE_DEFINITIONS)) {
    def.permissions.forEach((code) => catalogCodes.add(code));
  }

  for (const code of catalogCodes) {
    const existing = await permissionRepository.findOne({ where: { code } });
    if (existing) {
      continue;
    }
    await permissionRepository.save(
      permissionRepository.create({
        code,
        module: code.split(':')[0],
        description: `Permission: ${code}`,
        isActive: true,
      }),
    );
  }
  console.log(`Seeded ${catalogCodes.size} permission catalog entries`);

  // Index codes -> permission id for fast mapping inserts.
  const allPermissions = await permissionRepository.find();
  const idByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  // 2. Map roles -> permissions from ROLE_DEFINITIONS.
  let inserted = 0;
  for (const def of Object.values(ROLE_DEFINITIONS)) {
    for (const code of def.permissions) {
      const permissionId = idByCode.get(code);
      if (!permissionId) {
        continue;
      }
      const exists = await rolePermissionRepository.findOne({
        where: { role: def.value, permissionId },
      });
      if (exists) {
        continue;
      }
      await rolePermissionRepository.save(
        rolePermissionRepository.create({ role: def.value, permissionId }),
      );
      inserted += 1;
    }
  }
  console.log(`Seeded ${inserted} role-permission mappings`);
}

// Run the seed if this file is executed directly
if (require.main === module) {
  import('../../config/typeorm.config').then(async ({ default: dataSource }) => {
    try {
      await dataSource.initialize();
      await seedPermissions(dataSource);
      await dataSource.destroy();
      process.exit(0);
    } catch (error) {
      console.error('Error seeding permissions:', error);
      process.exit(1);
    }
  });
}
