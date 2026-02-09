import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseResultCodeColumnSize1738234800000 implements MigrationInterface {
  name = 'IncreaseResultCodeColumnSize1738234800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Increase resultCode column from varchar(20) to varchar(50) to accommodate APEF error codes
    await queryRunner.query(`
      ALTER TABLE "tigopesa_transactions"
      ALTER COLUMN "resultCode" TYPE character varying(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to varchar(20)
    await queryRunner.query(`
      ALTER TABLE "tigopesa_transactions"
      ALTER COLUMN "resultCode" TYPE character varying(20)
    `);
  }
}
