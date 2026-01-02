import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdTypeAndOtherBusinessType1735574500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update existing service provider types
    await queryRunner.query(`
      UPDATE "service_providers"
      SET "businessType" = 'MICROFINANCE'
      WHERE "businessType" IN ('MFI', 'SACCO')
    `);

    await queryRunner.query(`
      UPDATE "service_providers"
      SET "businessType" = 'HEALTHCARE'
      WHERE "businessType" IN ('HOSPITAL')
    `);

    // Recreate the enum with new values
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ALTER COLUMN "businessType" TYPE VARCHAR(50)
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "service_provider_businesstype_enum"
    `);

    await queryRunner.query(`
      CREATE TYPE "service_provider_businesstype_enum" AS ENUM('SCHOOL', 'MICROFINANCE', 'UTILITY', 'HEALTHCARE', 'GOVERNMENT', 'OTHER')
    `);

    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ALTER COLUMN "businessType" TYPE "service_provider_businesstype_enum" USING "businessType"::"service_provider_businesstype_enum"
    `);

    // Add idType enum type
    await queryRunner.query(`
      CREATE TYPE "public"."id_type_enum" AS ENUM('NIDA', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID')
    `);

    // Add idType column to service_provider_contacts
    await queryRunner.query(`
      ALTER TABLE "service_provider_contacts"
      ADD COLUMN "idType" "public"."id_type_enum" NOT NULL DEFAULT 'NIDA'
    `);

    // Make idNumber NOT NULL since it's now required
    await queryRunner.query(`
      UPDATE "service_provider_contacts"
      SET "idNumber" = 'PENDING'
      WHERE "idNumber" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "service_provider_contacts"
      ALTER COLUMN "idNumber" SET NOT NULL
    `);

    // Add otherBusinessType column to service_providers
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ADD COLUMN "otherBusinessType" VARCHAR(200)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove otherBusinessType column from service_providers
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      DROP COLUMN "otherBusinessType"
    `);

    // Make idNumber nullable again
    await queryRunner.query(`
      ALTER TABLE "service_provider_contacts"
      ALTER COLUMN "idNumber" DROP NOT NULL
    `);

    // Remove idType column from service_provider_contacts
    await queryRunner.query(`
      ALTER TABLE "service_provider_contacts"
      DROP COLUMN "idType"
    `);

    // Drop idType enum type
    await queryRunner.query(`
      DROP TYPE "public"."id_type_enum"
    `);
  }
}
