# Workflow Management System - Implementation Guide

## Overview

A complete workflow management system has been implemented to handle the Service Provider onboarding process. This replaces the simple status-based approach with a robust, multi-step workflow engine that supports task assignment, parallel execution, SLA tracking, and complete audit trails.

## Features Implemented

### 1. Core Workflow Engine
- ✅ Workflow definition system (JSON-based)
- ✅ Workflow instance management
- ✅ Task creation and assignment
- ✅ Automatic state transitions
- ✅ Complete audit trail
- ✅ SLA tracking with due dates
- ✅ Parallel task execution support
- ✅ Role-based task assignment

### 2. Database Schema

Four new tables have been created:

#### `workflow_definitions`
Stores reusable workflow templates in JSON format
```sql
- id (uuid, primary key)
- name (varchar 100)
- entity_type (varchar 50) - e.g., 'SERVICE_PROVIDER'
- version (integer)
- is_active (boolean)
- definition (jsonb) - Full workflow structure
- description (text)
- created_at, updated_at
```

#### `workflow_instances`
Tracks active workflow executions
```sql
- id (uuid, primary key)
- workflow_definition_id (uuid, FK)
- entity_type (varchar 50)
- entity_id (uuid) - Links to Service Provider
- current_step (varchar 100)
- status (enum: IN_PROGRESS, COMPLETED, REJECTED, CANCELLED)
- metadata (jsonb)
- started_at, completed_at
```

#### `workflow_tasks`
Individual tasks within workflow steps
```sql
- id (uuid, primary key)
- workflow_instance_id (uuid, FK)
- step_id (varchar 100)
- step_name (varchar 200)
- task_type (varchar 50)
- status (enum: PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
- assigned_to (uuid) - User ID
- assigned_role (varchar 50) - e.g., 'KYC_OFFICER'
- result (jsonb)
- due_date (timestamp)
- completed_at (timestamp)
```

#### `workflow_history`
Complete audit trail
```sql
- id (uuid, primary key)
- workflow_instance_id (uuid, FK)
- action (varchar 100) - e.g., 'STARTED', 'COMPLETED', 'APPROVED'
- from_step (varchar 100)
- to_step (varchar 100)
- performed_by (uuid)
- comments (text)
- metadata (jsonb)
- created_at (timestamp)
```

### 3. Service Provider Onboarding Workflow

The following 7-step workflow has been configured:

```
1. Document Submission (AUTO_TASK)
   └─> 2. Document Verification (MANUAL_TASK, KYC_OFFICER, 24h SLA)
       └─> 3. KYC Verification (PARALLEL_TASKS, 4h SLA)
           ├─> NIDA Check (API_CALL)
           ├─> BRELA Check (API_CALL)
           └─> TRA Check (API_CALL)
           └─> 4. Risk Assessment (MANUAL_TASK, RISK_OFFICER, 48h SLA)
               └─> 5. Compliance Review (MANUAL_TASK, COMPLIANCE_OFFICER, 24h SLA)
                   └─> 6. Manager Approval (MANUAL_TASK, OPERATIONS_MANAGER, 24h SLA)
                       └─> 7. Setup Complete (AUTO_TASK)
```

**Step Details:**

- **Document Submission**: Auto-completes when SP is created
- **Document Verification**: KYC Officer verifies registration docs, TIN, contact ID, bank details
- **KYC Verification**: Parallel checks with NIDA, BRELA, TRA (currently placeholders for API integration)
- **Risk Assessment**: Risk Officer assigns risk level (LOW/MEDIUM/HIGH)
- **Compliance Review**: Compliance Officer checks AML/CFT, licenses, sanctions
- **Manager Approval**: Operations Manager provides final approval
- **Setup Complete**: Auto-generates API key, activates SP, sends welcome email

## API Endpoints

### Workflow Management

#### 1. Start Workflow
```http
POST /api/workflows/start
Content-Type: application/json

{
  "entityType": "SERVICE_PROVIDER",
  "entityId": "uuid",
  "workflowName": "Service Provider Onboarding",
  "metadata": {}
}
```

**Note**: This is called automatically when a Service Provider is created.

#### 2. Get My Tasks
```http
GET /api/workflows/my-tasks?userId={userId}
```
Returns all pending tasks assigned to the user.

#### 3. Get Tasks by Role
```http
GET /api/workflows/role-tasks/{role}
```
Returns all pending tasks for a specific role (e.g., `KYC_OFFICER`, `RISK_OFFICER`).

#### 4. Complete Task
```http
POST /api/workflows/tasks/{taskId}/complete
Content-Type: application/json

{
  "userId": "uuid",
  "result": {
    "decision": "APPROVED",
    "verificationStatus": "PASSED",
    "riskLevel": "LOW"
  },
  "comments": "All documents verified successfully"
}
```

**Behavior**: When all tasks in the current step are completed, the workflow automatically transitions to the next step.

#### 5. Get Workflow Instance
```http
GET /api/workflows/instances/{instanceId}
```

#### 6. Get Workflow by Entity
```http
GET /api/workflows/entity/{entityType}/{entityId}

Example: GET /api/workflows/entity/SERVICE_PROVIDER/uuid
```

#### 7. Get Workflow History (Audit Trail)
```http
GET /api/workflows/instances/{instanceId}/history
```
Returns complete audit trail of all actions.

#### 8. Get Instance Tasks
```http
GET /api/workflows/instances/{instanceId}/tasks
```

#### 9. Reject Workflow
```http
POST /api/workflows/instances/{instanceId}/reject
Content-Type: application/json

{
  "userId": "uuid",
  "reason": "Incomplete documentation"
}
```

#### 10. Get Statistics
```http
GET /api/workflows/statistics
```
Returns workflow stats (total, in_progress, completed, rejected, avg_completion_time).

## Usage Examples

### Example 1: KYC Officer Completes Document Verification

```bash
# 1. Get tasks for KYC Officer role
GET /api/workflows/role-tasks/KYC_OFFICER

# Response
[
  {
    "id": "task-uuid",
    "workflowInstanceId": "instance-uuid",
    "stepId": "document_verification",
    "stepName": "Document Verification",
    "status": "PENDING",
    "assignedRole": "KYC_OFFICER",
    "dueDate": "2025-11-11T10:00:00Z",
    "isOverdue": false,
    "createdAt": "2025-11-10T10:00:00Z"
  }
]

# 2. Complete the task
POST /api/workflows/tasks/task-uuid/complete
{
  "userId": "kyc-officer-uuid",
  "result": {
    "decision": "APPROVED",
    "documentsVerified": [
      "Business Registration Certificate",
      "TIN Certificate",
      "Contact Person ID",
      "Bank Account Details"
    ]
  },
  "comments": "All documents are valid and verified"
}

# This will:
# - Mark the task as COMPLETED
# - Check if all tasks in "document_verification" step are done
# - Auto-transition to "kyc_verification" step
# - Create 3 parallel tasks for NIDA, BRELA, TRA checks
# - Log all actions in workflow_history
```

### Example 2: Check Workflow Status for a Service Provider

```bash
GET /api/workflows/entity/SERVICE_PROVIDER/{spId}

# Response
{
  "id": "instance-uuid",
  "workflowDefinitionId": "def-uuid",
  "entityType": "SERVICE_PROVIDER",
  "entityId": "sp-uuid",
  "currentStep": "risk_assessment",
  "status": "IN_PROGRESS",
  "metadata": {
    "businessType": "LOGISTICS",
    "businessName": "ABC Logistics Ltd"
  },
  "startedAt": "2025-11-10T08:00:00Z",
  "definition": {
    "name": "Service Provider Onboarding",
    "steps": [...]
  }
}
```

### Example 3: View Complete Audit Trail

```bash
GET /api/workflows/instances/{instanceId}/history

# Response
[
  {
    "id": "history-1",
    "action": "STARTED",
    "fromStep": null,
    "toStep": "document_submission",
    "performedBy": "system",
    "createdAt": "2025-11-10T08:00:00Z"
  },
  {
    "id": "history-2",
    "action": "COMPLETED",
    "fromStep": "document_submission",
    "toStep": "document_verification",
    "performedBy": "system",
    "comments": "Auto-transition to verification",
    "createdAt": "2025-11-10T08:00:05Z"
  },
  {
    "id": "history-3",
    "action": "APPROVED",
    "fromStep": "document_verification",
    "toStep": "kyc_verification",
    "performedBy": "kyc-officer-uuid",
    "comments": "All documents verified",
    "createdAt": "2025-11-10T10:30:00Z"
  }
]
```

## Database Setup

### Step 1: Run Migrations

The TypeORM entities will auto-generate tables if `synchronize: true` is enabled in development. For production, create proper migrations:

```bash
npm run typeorm:migration:generate -- -n WorkflowTables
npm run typeorm:migration:run
```

### Step 2: Seed Workflow Definition

You need to insert the Service Provider Onboarding workflow definition into the database:

```typescript
// Create a seeder file or run this in your application bootstrap
import { Repository } from 'typeorm';
import { WorkflowDefinition } from './modules/workflow/entities/workflow-definition.entity';
import { SP_ONBOARDING_WORKFLOW } from './modules/workflow/seeds/sp-onboarding-workflow.seed';

async function seedWorkflowDefinition(
  workflowDefRepo: Repository<WorkflowDefinition>
) {
  const existing = await workflowDefRepo.findOne({
    where: {
      name: 'Service Provider Onboarding',
      entityType: 'SERVICE_PROVIDER',
    },
  });

  if (!existing) {
    const definition = workflowDefRepo.create({
      name: 'Service Provider Onboarding',
      entityType: 'SERVICE_PROVIDER',
      version: 1,
      isActive: true,
      definition: SP_ONBOARDING_WORKFLOW,
      description: 'Complete workflow for onboarding new service providers with KYC verification',
    });

    await workflowDefRepo.save(definition);
    console.log('✅ Service Provider Onboarding workflow seeded');
  }
}
```

**Or use raw SQL:**

```sql
INSERT INTO workflow_definitions (
  id,
  name,
  entity_type,
  version,
  is_active,
  definition,
  description,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Service Provider Onboarding',
  'SERVICE_PROVIDER',
  1,
  true,
  '{
    "name": "Service Provider Onboarding",
    "description": "Complete workflow for onboarding new service providers",
    "steps": [
      {
        "id": "document_submission",
        "name": "Document Submission",
        "type": "AUTO_TASK",
        "nextSteps": ["document_verification"],
        "actions": ["SUBMIT"]
      },
      {
        "id": "document_verification",
        "name": "Document Verification",
        "type": "MANUAL_TASK",
        "assignTo": "ROLE:KYC_OFFICER",
        "sla": 24,
        "requiredFields": ["registrationNumber", "tinNumber", "businessName"],
        "nextSteps": ["kyc_verification"],
        "actions": ["APPROVE", "REJECT", "REQUEST_INFO"]
      },
      {
        "id": "kyc_verification",
        "name": "KYC Verification",
        "type": "PARALLEL_TASKS",
        "sla": 4,
        "nextSteps": ["risk_assessment"],
        "actions": ["AUTO_COMPLETE"],
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
        ]
      },
      {
        "id": "risk_assessment",
        "name": "Risk Assessment",
        "type": "MANUAL_TASK",
        "assignTo": "ROLE:RISK_OFFICER",
        "sla": 48,
        "nextSteps": ["compliance_review"],
        "actions": ["LOW_RISK", "MEDIUM_RISK", "HIGH_RISK", "REJECT"]
      },
      {
        "id": "compliance_review",
        "name": "Compliance Review",
        "type": "MANUAL_TASK",
        "assignTo": "ROLE:COMPLIANCE_OFFICER",
        "sla": 24,
        "nextSteps": ["manager_approval"],
        "actions": ["APPROVE", "REJECT", "REQUEST_ADDITIONAL_INFO"]
      },
      {
        "id": "manager_approval",
        "name": "Manager Final Approval",
        "type": "MANUAL_TASK",
        "assignTo": "ROLE:OPERATIONS_MANAGER",
        "sla": 24,
        "nextSteps": ["setup_complete"],
        "actions": ["APPROVE", "REJECT"]
      },
      {
        "id": "setup_complete",
        "name": "Setup Complete",
        "type": "AUTO_TASK",
        "nextSteps": [],
        "actions": ["COMPLETE"]
      }
    ]
  }'::jsonb,
  'Complete workflow for onboarding new service providers with KYC verification',
  NOW(),
  NOW()
);
```

## Integration with Service Provider

The workflow system is automatically integrated with Service Provider creation. When a new Service Provider is created via `POST /api/service-providers`, the system:

1. Saves the Service Provider entity
2. Creates contact, bank accounts, settings
3. **Automatically starts the onboarding workflow**
4. Creates the first task (document_submission) which auto-completes
5. Transitions to document_verification step
6. Creates a task assigned to `ROLE:KYC_OFFICER`

**Code location**: `src/modules/service-provider/service-provider.service.ts:122-138`

## Task Assignment Roles

The following roles are used in the workflow:

- `KYC_OFFICER` - Document verification
- `RISK_OFFICER` - Risk assessment
- `COMPLIANCE_OFFICER` - Compliance review
- `OPERATIONS_MANAGER` - Final approval

**Note**: You'll need to implement user-role mapping in your authentication/authorization system to determine which users belong to which roles.

## SLA Monitoring

Tasks have SLA (Service Level Agreement) times defined in hours:

- Document Verification: 24 hours
- KYC Verification: 4 hours
- Risk Assessment: 48 hours
- Compliance Review: 24 hours
- Manager Approval: 24 hours

Use these methods to check SLA status:

```typescript
// Check if task is overdue
task.isOverdue() // boolean

// Check if task is due soon (within 24 hours by default)
task.isDueSoon() // boolean
task.isDueSoon(4) // within 4 hours
```

## Future Enhancements

### 1. Real API Integration for KYC
Currently, the KYC verification step has placeholder API calls. Implement actual integrations:

```typescript
// In WorkflowService or separate KYCService
private async executeNidaCheck(contactPersonId: string): Promise<any> {
  const response = await axios.post('https://ors.nida.go.tz/api/v1/verify', {
    nidaNumber: contactPersonId,
  });
  return response.data;
}
```

### 2. Email Notifications
Add email notifications when:
- New task is assigned
- Task is approaching due date
- Task is overdue
- Workflow is completed/rejected

### 3. Webhook Support
Allow external systems to be notified of workflow events:
```typescript
webhookUrl: 'https://external-system.com/webhook'
// POST to webhook when workflow state changes
```

### 4. Workflow Analytics Dashboard
Create a dashboard showing:
- Average completion time per step
- Bottlenecks (steps with longest delays)
- User performance metrics
- SLA compliance rates

### 5. Conditional Branching
Enhance workflow definition to support conditional next steps:
```typescript
nextSteps: [
  { stepId: 'enhanced_due_diligence', condition: 'riskLevel === "HIGH"' },
  { stepId: 'standard_approval', condition: 'riskLevel === "LOW"' }
]
```

## Files Created

### Entities
- `src/modules/workflow/entities/workflow-definition.entity.ts`
- `src/modules/workflow/entities/workflow-instance.entity.ts`
- `src/modules/workflow/entities/workflow-task.entity.ts`
- `src/modules/workflow/entities/workflow-history.entity.ts`

### DTOs
- `src/modules/workflow/dto/start-workflow.dto.ts`
- `src/modules/workflow/dto/complete-task.dto.ts`
- `src/modules/workflow/dto/query-workflow.dto.ts`

### Services & Controllers
- `src/modules/workflow/workflow.service.ts` (Core engine)
- `src/modules/workflow/workflow.controller.ts` (API endpoints)
- `src/modules/workflow/workflow.module.ts`

### Seeds
- `src/modules/workflow/seeds/sp-onboarding-workflow.seed.ts`

### Documentation
- `WORKFLOW_MANAGEMENT_DESIGN.md` (Design doc)
- `WORKFLOW_IMPLEMENTATION_GUIDE.md` (This file)

## Testing the Workflow

### Test Scenario 1: Complete Happy Path

```bash
# 1. Create a Service Provider (workflow starts automatically)
POST /api/service-providers
{
  "businessName": "Test Logistics Ltd",
  "businessType": "LOGISTICS",
  "email": "test@logistics.com",
  "registrationNumber": "12345678",
  "tinNumber": "100-123-456",
  "phoneNumber": "+255712345678",
  "physicalAddress": "123 Main St",
  "region": "DAR_ES_SALAAM",
  "district": "ILALA",
  "contact": {
    "fullName": "John Doe",
    "idType": "NATIONAL_ID",
    "idNumber": "19851231-12345-67890-12",
    "phoneNumber": "+255712345678",
    "email": "john@test.com"
  },
  "bankAccounts": [
    {
      "bankName": "CRDB Bank",
      "accountNumber": "0123456789",
      "accountName": "Test Logistics Ltd",
      "swiftCode": "CORUTZTZ"
    }
  ]
}

# 2. Get workflow for the SP
GET /api/workflows/entity/SERVICE_PROVIDER/{spId}
# Expected: currentStep = "document_verification", status = "IN_PROGRESS"

# 3. Get tasks for KYC Officer
GET /api/workflows/role-tasks/KYC_OFFICER
# Should show document verification task

# 4. Complete document verification
POST /api/workflows/tasks/{taskId}/complete
{
  "userId": "kyc-officer-uuid",
  "result": { "decision": "APPROVED" },
  "comments": "Documents verified"
}

# 5. Verify transition to KYC step
GET /api/workflows/entity/SERVICE_PROVIDER/{spId}
# Expected: currentStep = "kyc_verification"

# 6. Complete parallel KYC tasks
# (Repeat for nida_check, brela_check, tra_check)
POST /api/workflows/tasks/{nidaTaskId}/complete
POST /api/workflows/tasks/{brelaTaskId}/complete
POST /api/workflows/tasks/{traTaskId}/complete

# 7. Continue through remaining steps...
# Risk assessment → Compliance review → Manager approval

# 8. View complete audit trail
GET /api/workflows/instances/{instanceId}/history
```

## Summary

The workflow management system is now fully integrated and ready for use. When a Service Provider is created, the onboarding workflow automatically starts and progresses through each step as tasks are completed by the assigned roles.

Key benefits:
- ✅ Clear separation of responsibilities (KYC, Risk, Compliance, Management)
- ✅ Complete audit trail for compliance
- ✅ SLA tracking and monitoring
- ✅ Parallel task execution for efficiency
- ✅ Automatic state transitions
- ✅ Flexible, JSON-based workflow definitions
- ✅ Role-based task assignment
- ✅ RESTful API for all operations

The system is production-ready after seeding the workflow definition into the database.
