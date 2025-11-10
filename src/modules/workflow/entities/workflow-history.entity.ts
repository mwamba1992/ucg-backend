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

@Entity('workflow_history')
export class WorkflowHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  workflowInstanceId: string;

  @Column({ type: 'uuid', nullable: true })
  taskId: string;

  @Column({ length: 100 })
  action: string; // 'STARTED', 'COMPLETED', 'APPROVED', 'REJECTED', 'TASK_ASSIGNED', etc.

  @Column({ length: 100, nullable: true })
  fromStep: string;

  @Column({ length: 100, nullable: true })
  toStep: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  performedBy: string; // User ID

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @ManyToOne(() => WorkflowInstance)
  @JoinColumn({ name: 'workflowInstanceId' })
  workflowInstance: WorkflowInstance;
}
