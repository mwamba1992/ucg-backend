import { PaymentReference } from '@/modules/reference/entities/payment-reference.entity';
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

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  REVERSED = 'REVERSED',
}

@Entity('payments')
@Index(['referenceNumber'])
@Index(['status']) // Only one index per column
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  referenceNumber: string; // No @Index here, already indexed at entity level

  @Column({ length: 200 })
  payerName: string;

  @Column({ length: 15 })
  payerPhone: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amountPaid: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.SUCCESS,
  })
  status: PaymentStatus; // No duplicate @Index

  @Column({ type: 'varchar', length: 10, default: 'TZS' })
  currency: string;

  @Column({ type: 'varchar', length: 30, default: 'Bank' })
  paymentChannel: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  fspCode: string;

  @CreateDateColumn()
  paidAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationship
  @ManyToOne(() => PaymentReference, { eager: true })
  @JoinColumn({ name: 'referenceNumber', referencedColumnName: 'referenceNumber' })
  reference: PaymentReference;
}
