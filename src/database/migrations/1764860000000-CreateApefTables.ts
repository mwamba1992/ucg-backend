import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApefTables1764860000000 implements MigrationInterface {
  name = 'CreateApefTables1764860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "apef_reference_status_enum" AS ENUM ('ACTIVE', 'INACTIVE')
    `);

    await queryRunner.query(`
      CREATE TYPE "apef_payment_status_enum" AS ENUM (
        'VALIDATED',
        'GL_DEPOSITED',
        'PENDING_APEF_NOTIFICATION',
        'COMPLETED',
        'REVOKED',
        'REJECTED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "apef_channel_enum" AS ENUM ('TIGO', 'VODA', 'BANK', 'NORMAL')
    `);

    // Create apef_references table
    await queryRunner.query(`
      CREATE TABLE "apef_references" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "referenceNumber" VARCHAR(32) NOT NULL,
        "customerName" VARCHAR(255),
        "billDescription" TEXT,
        "amount" DECIMAL(18,2),
        "currency" VARCHAR(10) NOT NULL DEFAULT 'TZS',
        "status" "apef_reference_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "validatedAt" TIMESTAMP NOT NULL,
        "apefValidationResponse" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_apef_references" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_apef_references_referenceNumber" UNIQUE ("referenceNumber")
      )
    `);

    // Create indexes for apef_references
    await queryRunner.query(`
      CREATE INDEX "IDX_apef_references_status" ON "apef_references" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_apef_references_validatedAt" ON "apef_references" ("validatedAt")
    `);

    // Create apef_payments table
    await queryRunner.query(`
      CREATE TABLE "apef_payments" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "apefReferenceId" UUID NOT NULL,
        "channel" "apef_channel_enum" NOT NULL,
        "externalTxnId" VARCHAR(100) NOT NULL,
        "paidAmount" DECIMAL(18,2) NOT NULL,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'TZS',
        "paidAt" TIMESTAMP NOT NULL,
        "payerName" VARCHAR(255),
        "payerPhone" VARCHAR(20),
        "status" "apef_payment_status_enum" NOT NULL DEFAULT 'VALIDATED',
        "cbsTransferId" UUID,
        "cbsReference" VARCHAR(100),
        "glDepositedAt" TIMESTAMP,
        "apefTransactionReference" VARCHAR(100),
        "apefNotifiedAt" TIMESTAMP,
        "apefNotificationRetryCount" INTEGER NOT NULL DEFAULT 0,
        "apefNotificationError" TEXT,
        "apefDepositResponse" JSONB,
        "rawPayload" JSONB,
        "errorMessage" TEXT,
        "revokedAt" TIMESTAMP,
        "revokeReason" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_apef_payments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_apef_payments_externalTxnId" UNIQUE ("externalTxnId"),
        CONSTRAINT "FK_apef_payments_apefReference" FOREIGN KEY ("apefReferenceId")
          REFERENCES "apef_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "FK_apef_payments_cbsTransfer" FOREIGN KEY ("cbsTransferId")
          REFERENCES "cbs_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    // Create indexes for apef_payments
    await queryRunner.query(`
      CREATE INDEX "IDX_apef_payments_apefReferenceId" ON "apef_payments" ("apefReferenceId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_apef_payments_status" ON "apef_payments" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_apef_payments_createdAt" ON "apef_payments" ("createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_apef_payments_channel" ON "apef_payments" ("channel")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for apef_payments
    await queryRunner.query(`DROP INDEX "IDX_apef_payments_channel"`);
    await queryRunner.query(`DROP INDEX "IDX_apef_payments_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_apef_payments_status"`);
    await queryRunner.query(`DROP INDEX "IDX_apef_payments_apefReferenceId"`);

    // Drop apef_payments table
    await queryRunner.query(`DROP TABLE "apef_payments"`);

    // Drop indexes for apef_references
    await queryRunner.query(`DROP INDEX "IDX_apef_references_validatedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_apef_references_status"`);

    // Drop apef_references table
    await queryRunner.query(`DROP TABLE "apef_references"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "apef_channel_enum"`);
    await queryRunner.query(`DROP TYPE "apef_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "apef_reference_status_enum"`);
  }
}
