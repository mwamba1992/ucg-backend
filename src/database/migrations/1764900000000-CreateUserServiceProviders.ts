import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets one SERVICE_PROVIDER login access several service providers.
 * Purely additive: existing users keep their primary SP (email / createdBy match),
 * so no backfill is needed.
 */
export class CreateUserServiceProviders1764900000000 implements MigrationInterface {
  name = 'CreateUserServiceProviders1764900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_service_providers" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        "serviceProviderId" UUID NOT NULL,
        "role" VARCHAR(50),
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdBy" UUID,
        CONSTRAINT "PK_user_service_providers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_service_provider" UNIQUE ("userId", "serviceProviderId"),
        CONSTRAINT "FK_user_service_providers_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_service_providers_sp" FOREIGN KEY ("serviceProviderId")
          REFERENCES "service_providers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_service_providers_userId" ON "user_service_providers" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_service_providers_serviceProviderId" ON "user_service_providers" ("serviceProviderId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_service_providers"`);
  }
}
