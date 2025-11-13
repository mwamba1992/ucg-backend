import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServiceProvider } from '../../service-provider/entities/service-provider.entity';

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DISPUTED = 'DISPUTED',
}

export enum SettlementPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  settlementNumber: string; // Format: SET-YYYYMMDD-XXXXX

  @Column({ type: 'uuid' })
  serviceProviderId: string;

  @ManyToOne(() => ServiceProvider)
  @JoinColumn({ name: 'serviceProviderId' })
  serviceProvider: ServiceProvider;

  @Column({ type: 'date' })
  settlementDate: Date;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({
    type: 'enum',
    enum: SettlementPeriod,
    default: SettlementPeriod.DAILY,
  })
  period: SettlementPeriod;

  @Column({ type: 'integer' })
  totalTransactions: number;

  @Column({ type: 'integer' })
  successfulTransactions: number;

  @Column({ type: 'integer' })
  failedTransactions: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number; // Total amount of successful transactions

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalFees: number; // Gateway fees

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  netSettlement: number; // Amount to be settled to SP

  @Column({ type: 'varchar', length: 10, default: 'TZS' })
  currency: string;

  @Column({
    type: 'enum',
    enum: SettlementStatus,
    default: SettlementStatus.PENDING,
  })
  status: SettlementStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Reconciliation tracking
  @Column({ type: 'boolean', default: false })
  isReconciled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  reconciledAt: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reconciledBy: string;

  // File generation
  @Column({ type: 'varchar', length: 500, nullable: true })
  reportFileUrl: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  reportChecksum: string; // SHA256 checksum of the report file

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
