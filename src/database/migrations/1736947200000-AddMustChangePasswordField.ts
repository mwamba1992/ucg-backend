import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMustChangePasswordField1736947200000 implements MigrationInterface {
  name = 'AddMustChangePasswordField1736947200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add mustChangePassword column with default false
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "mustChangePassword" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove mustChangePassword column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "mustChangePassword"
    `);
  }
}
