import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../../modules/user/entities/user.entity';

export async function createAdminUser(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  // Check if admin already exists
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@ucg.com' },
  });

  if (existingAdmin) {
    console.log('Admin user already exists');
    return;
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const adminUser = userRepository.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@ucg.com',
    password: hashedPassword,
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
  });

  await userRepository.save(adminUser);
  console.log('Admin user created successfully');
  console.log('Email: admin@ucg.com');
  console.log('Password: Admin@123');
  console.log('IMPORTANT: Change this password after first login!');
}

// Run the seed if this file is executed directly
if (require.main === module) {
  import('../../config/typeorm.config').then(async ({ default: dataSource }) => {
    try {
      await dataSource.initialize();
      await createAdminUser(dataSource);
      await dataSource.destroy();
      process.exit(0);
    } catch (error) {
      console.error('Error seeding admin user:', error);
      process.exit(1);
    }
  });
}
