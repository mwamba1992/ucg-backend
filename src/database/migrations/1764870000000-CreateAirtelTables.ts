import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAirtelTables1764870000000 implements MigrationInterface {
  name = 'CreateAirtelTables1764870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for Airtel transaction status
    await queryRunner.query(`
      CREATE TYPE "airtel_transaction_status_enum" AS ENUM ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED')
    `);

    // Add AIRTEL to apef_channel_enum if not exists
    await queryRunner.query(`
      ALTER TYPE "apef_channel_enum" ADD VALUE IF NOT EXISTS 'AIRTEL'
    `);

    // Create airtel_transactions table
    await queryRunner.query(`
      CREATE TABLE "airtel_transactions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "txnId" VARCHAR(50) NOT NULL,
        "refId" VARCHAR(50),
        "paymentId" UUID,
        "referenceNumber" VARCHAR(50) NOT NULL,
        "amount" DECIMAL(15,2) NOT NULL,
        "customerPhone" VARCHAR(15) NOT NULL,
        "customerName" VARCHAR(200),
        "companyName" VARCHAR(50),
        "status" "airtel_transaction_status_enum" NOT NULL DEFAULT 'RECEIVED',
        "resultCode" VARCHAR(50),
        "errorDescription" TEXT,
        "flag" VARCHAR(1),
        "content" TEXT,
        "cbsTransferId" UUID,
        "rawNotification" JSONB,
        "rawResponse" JSONB,
        "errorMessage" TEXT,
        "processedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_airtel_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_airtel_transactions_txnId" UNIQUE ("txnId")
      )
    `);

    // Create indexes for airtel_transactions
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_airtel_transactions_txnId" ON "airtel_transactions" ("txnId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_airtel_transactions_referenceNumber" ON "airtel_transactions" ("referenceNumber")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_airtel_transactions_status" ON "airtel_transactions" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_airtel_transactions_createdAt" ON "airtel_transactions" ("createdAt")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "airtel_transactions"
      ADD CONSTRAINT "FK_airtel_transactions_payment"
      FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "airtel_transactions"
      ADD CONSTRAINT "FK_airtel_transactions_cbsTransfer"
      FOREIGN KEY ("cbsTransferId") REFERENCES "cbs_transfers"("id") ON DELETE SET NULL
    `);

    // Create airtel_config table
    await queryRunner.query(`
      CREATE TABLE "airtel_config" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "partnerCode" VARCHAR(50) NOT NULL,
        "sharedKey" VARCHAR(255) NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "metadata" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_airtel_config" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "airtel_transactions" DROP CONSTRAINT IF EXISTS "FK_airtel_transactions_payment"
    `);
    await queryRunner.query(`
      ALTER TABLE "airtel_transactions" DROP CONSTRAINT IF EXISTS "FK_airtel_transactions_cbsTransfer"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_airtel_transactions_txnId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_airtel_transactions_referenceNumber"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_airtel_transactions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_airtel_transactions_createdAt"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "airtel_config"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "airtel_transactions"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "airtel_transaction_status_enum"`);
  }
}
