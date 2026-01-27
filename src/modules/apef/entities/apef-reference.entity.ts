import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ApefPayment } from './apef-payment.entity';

export enum ApefReferenceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('apef_references')
@Index(['referenceNumber'], { unique: true })
@Index(['status'])
@Index(['validatedAt'])
export class ApefReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  referenceNumber: string; // APEF account number (e.g., 906781576)

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerName: string;

  @Column({ type: 'text', nullable: true })
  billDescription: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'TZS' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ApefReferenceStatus,
    default: ApefReferenceStatus.ACTIVE,
  })
  status: ApefReferenceStatus;

  @Column({ type: 'timestamp' })
  validatedAt: Date;

  // Raw APEF validation response for audit
  @Column({ type: 'jsonb', nullable: true })
  apefValidationResponse: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => ApefPayment, (payment) => payment.apefReference)
  payments: ApefPayment[];
}
