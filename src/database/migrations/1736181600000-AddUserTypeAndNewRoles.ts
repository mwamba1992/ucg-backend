import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTypeAndNewRoles1736181600000 implements MigrationInterface {
  name = 'AddUserTypeAndNewRoles1736181600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create new UserType enum
    await queryRunner.query(`
      CREATE TYPE "user_type_enum" AS ENUM('ADMIN', 'SERVICE_PROVIDER')
    `);

    // 2. Add userType column with default ADMIN
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "userType" "user_type_enum" NOT NULL DEFAULT 'ADMIN'
    `);

    // 3. Create index on userType
    await queryRunner.query(`
      CREATE INDEX "IDX_user_type" ON "users" ("userType")
    `);

    // 4. Update UserRole enum to include new roles
    await queryRunner.query(`
      ALTER TYPE "users_role_enum" RENAME TO "users_role_enum_old"
    `);

    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM(
        'SUPER_ADMIN',
        'ADMIN',
        'FINANCE_MANAGER',
        'OPERATIONS_MANAGER',
        'COMPLIANCE_OFFICER',
        'SUPPORT_AGENT',
        'ANALYST',
        'AUDITOR',
        'SP_ADMIN',
        'SP_FINANCE',
        'SP_OPERATOR',
        'SP_VIEWER',
        'MANAGER',
        'OPERATOR',
        'VIEWER'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "users_role_enum"
      USING "role"::text::"users_role_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "users_role_enum_old"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert role enum changes
    await queryRunner.query(`
      ALTER TYPE "users_role_enum" RENAME TO "users_role_enum_old"
    `);

    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM(
        'SUPER_ADMIN',
        'ADMIN',
        'MANAGER',
        'OPERATOR',
        'VIEWER'
      )
    `);

    // Update any new roles to VIEWER before reverting
    await queryRunner.query(`
      UPDATE "users"
      SET "role" = 'VIEWER'
      WHERE "role" NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER')
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "users_role_enum"
      USING "role"::text::"users_role_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "users_role_enum_old"
    `);

    // Remove userType
    await queryRunner.query(`
      DROP INDEX "IDX_user_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "userType"
    `);

    await queryRunner.query(`
      DROP TYPE "user_type_enum"
    `);
  }
}
