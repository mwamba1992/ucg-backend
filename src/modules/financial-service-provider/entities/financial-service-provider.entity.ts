import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FspType {
  MNO = 'MNO',           // Mobile Network Operator (e.g., Vodacom, Airtel, Tigo, Halotel)
  BANK = 'BANK',         // Commercial Bank (e.g., CRDB, NMB, NBC)
}

export enum FspStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('financial_service_providers')
export class FinancialServiceProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 10 })
  @Index()
  fspCode: string; // Unique code (e.g., VODACOM, AIRTEL, CRDB, NMB)

  @Column({ length: 200 })
  name: string; // Full name (e.g., Vodacom Tanzania PLC)

  @Column({ length: 100, nullable: true })
  shortName: string; // Short name (e.g., Vodacom, CRDB)

  @Column({
    type: 'enum',
    enum: FspType,
  })
  @Index()
  type: FspType;

  @Column({
    type: 'enum',
    enum: FspStatus,
    default: FspStatus.ACTIVE,
  })
  @Index()
  status: FspStatus;

  // Contact Information
  @Column({ length: 15, nullable: true })
  phoneNumber: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  physicalAddress: string;

  @Column({ length: 100, nullable: true })
  website: string;

  // Bank-specific fields
  @Column({ length: 20, nullable: true })
  swiftCode: string; // SWIFT/BIC code for banks

  @Column({ length: 10, nullable: true })
  bankCode: string; // Central bank code

  // MNO-specific fields
  @Column({ length: 10, nullable: true })
  mnoCode: string; // Mobile operator code

  @Column({ length: 50, nullable: true })
  ussdCode: string; // USSD short code (e.g., *150#)

  // API Configuration
  @Column({ type: 'text', nullable: true })
  apiBaseUrl: string; // Base URL for API integration

  @Column({ type: 'text', nullable: true })
  callbackUrl: string; // Callback URL for notifications

  @Column({ type: 'text', nullable: true })
  webhookUrl: string; // Webhook URL

  @Column({ length: 200, nullable: true })
  apiKey: string; // API key (encrypted)

  @Column({ type: 'text', nullable: true })
  apiSecret: string; // API secret (encrypted)

  // General Ledger (GL) Accounts
  @Column({ length: 50, nullable: true })
  glAccountNumber: string; // Main GL account number for this FSP

  @Column({ length: 200, nullable: true })
  glAccountName: string; // GL account name/description

  @Column({ length: 50, nullable: true })
  glSettlementAccount: string; // Settlement account number

  @Column({ length: 50, nullable: true })
  glCommissionAccount: string; // Commission/fee account number

  @Column({ length: 50, nullable: true })
  glSuspenseAccount: string; // Suspense account for pending transactions

  @Column({ length: 50, nullable: true })
  glRevenueAccount: string; // Revenue account for income

  @Column({ length: 50, nullable: true })
  glChargesAccount: string; // Account for charges/fees

  // Settlement Configuration
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  transactionFeePercentage: number; // Fee percentage (e.g., 1.5%)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  transactionFeeFixed: number; // Fixed fee amount

  @Column({ type: 'int', default: 1 })
  settlementPeriodDays: number; // Days before settlement (T+1, T+2, etc.)

  // Statistics
  @Column({ type: 'bigint', default: 0 })
  totalTransactions: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalVolume: number;

  @Column({ type: 'timestamp', nullable: true })
  lastTransactionAt: Date;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  logoUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
