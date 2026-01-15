import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUniqueConstraintToCBSTransferReference1737000000000 implements MigrationInterface {
  name = 'AddUniqueConstraintToCBSTransferReference1737000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if the table exists
    const tableExists = await queryRunner.hasTable('cbs_transfers');

    if (!tableExists) {
      // If table doesn't exist, it will be created by TypeORM synchronization with the unique constraint
      return;
    }

    // Check if there are any duplicate references before adding the constraint
    const duplicates = await queryRunner.query(`
      SELECT reference, COUNT(*) as count
      FROM cbs_transfers
      GROUP BY reference
      HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
      // If duplicates exist, we need to make them unique by appending a suffix
      this.logger?.warn?.(
        `Found ${duplicates.length} duplicate CBS transfer references. ` +
        `Updating them to be unique before adding constraint...`
      );

      for (const dup of duplicates) {
        // Get all records with this duplicate reference
        const records = await queryRunner.query(
          `SELECT id, reference FROM cbs_transfers WHERE reference = $1 ORDER BY "createdAt" ASC`,
          [dup.reference]
        );

        // Keep the first one as-is, append suffix to others
        for (let i = 1; i < records.length; i++) {
          const newReference = `${records[i].reference}-DUP-${i}`;
          await queryRunner.query(
            `UPDATE cbs_transfers SET reference = $1 WHERE id = $2`,
            [newReference, records[i].id]
          );
        }
      }
    }

    // Increase the column length to accommodate longer unique references
    await queryRunner.changeColumn(
      'cbs_transfers',
      'reference',
      new TableColumn({
        name: 'reference',
        type: 'varchar',
        length: '100',
        isNullable: false,
      }),
    );

    // Add unique constraint to reference column
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cbs_transfers_reference_unique"
      ON "cbs_transfers" ("reference")
    `);

    // Add comment to the column for documentation
    await queryRunner.query(`
      COMMENT ON COLUMN "cbs_transfers"."reference" IS
      'CBS transaction reference - MUST BE UNIQUE for all CBS transfers to prevent duplicate transfers'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('cbs_transfers');

    if (!tableExists) {
      return;
    }

    // Drop unique constraint
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_cbs_transfers_reference_unique"
    `);

    // Revert column length back to 50
    await queryRunner.changeColumn(
      'cbs_transfers',
      'reference',
      new TableColumn({
        name: 'reference',
        type: 'varchar',
        length: '50',
        isNullable: false,
      }),
    );

    // Remove comment
    await queryRunner.query(`
      COMMENT ON COLUMN "cbs_transfers"."reference" IS NULL
    `);
  }
}
