import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkflowInstance } from './workflow-instance.entity';

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskType {
  MANUAL_TASK = 'MANUAL_TASK',
  API_CALL = 'API_CALL',
  AUTO_TASK = 'AUTO_TASK',
}

@Entity('workflow_tasks')
export class WorkflowTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  workflowInstanceId: string;

  @Column({ length: 100 })
  stepId: string;

  @Column({ length: 200 })
  taskName: string;

  @Column({
    type: 'enum',
    enum: TaskType,
  })
  taskType: TaskType;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  assignedTo: string; // User ID

  @Column({ length: 50, nullable: true })
  @Index()
  assignedRole: string; // Role name

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  @Index()
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  completedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => WorkflowInstance)
  @JoinColumn({ name: 'workflowInstanceId' })
  workflowInstance: WorkflowInstance;

  // Helper methods
  isPending(): boolean {
    return this.status === TaskStatus.PENDING;
  }

  isCompleted(): boolean {
    return this.status === TaskStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === TaskStatus.FAILED;
  }

  isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && !this.isCompleted();
  }

  isDueSoon(hours: number = 24): boolean {
    if (!this.dueDate || this.isCompleted()) return false;
    const hoursUntilDue = (this.dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilDue > 0 && hoursUntilDue <= hours;
  }

  canComplete(): boolean {
    return this.status === TaskStatus.PENDING || this.status === TaskStatus.IN_PROGRESS;
  }
}
