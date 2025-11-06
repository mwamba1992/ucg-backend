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
import { ServiceProvider } from '../../service-provider/entities/service-provider.entity';

export enum ReferenceStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('payment_references')
@Index(['referenceNumber'], { unique: true })
@Index(['serviceProviderId', 'status'])
export class PaymentReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  referenceNumber: string; // Format: XXX-YYYYYYY-ZZZ

  @Column({ type: 'uuid' })
  @Index()
  serviceProviderId: string;

  @Column({ length: 200 })
  customerName: string;

  @Column({ length: 15 })
  customerPhone: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 10, default: 'TZS' })
  currency: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: ReferenceStatus,
    default: ReferenceStatus.ACTIVE,
  })
  @Index()
  status: ReferenceStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Track usage
  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  transactionId: string; // Link to transaction when paid

  @Column({ type: 'int', default: 0 })
  validationAttempts: number; // Track validation attempts

  @Column({ type: 'timestamp', nullable: true })
  lastValidatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationship
  @ManyToOne(() => ServiceProvider, { eager: true })
  @JoinColumn({ name: 'serviceProviderId' })
  serviceProvider: ServiceProvider;

  // Helper method to check if reference is valid
  isValid(): boolean {
    if (this.status !== ReferenceStatus.ACTIVE) {
      return false;
    }

    if (this.expiresAt && new Date() > this.expiresAt) {
      return false;
    }

    return true;
  }

  // Helper method to check if expired
  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return new Date() > this.expiresAt;
  }
}
