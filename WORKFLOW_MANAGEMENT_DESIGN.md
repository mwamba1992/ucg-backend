# Workflow Management System - Design Document

## Overview

This document outlines the design for a comprehensive workflow management system for the UCG platform, specifically for managing the Service Provider onboarding process.

---

## Current State (What We Have)

```typescript
// Simple status tracking
enum OnboardingStatus {
  PENDING, UNDER_REVIEW, KYC_VERIFICATION,
  APPROVED, REJECTED, SUSPENDED, ACTIVE
}

// Basic methods
approve(id, approvedBy)
reject(id, rejectionReason)
```

**Problems:**
- ❌ No validation of state transitions (can jump from PENDING to ACTIVE)
- ❌ No workflow step tracking
- ❌ No task assignments to users
- ❌ No approval chains (e.g., KYC Officer → Compliance → Manager)
- ❌ No audit trail of who did what when
- ❌ No automatic notifications
- ❌ No SLA tracking
- ❌ No parallel approvals (e.g., legal and finance reviewing simultaneously)

---

## Proposed Workflow Management System

### 1. Workflow Definition

```typescript
// Complete onboarding workflow
PENDING
  ↓
DOCUMENT_VERIFICATION (Assigned to: KYC Officer)
  ↓
KYC_VERIFICATION (Assigned to: Compliance Officer)
  ├── NIDA Check (Parallel)
  ├── BRELA Check (Parallel)
  └── TRA Check (Parallel)
  ↓
RISK_ASSESSMENT (Assigned to: Risk Officer)
  ↓
MANAGER_APPROVAL (Assigned to: Operations Manager)
  ↓
APPROVED
  ↓
ACTIVE (After first transaction or manual activation)

Alternative Paths:
REJECTED (From any step with reason)
SUSPENDED (After ACTIVE, for compliance issues)
```

### 2. Database Schema

#### Table: `workflow_definitions`

```sql
CREATE TABLE workflow_definitions (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'SERVICE_PROVIDER', 'TRANSACTION', etc.
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  definition JSONB NOT NULL, -- Workflow steps and transitions
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example workflow definition
{
  "name": "Service Provider Onboarding",
  "steps": [
    {
      "id": "document_verification",
      "name": "Document Verification",
      "type": "MANUAL_TASK",
      "assignTo": "ROLE:KYC_OFFICER",
      "sla": 24, // hours
      "requiredFields": ["registrationNumber", "tinNumber"],
      "nextSteps": ["kyc_verification"],
      "actions": ["APPROVE", "REJECT", "REQUEST_INFO"]
    },
    {
      "id": "kyc_verification",
      "name": "KYC Verification",
      "type": "PARALLEL_TASKS",
      "tasks": [
        {"id": "nida_check", "name": "NIDA Verification", "type": "API_CALL"},
        {"id": "brela_check", "name": "BRELA Verification", "type": "API_CALL"},
        {"id": "tra_check", "name": "TRA Verification", "type": "API_CALL"}
      ],
      "nextSteps": ["risk_assessment"]
    },
    // ... more steps
  ]
}
```

#### Table: `workflow_instances`

```sql
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY,
  workflow_definition_id UUID REFERENCES workflow_definitions(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL, -- Service Provider ID
  current_step VARCHAR(100),
  status VARCHAR(50), -- 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
```

#### Table: `workflow_tasks`

```sql
CREATE TABLE workflow_tasks (
  id UUID PRIMARY KEY,
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  step_id VARCHAR(100) NOT NULL,
  task_name VARCHAR(200) NOT NULL,
  task_type VARCHAR(50), -- 'MANUAL_TASK', 'API_CALL', 'AUTO_TASK'
  assigned_to UUID, -- User ID
  assigned_role VARCHAR(50), -- Role name (if not assigned to specific user)
  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
  priority VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  due_date TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  completed_by UUID,
  result JSONB, -- Task outcome
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_tasks_assigned ON workflow_tasks(assigned_to, status);
CREATE INDEX idx_workflow_tasks_due ON workflow_tasks(due_date, status);
```

#### Table: `workflow_history`

```sql
CREATE TABLE workflow_history (
  id UUID PRIMARY KEY,
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  task_id UUID REFERENCES workflow_tasks(id),
  action VARCHAR(100) NOT NULL, -- 'STARTED', 'COMPLETED', 'APPROVED', 'REJECTED', etc.
  from_step VARCHAR(100),
  to_step VARCHAR(100),
  performed_by UUID, -- User ID
  comments TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_history_instance ON workflow_history(workflow_instance_id);
CREATE INDEX idx_workflow_history_created ON workflow_history(created_at DESC);
```

#### Table: `workflow_notifications`

```sql
CREATE TABLE workflow_notifications (
  id UUID PRIMARY KEY,
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  task_id UUID REFERENCES workflow_tasks(id),
  recipient_user_id UUID,
  recipient_role VARCHAR(50),
  notification_type VARCHAR(50), -- 'TASK_ASSIGNED', 'TASK_DUE', 'TASK_OVERDUE', 'APPROVAL_NEEDED'
  channel VARCHAR(20), -- 'EMAIL', 'SMS', 'IN_APP', 'WEBHOOK'
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED'
  sent_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workflow_notifications_status ON workflow_notifications(status);
```

---

## 3. Implementation Files

### 3.1 Entities

**workflow-definition.entity.ts**
```typescript
@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  entityType: string; // 'SERVICE_PROVIDER', 'TRANSACTION'

  @Column({ default: 1 })
  version: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb' })
  definition: WorkflowDefinitionJson;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

interface WorkflowDefinitionJson {
  name: string;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'MANUAL_TASK' | 'API_CALL' | 'AUTO_TASK' | 'PARALLEL_TASKS';
  assignTo?: string; // 'ROLE:KYC_OFFICER' or 'USER:uuid'
  sla?: number; // hours
  requiredFields?: string[];
  nextSteps: string[];
  actions: string[];
  tasks?: SubTask[];
}
```

**workflow-instance.entity.ts**
```typescript
@Entity('workflow_instances')
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowDefinitionId: string;

  @Column()
  entityType: string;

  @Column({ type: 'uuid' })
  entityId: string; // Service Provider ID

  @Column({ nullable: true })
  currentStep: string;

  @Column()
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

  @Column()
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => WorkflowDefinition)
  @JoinColumn({ name: 'workflowDefinitionId' })
  workflowDefinition: WorkflowDefinition;

  @OneToMany(() => WorkflowTask, task => task.workflowInstance)
  tasks: WorkflowTask[];

  @OneToMany(() => WorkflowHistory, history => history.workflowInstance)
  history: WorkflowHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isInProgress(): boolean {
    return this.status === 'IN_PROGRESS';
  }

  isCompleted(): boolean {
    return this.status === 'COMPLETED';
  }
}
```

**workflow-task.entity.ts**
```typescript
@Entity('workflow_tasks')
export class WorkflowTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowInstanceId: string;

  @Column()
  stepId: string;

  @Column()
  taskName: string;

  @Column()
  taskType: 'MANUAL_TASK' | 'API_CALL' | 'AUTO_TASK';

  @Column({ type: 'uuid', nullable: true })
  assignedTo: string; // User ID

  @Column({ nullable: true })
  assignedRole: string;

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

  @Column({ default: 'MEDIUM' })
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  completedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => WorkflowInstance, instance => instance.tasks)
  @JoinColumn({ name: 'workflowInstanceId' })
  workflowInstance: WorkflowInstance;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods
  isOverdue(): boolean {
    return this.dueDate && new Date() > this.dueDate && this.status !== 'COMPLETED';
  }

  isDueSoon(): boolean {
    if (!this.dueDate) return false;
    const hoursUntilDue = (this.dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
  }
}
```

**workflow-history.entity.ts**
```typescript
@Entity('workflow_history')
export class WorkflowHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowInstanceId: string;

  @Column({ type: 'uuid', nullable: true })
  taskId: string;

  @Column()
  action: string; // 'STARTED', 'COMPLETED', 'APPROVED', 'REJECTED'

  @Column({ nullable: true })
  fromStep: string;

  @Column({ nullable: true })
  toStep: string;

  @Column({ type: 'uuid', nullable: true })
  performedBy: string;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => WorkflowInstance, instance => instance.history)
  @JoinColumn({ name: 'workflowInstanceId' })
  workflowInstance: WorkflowInstance;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 3.2 Service Methods

**workflow.service.ts**
```typescript
@Injectable()
export class WorkflowService {
  /**
   * Start a new workflow for an entity
   */
  async startWorkflow(
    entityType: string,
    entityId: string,
    workflowName: string,
  ): Promise<WorkflowInstance> {
    // Get active workflow definition
    const definition = await this.getWorkflowDefinition(entityType, workflowName);

    // Create workflow instance
    const instance = this.workflowInstanceRepository.create({
      workflowDefinitionId: definition.id,
      entityType,
      entityId,
      currentStep: definition.definition.steps[0].id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    });

    const savedInstance = await this.workflowInstanceRepository.save(instance);

    // Create first task
    await this.createTaskForStep(savedInstance, definition.definition.steps[0]);

    // Log history
    await this.logHistory(savedInstance.id, 'WORKFLOW_STARTED', null, savedInstance.currentStep);

    return savedInstance;
  }

  /**
   * Complete a task and move to next step
   */
  async completeTask(
    taskId: string,
    userId: string,
    result: any,
    comments?: string,
  ): Promise<void> {
    const task = await this.findTask(taskId);
    const instance = await this.findWorkflowInstance(task.workflowInstanceId);
    const definition = await this.getWorkflowDefinition(instance.entityType, null);

    // Mark task as completed
    task.status = 'COMPLETED';
    task.completedAt = new Date();
    task.completedBy = userId;
    task.result = result;
    await this.workflowTaskRepository.save(task);

    // Log history
    await this.logHistory(
      instance.id,
      'TASK_COMPLETED',
      instance.currentStep,
      null,
      taskId,
      userId,
      comments,
    );

    // Check if all tasks in current step are complete
    const currentStepTasks = await this.getTasksForStep(instance.id, instance.currentStep);
    const allComplete = currentStepTasks.every(t => t.status === 'COMPLETED');

    if (allComplete) {
      // Move to next step
      await this.transitionToNextStep(instance, definition);
    }
  }

  /**
   * Transition to next workflow step
   */
  private async transitionToNextStep(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
  ): Promise<void> {
    const currentStep = definition.definition.steps.find(
      s => s.id === instance.currentStep,
    );

    if (!currentStep) {
      throw new Error('Current step not found in workflow definition');
    }

    // Get next step based on task results
    const nextStepId = this.determineNextStep(currentStep, instance);

    if (!nextStepId) {
      // Workflow complete
      instance.status = 'COMPLETED';
      instance.completedAt = new Date();
      await this.workflowInstanceRepository.save(instance);

      await this.logHistory(instance.id, 'WORKFLOW_COMPLETED', instance.currentStep, null);
      await this.sendNotification(instance, 'WORKFLOW_COMPLETED');
      return;
    }

    const nextStep = definition.definition.steps.find(s => s.id === nextStepId);

    // Update instance
    const previousStep = instance.currentStep;
    instance.currentStep = nextStepId;
    await this.workflowInstanceRepository.save(instance);

    // Create tasks for next step
    await this.createTaskForStep(instance, nextStep);

    // Log transition
    await this.logHistory(
      instance.id,
      'STEP_TRANSITION',
      previousStep,
      nextStepId,
    );
  }

  /**
   * Create task for a workflow step
   */
  private async createTaskForStep(
    instance: WorkflowInstance,
    step: WorkflowStep,
  ): Promise<void> {
    if (step.type === 'PARALLEL_TASKS') {
      // Create multiple tasks in parallel
      for (const subTask of step.tasks) {
        await this.createSingleTask(instance, step.id, subTask.name, step);
      }
    } else {
      // Create single task
      await this.createSingleTask(instance, step.id, step.name, step);
    }
  }

  private async createSingleTask(
    instance: WorkflowInstance,
    stepId: string,
    taskName: string,
    step: WorkflowStep,
  ): Promise<WorkflowTask> {
    const task = this.workflowTaskRepository.create({
      workflowInstanceId: instance.id,
      stepId,
      taskName,
      taskType: step.type,
      assignedRole: step.assignTo?.startsWith('ROLE:')
        ? step.assignTo.replace('ROLE:', '')
        : null,
      assignedTo: step.assignTo?.startsWith('USER:')
        ? step.assignTo.replace('USER:', '')
        : null,
      status: 'PENDING',
      dueDate: step.sla ? new Date(Date.now() + step.sla * 60 * 60 * 1000) : null,
    });

    const savedTask = await this.workflowTaskRepository.save(task);

    // Send notification to assignee
    await this.sendTaskAssignmentNotification(savedTask);

    return savedTask;
  }

  /**
   * Get pending tasks for a user
   */
  async getMyTasks(userId: string): Promise<WorkflowTask[]> {
    return await this.workflowTaskRepository.find({
      where: [
        { assignedTo: userId, status: 'PENDING' },
        { assignedTo: userId, status: 'IN_PROGRESS' },
      ],
      relations: ['workflowInstance'],
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Get workflow history
   */
  async getWorkflowHistory(instanceId: string): Promise<WorkflowHistory[]> {
    return await this.workflowHistoryRepository.find({
      where: { workflowInstanceId: instanceId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Reject workflow
   */
  async rejectWorkflow(
    instanceId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    const instance = await this.findWorkflowInstance(instanceId);

    instance.status = 'REJECTED';
    instance.completedAt = new Date();
    await this.workflowInstanceRepository.save(instance);

    // Cancel all pending tasks
    await this.workflowTaskRepository.update(
      { workflowInstanceId: instanceId, status: 'PENDING' },
      { status: 'CANCELLED' },
    );

    await this.logHistory(
      instanceId,
      'WORKFLOW_REJECTED',
      instance.currentStep,
      null,
      null,
      userId,
      reason,
    );
  }
}
```

---

## 4. API Endpoints

```typescript
@Controller('workflows')
export class WorkflowController {
  // Start workflow for service provider onboarding
  @Post('service-provider/:spId/start')
  async startOnboarding(@Param('spId') spId: string) {
    return await this.workflowService.startWorkflow(
      'SERVICE_PROVIDER',
      spId,
      'Service Provider Onboarding',
    );
  }

  // Get my pending tasks
  @Get('my-tasks')
  async getMyTasks(@Request() req) {
    return await this.workflowService.getMyTasks(req.user.id);
  }

  // Complete a task
  @Post('tasks/:taskId/complete')
  async completeTask(
    @Param('taskId') taskId: string,
    @Body() body: { result: any; comments?: string },
    @Request() req,
  ) {
    return await this.workflowService.completeTask(
      taskId,
      req.user.id,
      body.result,
      body.comments,
    );
  }

  // Get workflow instance details
  @Get('instances/:instanceId')
  async getWorkflowInstance(@Param('instanceId') instanceId: string) {
    return await this.workflowService.findWorkflowInstance(instanceId);
  }

  // Get workflow history
  @Get('instances/:instanceId/history')
  async getWorkflowHistory(@Param('instanceId') instanceId: string) {
    return await this.workflowService.getWorkflowHistory(instanceId);
  }

  // Reject workflow
  @Post('instances/:instanceId/reject')
  async rejectWorkflow(
    @Param('instanceId') instanceId: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return await this.workflowService.rejectWorkflow(
      instanceId,
      req.user.id,
      reason,
    );
  }

  // Get workflow statistics
  @Get('statistics')
  async getStatistics() {
    return await this.workflowService.getStatistics();
  }
}
```

---

## 5. Benefits of Proper Workflow Management

| Feature | Without Workflow | With Workflow |
|---------|------------------|---------------|
| **State Transitions** | ❌ Can jump any state | ✅ Validated transitions only |
| **Task Assignment** | ❌ Manual assignment | ✅ Automatic based on role/user |
| **Audit Trail** | ❌ Only status changes | ✅ Complete history with comments |
| **Notifications** | ❌ Manual | ✅ Automatic on task assignment/due |
| **SLA Tracking** | ❌ None | ✅ Due dates and overdue alerts |
| **Parallel Tasks** | ❌ Not supported | ✅ KYC checks run simultaneously |
| **Approval Chains** | ❌ Single approval | ✅ Multi-level approvals |
| **Flexibility** | ❌ Hard-coded | ✅ Configurable via JSON |
| **Reporting** | ❌ Limited | ✅ Detailed workflow analytics |

---

## 6. Example: Service Provider Onboarding Workflow

```json
{
  "name": "Service Provider Onboarding",
  "entityType": "SERVICE_PROVIDER",
  "steps": [
    {
      "id": "document_submission",
      "name": "Document Submission",
      "type": "AUTO_TASK",
      "nextSteps": ["document_verification"]
    },
    {
      "id": "document_verification",
      "name": "Document Verification",
      "type": "MANUAL_TASK",
      "assignTo": "ROLE:KYC_OFFICER",
      "sla": 24,
      "requiredFields": ["registrationNumber", "tinNumber", "nidaNumber"],
      "actions": ["APPROVE", "REJECT", "REQUEST_INFO"],
      "nextSteps": ["kyc_verification"]
    },
    {
      "id": "kyc_verification",
      "name": "KYC Verification",
      "type": "PARALLEL_TASKS",
      "tasks": [
        {
          "id": "nida_check",
          "name": "NIDA Verification",
          "type": "API_CALL",
          "api": "https://ors.nida.go.tz/api/v1/verify"
        },
        {
          "id": "brela_check",
          "name": "BRELA Verification",
          "type": "API_CALL",
          "api": "https://api.brela.go.tz/v1/business/verify"
        },
        {
          "id": "tra_check",
          "name": "TRA TIN Verification",
          "type": "API_CALL",
          "api": "https://api.tra.go.tz/verification/v1/tin/verify"
        }
      ],
      "sla": 4,
      "nextSteps": ["risk_assessment"]
    },
    {
      "id": "risk_assessment",
      "name": "Risk Assessment",
      "type": "MANUAL_TASK",
      "assignTo": "ROLE:RISK_OFFICER",
      "sla": 48,
      "actions": ["LOW_RISK", "MEDIUM_RISK", "HIGH_RISK", "REJECT"],
      "nextSteps": ["manager_approval"]
    },
    {
      "id": "manager_approval",
      "name": "Manager Final Approval",
      "type": "MANUAL_TASK",
      "assignTo": "ROLE:OPERATIONS_MANAGER",
      "sla": 24,
      "actions": ["APPROVE", "REJECT"],
      "nextSteps": ["approved"]
    },
    {
      "id": "approved",
      "name": "Approved",
      "type": "AUTO_TASK",
      "actions": ["ACTIVATE"],
      "nextSteps": []
    }
  ]
}
```

---

## 7. Implementation Checklist

### Phase 1: Core Workflow Engine
- [ ] Create workflow database tables
- [ ] Create workflow entities
- [ ] Implement WorkflowService
- [ ] Create basic workflow definition
- [ ] Test workflow transitions

### Phase 2: Task Management
- [ ] Implement task assignment logic
- [ ] Create task completion endpoints
- [ ] Add task due date tracking
- [ ] Implement "My Tasks" dashboard
- [ ] Add task reassignment capability

### Phase 3: Notifications
- [ ] Email notifications on task assignment
- [ ] SMS for urgent/overdue tasks
- [ ] In-app notifications
- [ ] Webhook notifications to external systems

### Phase 4: Audit & Reporting
- [ ] Complete workflow history tracking
- [ ] Workflow analytics dashboard
- [ ] SLA compliance reports
- [ ] Bottleneck analysis

### Phase 5: Advanced Features
- [ ] Parallel approval support
- [ ] Conditional branching (if-then-else)
- [ ] Escalation rules (auto-reassign if overdue)
- [ ] Workflow templates
- [ ] Visual workflow designer

---

## 8. Migration Path

### From Current Simple Status to Workflow

1. **Keep existing status field** for backward compatibility
2. **Create workflow tables** alongside existing structure
3. **Start workflow on SP creation**:
   ```typescript
   async create(createDto: CreateServiceProviderDto) {
     const sp = await this.serviceProviderRepository.save(createDto);

     // Start workflow
     await this.workflowService.startWorkflow(
       'SERVICE_PROVIDER',
       sp.id,
       'Service Provider Onboarding'
     );

     return sp;
   }
   ```
4. **Sync status field** when workflow steps complete
5. **Gradually migrate** from direct status updates to workflow tasks

---

## 9. Cost-Benefit Analysis

### Without Proper Workflow Management:
- ⚠️ Manual tracking of onboarding progress
- ⚠️ Risk of missing steps (e.g., forgetting KYC check)
- ⚠️ No clear accountability (who's responsible for what?)
- ⚠️ Difficult to audit compliance
- ⚠️ Hard to identify bottlenecks
- ⚠️ Manual notifications = delays

### With Workflow Management:
- ✅ Automatic progress tracking
- ✅ Guaranteed all steps completed
- ✅ Clear task assignments and accountability
- ✅ Full audit trail for regulators
- ✅ Real-time bottleneck visibility
- ✅ Automatic notifications = faster processing
- ✅ SLA compliance monitoring
- ✅ Scalable to other workflows (transaction approvals, etc.)

### Estimated Time to Implement:
- **Core Engine**: 3-5 days
- **Task Management**: 2-3 days
- **Notifications**: 2 days
- **Audit/Reporting**: 3 days
- **Total**: ~2 weeks

---

## 10. Recommended Decision

### Option A: Continue with Simple Status (Current)
**Pros**: No additional work needed
**Cons**: Limited functionality, no audit trail, manual process

### Option B: Implement Basic Workflow (Recommended)
**Scope**: Core engine + task management + notifications
**Timeline**: 1 week
**Benefits**: 80% of functionality, quick win

### Option C: Full Workflow System
**Scope**: All features including analytics and designer
**Timeline**: 2-3 weeks
**Benefits**: Complete solution, production-ready

---

**Recommendation**: Start with **Option B** (Basic Workflow) and expand later based on business needs.

---

**Document Version**: 1.0
**Created**: November 7, 2025
**Status**: DESIGN PROPOSAL
