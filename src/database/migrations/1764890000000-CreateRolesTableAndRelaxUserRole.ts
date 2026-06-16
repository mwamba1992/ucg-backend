import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolesTableAndRelaxUserRole1764890000000 implements MigrationInterface {
  name = 'CreateRolesTableAndRelaxUserRole1764890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Roles table (idempotent — UAT schema may have been built by synchronize)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name" VARCHAR(50) NOT NULL,
        "label" VARCHAR(100) NOT NULL,
        "description" VARCHAR(255),
        "userType" VARCHAR(30) NOT NULL DEFAULT 'ADMIN',
        "isSystem" BOOLEAN NOT NULL DEFAULT false,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_roles_name" ON "roles" ("name")
    `);

    // Relax users.role from a Postgres enum to varchar so any role name can be stored.
    // Guarded: only convert if the column is still the enum type (synchronize may already
    // have made it varchar). Then drop the now-unused enum type if nothing else uses it.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'role' AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
          ALTER TABLE "users" ALTER COLUMN "role" TYPE VARCHAR(50) USING "role"::text;
          ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          DROP TYPE "users_role_enum";
        END IF;
      EXCEPTION WHEN dependent_objects_still_exist THEN
        -- another column still uses the enum; leave it in place
        NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: users.role is intentionally left as VARCHAR — recreating the strict enum would
    // fail for any custom role values created after this migration. Only drop the table.
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}
