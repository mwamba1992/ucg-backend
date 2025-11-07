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

export enum BatchStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL', // Some succeeded, some failed
}

@Entity('reference_batches')
export class ReferenceBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, length: 100 })
  batchId: string; // Format: batch-{uuid}

  @Column({ type: 'uuid' })
  serviceProviderId: string;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.PENDING })
  status: BatchStatus;

  @Column({ type: 'int', default: 0 })
  totalRequested: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'int', default: 0 })
  processingCount: number;

  @Column({ type: 'text', nullable: true })
  resultFileUrl: string; // URL to download CSV/JSON results

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  estimatedCompletionTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ServiceProvider, { eager: true })
  @JoinColumn({ name: 'serviceProviderId' })
  serviceProvider: ServiceProvider;

  // Helper methods
  isComplete(): boolean {
    return this.status === BatchStatus.COMPLETED ||
           this.status === BatchStatus.FAILED ||
           this.status === BatchStatus.PARTIAL;
  }

  getProgress(): number {
    if (this.totalRequested === 0) return 0;
    const processed = this.successCount + this.failureCount;
    return (processed / this.totalRequested) * 100;
  }
}
