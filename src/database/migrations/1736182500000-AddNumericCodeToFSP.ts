import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNumericCodeToFSP1736182500000 implements MigrationInterface {
  name = 'AddNumericCodeToFSP1736182500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Update fspCode column length to support longer codes
    await queryRunner.query(`
      ALTER TABLE "financial_service_providers"
      ALTER COLUMN "fspCode" TYPE VARCHAR(20)
    `);

    // 2. Add numericCode column
    await queryRunner.query(`
      ALTER TABLE "financial_service_providers"
      ADD COLUMN "numericCode" VARCHAR(20) UNIQUE
    `);

    // 3. Create index on numericCode
    await queryRunner.query(`
      CREATE INDEX "IDX_fsp_numericCode" ON "financial_service_providers" ("numericCode")
    `);

    // 4. Populate numericCode for existing records based on a mapping
    await queryRunner.query(`
      UPDATE "financial_service_providers"
      SET "numericCode" = CASE
        WHEN "fspCode" = 'VODACOM' THEN 'FSP001'
        WHEN "fspCode" = 'TIGO' THEN 'FSP002'
        WHEN "fspCode" = 'AIRTEL' THEN 'FSP003'
        WHEN "fspCode" = 'HALOTEL' THEN 'FSP004'
        WHEN "fspCode" = 'ZANTEL' THEN 'FSP005'
        WHEN "fspCode" = 'CRDB' THEN 'FSP006'
        WHEN "fspCode" = 'NMB' THEN 'FSP007'
        WHEN "fspCode" = 'NBC' THEN 'FSP008'
        WHEN "fspCode" = 'STANBIC' THEN 'FSP009'
        WHEN "fspCode" = 'EQUITY' THEN 'FSP010'
        WHEN "fspCode" = 'DTB' THEN 'FSP011'
        WHEN "fspCode" = 'STANDARD_CHARTERED' THEN 'FSP012'
        WHEN "fspCode" = 'TPB' THEN 'FSP013'
        WHEN "fspCode" = 'EXIM' THEN 'FSP014'
        WHEN "fspCode" = 'AMANA' THEN 'FSP015'
        WHEN "fspCode" = 'BANK' THEN 'FSP099'
        WHEN "fspCode" = 'CASH' THEN 'FSP098'
        WHEN "fspCode" = 'UNKNOWN' THEN 'FSP000'
        ELSE 'FSP' || LPAD(CAST((SELECT COUNT(*) + 100 FROM "financial_service_providers") AS TEXT), 3, '0')
      END
      WHERE "numericCode" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX "IDX_fsp_numericCode"
    `);

    // Remove numericCode column
    await queryRunner.query(`
      ALTER TABLE "financial_service_providers"
      DROP COLUMN "numericCode"
    `);

    // Revert fspCode column length
    await queryRunner.query(`
      ALTER TABLE "financial_service_providers"
      ALTER COLUMN "fspCode" TYPE VARCHAR(10)
    `);
  }
}
