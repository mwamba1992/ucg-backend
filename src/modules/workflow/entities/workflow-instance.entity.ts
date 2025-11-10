import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';

export enum WorkflowStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('workflow_instances')
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  workflowDefinitionId: string;

  @Column({ length: 50 })
  @Index()
  entityType: string; // 'SERVICE_PROVIDER', 'TRANSACTION'

  @Column({ type: 'uuid' })
  @Index()
  entityId: string; // Service Provider ID, Transaction ID, etc.

  @Column({ length: 100, nullable: true })
  currentStep: string;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.IN_PROGRESS,
  })
  @Index()
  status: WorkflowStatus;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => WorkflowDefinition)
  @JoinColumn({ name: 'workflowDefinitionId' })
  workflowDefinition: WorkflowDefinition;

  // Helper methods
  isInProgress(): boolean {
    return this.status === WorkflowStatus.IN_PROGRESS;
  }

  isCompleted(): boolean {
    return this.status === WorkflowStatus.COMPLETED;
  }

  isRejected(): boolean {
    return this.status === WorkflowStatus.REJECTED;
  }

  isCancelled(): boolean {
    return this.status === WorkflowStatus.CANCELLED;
  }

  canTransition(): boolean {
    return this.status === WorkflowStatus.IN_PROGRESS;
  }
}
