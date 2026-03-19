import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllowedFspCodesToUsers1739100000000 implements MigrationInterface {
  name = 'AddAllowedFspCodesToUsers1739100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add allowedFspCodes column (text for simple-array, nullable, default null)
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "allowedFspCodes" text DEFAULT NULL`,
    );

    // Seed MHB PSP user with allowed FSP codes (simple-array format: comma-separated)
    await queryRunner.query(
      `UPDATE "users" SET "allowedFspCodes" = 'MHB,CRDB' WHERE "id" = '6d43bcf3-31e2-414f-9e1e-d216dc3a01e0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "allowedFspCodes"`,
    );
  }
}
