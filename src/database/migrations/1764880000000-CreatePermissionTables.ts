import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePermissionTables1764880000000 implements MigrationInterface {
  name = 'CreatePermissionTables1764880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent (IF NOT EXISTS) so this is safe even if `synchronize` already created
    // these tables from the entities on a prior app start.

    // Permission catalog
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "code" VARCHAR(100) NOT NULL,
        "description" VARCHAR(255),
        "module" VARCHAR(50),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_permissions_code" UNIQUE ("code")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_permissions_code" ON "permissions" ("code")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_permissions_module" ON "permissions" ("module")
    `);

    // Role -> permission mapping
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "role" VARCHAR(50) NOT NULL,
        "permissionId" UUID NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_role_permission" UNIQUE ("role", "permissionId"),
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permissionId")
          REFERENCES "permissions" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_permissions_role" ON "role_permissions" ("role")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_permissions_permissionId" ON "role_permissions" ("permissionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
  }
}
