import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFspCodeToPayments1736182000000 implements MigrationInterface {
  name = 'AddFspCodeToPayments1736182000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add fspCode column to payments table
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN "fspCode" VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN'
    `);

    // Create index on fspCode for faster queries
    await queryRunner.query(`
      CREATE INDEX "IDX_payments_fspCode" ON "payments" ("fspCode")
    `);

    // Update existing records with a default value if needed
    await queryRunner.query(`
      UPDATE "payments"
      SET "fspCode" = CASE
        WHEN "paymentChannel" ILIKE '%vodacom%' OR "paymentChannel" ILIKE '%mpesa%' THEN 'VODACOM'
        WHEN "paymentChannel" ILIKE '%tigo%' THEN 'TIGO'
        WHEN "paymentChannel" ILIKE '%airtel%' THEN 'AIRTEL'
        WHEN "paymentChannel" ILIKE '%halopesa%' THEN 'HALOTEL'
        WHEN "paymentChannel" ILIKE '%bank%' THEN 'BANK'
        ELSE 'UNKNOWN'
      END
      WHERE "fspCode" = 'UNKNOWN'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX "IDX_payments_fspCode"
    `);

    // Remove fspCode column
    await queryRunner.query(`
      ALTER TABLE "payments"
      DROP COLUMN "fspCode"
    `);
  }
}
