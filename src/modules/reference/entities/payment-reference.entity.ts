import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ServiceProvider } from '../../service-provider/entities/service-provider.entity';
import { ReferenceLineItem } from './reference-line-item.entity';

export enum ReferenceStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentOption {
  COMPLETE = 'COMPLETE',
  PARTIAL = 'PARTIAL',
  PRECISE = 'PRECISE',
  LIMITED = 'LIMITED',
  PERPETUAL = 'PERPETUAL',
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

  @Column({ length: 100, nullable: true })
  customerEmail: string;

  // Customer Identification
  @Column({ length: 50, nullable: true })
  customerId: string; // National ID, Passport, Tax ID, etc.

  @Column({ length: 20, nullable: true })
  customerIdType: string; // Type: 1=National ID, 2=Passport, 3=Driving License, etc.

  @Column({ length: 100, nullable: true })
  customerAccount: string; // Customer account number with service provider

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  minPaymentAmount: number; // Minimum payment amount for partial payments

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 10, default: 'TZS' })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1.0 })
  exchangeRate: number; // Exchange rate for multi-currency support

  @Column({
    type: 'enum',
    enum: PaymentOption,
    default: PaymentOption.COMPLETE,
  })
  paymentOption: PaymentOption;

  // Audit fields
  @Column({ length: 50, nullable: true })
  workstation: string; // Terminal/workstation ID that generated the reference

  @Column({ length: 100, nullable: true })
  issuedBy: string; // Who created the reference

  @Column({ length: 100, nullable: true })
  approvedBy: string; // Who approved the reference

  // Track payments for installment options
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPaid: number;

  @Column({ type: 'int', default: 0 })
  installmentCount: number;

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

  // Helper method to check if fully paid
  isFullyPaid(): boolean {
    return Number(this.totalPaid) >= Number(this.amount);
  }

  // Helper method to get remaining amount
  getRemainingAmount(): number {
    return Math.max(0, Number(this.amount) - Number(this.totalPaid));
  }

  // Helper method to check if payment amount is valid for this payment option
  canAcceptPayment(paymentAmount: number): {
    allowed: boolean;
    reason?: string;
  } {
    const amount = Number(paymentAmount);
    const invoiceAmount = Number(this.amount);
    const totalPaid = Number(this.totalPaid);
    const remaining = this.getRemainingAmount();

    switch (this.paymentOption) {
      case PaymentOption.COMPLETE:
        // Single installment >= invoice amount
        if (this.installmentCount === 0) {
          if (amount >= invoiceAmount) {
            return { allowed: true };
          }
          return {
            allowed: false,
            reason: `COMPLETE option requires payment >= ${invoiceAmount}`,
          };
        }
        return {
          allowed: false,
          reason: 'COMPLETE option allows only one payment',
        };

      case PaymentOption.PARTIAL:
        // Pay in any number of installments, any amount, as long as a balance
        // remains. Only overpayment (more than the outstanding balance) is rejected.
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: 'Reference is already fully paid',
          };
        }
        if (amount > remaining) {
          return {
            allowed: false,
            reason: `PARTIAL payment ${amount} exceeds remaining balance ${remaining}`,
          };
        }
        return { allowed: true };

      case PaymentOption.PRECISE:
        // Single installment exactly = invoice amount
        if (this.installmentCount === 0) {
          if (amount === invoiceAmount) {
            return { allowed: true };
          }
          return {
            allowed: false,
            reason: `PRECISE option requires payment exactly = ${invoiceAmount}`,
          };
        }
        return {
          allowed: false,
          reason: 'PRECISE option allows only one payment',
        };

      case PaymentOption.LIMITED:
        // Single = invoice OR multiple < invoice with last = remaining
        if (this.installmentCount === 0) {
          // First payment
          if (amount === invoiceAmount) {
            return { allowed: true }; // Full payment
          }
          if (amount < invoiceAmount) {
            return { allowed: true }; // Partial payment allowed
          }
          return {
            allowed: false,
            reason: `LIMITED option requires payment <= ${invoiceAmount}`,
          };
        } else {
          // Subsequent payments
          if (amount === remaining) {
            return { allowed: true }; // Final payment must be exact
          }
          if (amount < remaining) {
            return { allowed: true }; // More installments allowed
          }
          return {
            allowed: false,
            reason: `LIMITED option requires payment <= ${remaining}`,
          };
        }

      case PaymentOption.PERPETUAL:
        // Any number of installments with any amount
        return { allowed: true };

      default:
        return {
          allowed: false,
          reason: 'Unknown payment option',
        };
    }
  }
}
