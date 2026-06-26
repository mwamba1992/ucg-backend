import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpReferenceQueryConfig1735574600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // External reference-query configuration for SPs that expose their own
    // references (Flow A: UCG queries the SP's system at /api/v1/sp/references/{ref}).
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ADD COLUMN "spReferencePrefix" VARCHAR(10),
      ADD COLUMN "referenceQueryUrl" TEXT,
      ADD COLUMN "outboundApiKey" TEXT
    `);

    // Prefix must be unique so an incoming reference maps to exactly one SP.
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ADD CONSTRAINT "UQ_service_providers_spReferencePrefix" UNIQUE ("spReferencePrefix")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_service_providers_spReferencePrefix"
      ON "service_providers" ("spReferencePrefix")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_service_providers_spReferencePrefix"
    `);

    await queryRunner.query(`
      ALTER TABLE "service_providers"
      DROP CONSTRAINT IF EXISTS "UQ_service_providers_spReferencePrefix"
    `);

    await queryRunner.query(`
      ALTER TABLE "service_providers"
      DROP COLUMN "outboundApiKey",
      DROP COLUMN "referenceQueryUrl",
      DROP COLUMN "spReferencePrefix"
    `);
  }
}
