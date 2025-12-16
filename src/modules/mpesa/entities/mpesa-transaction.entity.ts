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
import { Payment } from '../../payment/entities/payment.entity';
import { CBSTransfer } from '../../cbs/entities/cbs-transfer.entity';

export enum MpesaTransactionStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CALLBACK_SENT = 'CALLBACK_SENT',
}

@Entity('mpesa_transactions')
@Index(['mpesaReceipt'], { unique: true })
@Index(['referenceNumber'])
@Index(['status'])
@Index(['transactionDate'])
export class MpesaTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // M-Pesa Identifiers (Unique)
  @Column({ type: 'varchar', length: 20, unique: true })
  mpesaReceipt: string; // e.g., 5BL716QNJBB

  @Column({ type: 'varchar', length: 100 })
  conversationId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  originatorConversationId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  transactionId: string;

  // Payment Details
  @Column({ type: 'uuid', nullable: true })
  paymentId: string;

  @Column({ type: 'varchar', length: 20 })
  referenceNumber: string; // UCG payment reference

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 15 })
  customerPhone: string; // M-Pesa initiator

  @Column({ type: 'varchar', length: 200, nullable: true })
  customerName: string;

  // M-Pesa Transaction Info
  @Column({ type: 'varchar', length: 50, nullable: true })
  commandId: string; // "Pay Bill"

  @Column({ type: 'timestamp', nullable: true })
  transactionDate: Date;

  // Status
  @Column({
    type: 'enum',
    enum: MpesaTransactionStatus,
    default: MpesaTransactionStatus.RECEIVED,
  })
  status: MpesaTransactionStatus;

  @Column({ type: 'varchar', length: 10, nullable: true })
  resultCode: string; // 0 = success, 999 = failure

  @Column({ type: 'text', nullable: true })
  resultDescription: string;

  // CBS Integration
  @Column({ type: 'uuid', nullable: true })
  cbsTransferId: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cbsStatus: string; // PENDING, SUCCESS, FAILED

  // Callback Tracking
  @Column({ type: 'boolean', default: false })
  callbackSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  callbackSentAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  callbackResponse: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  callbackRetryCount: number;

  // Raw Data
  @Column({ type: 'jsonb', nullable: true })
  rawNotification: Record<string, any>;

  // Processing
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @ManyToOne(() => CBSTransfer, { nullable: true })
  @JoinColumn({ name: 'cbsTransferId' })
  cbsTransfer: CBSTransfer;
}
