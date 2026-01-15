import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TransferStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export enum TransferType {
  GL_TO_DEPOSIT = 'GL_TO_DEPOSIT',
  DEPOSIT_TO_GL = 'DEPOSIT_TO_GL',
  GL_TO_GL = 'GL_TO_GL',
  DEPOSIT_TO_DEPOSIT = 'DEPOSIT_TO_DEPOSIT',
}

@Entity('cbs_transfers')
@Index(['reference'], { unique: true })
@Index(['paymentId'])
@Index(['status'])
export class CBSTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string; // Link to payment

  @Column({ type: 'varchar', length: 100, unique: true })
  reference: string; // CBS transaction reference - MUST BE UNIQUE for all CBS transfers

  @Column({ type: 'varchar', length: 50 })
  creditAccount: string;

  @Column({ type: 'varchar', length: 50 })
  debitAccount: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TransferType,
    default: TransferType.GL_TO_DEPOSIT,
  })
  type: TransferType;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING,
  })
  status: TransferStatus;

  @Column({ type: 'text', nullable: true })
  cbsResponseCode: string; // Status code from CBS

  @Column({ type: 'text', nullable: true })
  cbsResponseMessage: string; // Status description from CBS

  @Column({ type: 'jsonb', nullable: true })
  cbsResponse: Record<string, any>; // Full CBS response

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
