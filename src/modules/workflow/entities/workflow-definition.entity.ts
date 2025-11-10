import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'MANUAL_TASK' | 'API_CALL' | 'AUTO_TASK' | 'PARALLEL_TASKS';
  assignTo?: string; // Format: 'ROLE:KYC_OFFICER' or 'USER:uuid'
  sla?: number; // Hours
  requiredFields?: string[];
  nextSteps: string[];
  actions: string[];
  tasks?: SubTask[];
  metadata?: Record<string, any>;
}

export interface SubTask {
  id: string;
  name: string;
  type: 'API_CALL' | 'AUTO_TASK';
  api?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowDefinitionJson {
  name: string;
  description?: string;
  steps: WorkflowStep[];
}

@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  entityType: string; // 'SERVICE_PROVIDER', 'TRANSACTION', etc.

  @Column({ default: 1 })
  version: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb' })
  definition: WorkflowDefinitionJson;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getStep(stepId: string): WorkflowStep | undefined {
    return this.definition.steps.find(step => step.id === stepId);
  }

  getFirstStep(): WorkflowStep {
    return this.definition.steps[0];
  }

  isLastStep(stepId: string): boolean {
    const step = this.getStep(stepId);
    return step ? step.nextSteps.length === 0 : false;
  }
}
