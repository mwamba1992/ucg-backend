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

export enum AirtelTransactionStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('airtel_transactions')
@Index(['txnId'], { unique: true })
@Index(['referenceNumber'])
@Index(['status'])
@Index(['createdAt'])
export class AirtelTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Airtel Identifiers (Unique)
  @Column({ type: 'varchar', length: 50, unique: true })
  txnId: string; // Airtel transaction ID

  @Column({ type: 'varchar', length: 50, nullable: true })
  refId: string; // Partner reference ID (returned in response)

  // Payment Details
  @Column({ type: 'uuid', nullable: true })
  paymentId: string;

  @Column({ type: 'varchar', length: 50 })
  referenceNumber: string; // Customer reference ID (CUSTOMERREFERENCEID)

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 15 })
  customerPhone: string; // MSISDN (payer)

  @Column({ type: 'varchar', length: 200, nullable: true })
  customerName: string; // SENDERNAME from Airtel

  @Column({ type: 'varchar', length: 50, nullable: true })
  companyName: string; // COMPANYNAME from Airtel

  // Status
  @Column({
    type: 'enum',
    enum: AirtelTransactionStatus,
    default: AirtelTransactionStatus.RECEIVED,
  })
  status: AirtelTransactionStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resultCode: string; // error000, error001, etc.

  @Column({ type: 'text', nullable: true })
  errorDescription: string;

  @Column({ type: 'varchar', length: 1, nullable: true })
  flag: string; // Y/N flag for response

  @Column({ type: 'text', nullable: true })
  content: string; // Message content for customer

  // CBS Integration
  @Column({ type: 'uuid', nullable: true })
  cbsTransferId: string;

  // Raw Data
  @Column({ type: 'jsonb', nullable: true })
  rawNotification: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  rawResponse: Record<string, any>;

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
