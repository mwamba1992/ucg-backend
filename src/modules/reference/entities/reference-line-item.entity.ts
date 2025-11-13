import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PaymentReference } from './payment-reference.entity';

/**
 * Reference Line Item Entity
 * Represents individual service breakdown items for a payment reference
 * Example: A single invoice may contain multiple services/departments
 */
@Entity('reference_line_items')
export class ReferenceLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  referenceId: string;

  @Column({ length: 100 })
  serviceDepartment: string; // Department code (e.g., '3001', '4001')

  @Column({ length: 100 })
  serviceType: string; // Service type code

  @Column({ length: 200, nullable: true })
  serviceReference: string; // Internal reference for this service

  @Column({ type: 'text', nullable: true })
  serviceDescription: string; // Description of this specific service

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  serviceAmount: number; // Amount for this specific service

  @Column({ type: 'int', default: 1 })
  paymentPriority: number; // Priority for payment allocation (1=highest)

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number; // Amount paid towards this line item

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional service-specific data

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationship
  @ManyToOne(() => PaymentReference, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referenceId' })
  reference: PaymentReference;

  // Helper method to check if fully paid
  isFullyPaid(): boolean {
    return Number(this.paidAmount) >= Number(this.serviceAmount);
  }

  // Helper method to get remaining amount
  getRemainingAmount(): number {
    return Math.max(0, Number(this.serviceAmount) - Number(this.paidAmount));
  }
}
