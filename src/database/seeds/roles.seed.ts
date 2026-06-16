import { DataSource } from 'typeorm';
import { Role } from '../../modules/permission/entities/role.entity';
import { ROLE_DEFINITIONS } from '../../modules/permission/role-definitions.constant';

/**
 * Seeds the built-in roles from ROLE_DEFINITIONS as system roles (isSystem=true).
 * Idempotent: existing roles are left as-is (so admin edits to label/active are preserved).
 */
export async function seedRoles(dataSource: DataSource) {
  const roleRepository = dataSource.getRepository(Role);

  let created = 0;
  for (const def of Object.values(ROLE_DEFINITIONS)) {
    const existing = await roleRepository.findOne({ where: { name: def.value } });
    if (existing) continue;
    await roleRepository.save(
      roleRepository.create({
        name: def.value,
        label: def.label,
        description: def.description,
        userType: def.userType,
        isSystem: true,
        isActive: true,
      }),
    );
    created += 1;
  }
  console.log(`Seeded ${created} system roles (of ${Object.keys(ROLE_DEFINITIONS).length})`);
}

// Run the seed if this file is executed directly
if (require.main === module) {
  import('../../config/typeorm.config').then(async ({ default: dataSource }) => {
    try {
      await dataSource.initialize();
      await seedRoles(dataSource);
      await dataSource.destroy();
      process.exit(0);
    } catch (error) {
      console.error('Error seeding roles:', error);
      process.exit(1);
    }
  });
}
