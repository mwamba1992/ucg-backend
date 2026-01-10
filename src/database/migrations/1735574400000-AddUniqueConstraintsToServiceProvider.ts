import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddUniqueConstraintsToServiceProvider1735574400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if there are any duplicate registrationNumber values
    const duplicateRegNumbers = await queryRunner.query(`
      SELECT "registrationNumber", COUNT(*)
      FROM service_providers
      WHERE "registrationNumber" IS NOT NULL
      GROUP BY "registrationNumber"
      HAVING COUNT(*) > 1
    `);

    if (duplicateRegNumbers.length > 0) {
      console.warn(
        'Warning: Duplicate registration numbers found. Please resolve them before running this migration:',
        duplicateRegNumbers
      );
      throw new Error('Duplicate registration numbers exist. Please clean up data first.');
    }

    // Check for duplicate TIN numbers
    const duplicateTins = await queryRunner.query(`
      SELECT "tinNumber", COUNT(*)
      FROM service_providers
      WHERE "tinNumber" IS NOT NULL
      GROUP BY "tinNumber"
      HAVING COUNT(*) > 1
    `);

    if (duplicateTins.length > 0) {
      console.warn(
        'Warning: Duplicate TIN numbers found. Please resolve them before running this migration:',
        duplicateTins
      );
      throw new Error('Duplicate TIN numbers exist. Please clean up data first.');
    }

    // Make registrationNumber NOT NULL
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ALTER COLUMN "registrationNumber" SET NOT NULL
    `);

    // Make tinNumber NOT NULL
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ALTER COLUMN "tinNumber" SET NOT NULL
    `);

    // Add unique constraint for registrationNumber
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ADD CONSTRAINT "UQ_service_providers_registrationNumber"
      UNIQUE ("registrationNumber")
    `);

    // Add unique constraint for tinNumber
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ADD CONSTRAINT "UQ_service_providers_tinNumber"
      UNIQUE ("tinNumber")
    `);

    // Create index for registrationNumber
    await queryRunner.createIndex(
      'service_providers',
      new TableIndex({
        name: 'IDX_SERVICE_PROVIDER_REGISTRATION_NUMBER',
        columnNames: ['registrationNumber'],
      }),
    );

    // Create index for tinNumber
    await queryRunner.createIndex(
      'service_providers',
      new TableIndex({
        name: 'IDX_SERVICE_PROVIDER_TIN_NUMBER',
        columnNames: ['tinNumber'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('service_providers', 'IDX_SERVICE_PROVIDER_TIN_NUMBER');
    await queryRunner.dropIndex('service_providers', 'IDX_SERVICE_PROVIDER_REGISTRATION_NUMBER');

    // Drop unique constraints
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      DROP CONSTRAINT "UQ_service_providers_tinNumber"
    `);

    await queryRunner.query(`
      ALTER TABLE "service_providers"
      DROP CONSTRAINT "UQ_service_providers_registrationNumber"
    `);

    // Make columns nullable again
    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ALTER COLUMN "tinNumber" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "service_providers"
      ALTER COLUMN "registrationNumber" DROP NOT NULL
    `);
  }
}
