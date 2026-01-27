import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApefReference } from './apef-reference.entity';
import { CBSTransfer } from '../../cbs/entities/cbs-transfer.entity';

export enum ApefPaymentStatus {
  VALIDATED = 'VALIDATED',           // Reference validated, payment persisted locally
  GL_DEPOSITED = 'GL_DEPOSITED',     // CBS transfer successful
  PENDING_APEF_NOTIFICATION = 'PENDING_APEF_NOTIFICATION', // APEF notification failed, awaiting retry
  COMPLETED = 'COMPLETED',           // Full cycle complete
  REVOKED = 'REVOKED',               // CBS/GL deposit failed - payment cancelled
  REJECTED = 'REJECTED',             // APEF validation failed
}

export enum ApefChannel {
  TIGO = 'TIGO',
  VODA = 'VODA',
  BANK = 'BANK',
  NORMAL = 'NORMAL',
}

@Entity('apef_payments')
@Index(['externalTxnId'], { unique: true })
@Index(['apefReferenceId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['channel'])
export class ApefPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Foreign key to APEF reference
  @Column({ type: 'uuid' })
  apefReferenceId: string;

  // External channel info
  @Column({
    type: 'enum',
    enum: ApefChannel,
  })
  channel: ApefChannel;

  @Column({ type: 'varchar', length: 100, unique: true })
  externalTxnId: string; // Transaction ID from external channel

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  paidAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'TZS' })
  currency: string;

  @Column({ type: 'timestamp' })
  paidAt: Date;

  // Payer info
  @Column({ type: 'varchar', length: 255, nullable: true })
  payerName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  payerPhone: string;

  // Status tracking
  @Column({
    type: 'enum',
    enum: ApefPaymentStatus,
    default: ApefPaymentStatus.VALIDATED,
  })
  status: ApefPaymentStatus;

  // CBS/GL tracking
  @Column({ type: 'uuid', nullable: true })
  cbsTransferId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cbsReference: string;

  @Column({ type: 'timestamp', nullable: true })
  glDepositedAt: Date;

  // APEF notification tracking
  @Column({ type: 'varchar', length: 100, nullable: true })
  apefTransactionReference: string; // Our reference sent to APEF

  @Column({ type: 'timestamp', nullable: true })
  apefNotifiedAt: Date;

  @Column({ type: 'int', default: 0 })
  apefNotificationRetryCount: number;

  @Column({ type: 'text', nullable: true })
  apefNotificationError: string;

  @Column({ type: 'jsonb', nullable: true })
  apefDepositResponse: Record<string, any>;

  // Raw data for audit
  @Column({ type: 'jsonb', nullable: true })
  rawPayload: Record<string, any>;

  // Error tracking
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date;

  @Column({ type: 'text', nullable: true })
  revokeReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => ApefReference, (reference) => reference.payments)
  @JoinColumn({ name: 'apefReferenceId' })
  apefReference: ApefReference;

  @ManyToOne(() => CBSTransfer, { nullable: true })
  @JoinColumn({ name: 'cbsTransferId' })
  cbsTransfer: CBSTransfer;
}
