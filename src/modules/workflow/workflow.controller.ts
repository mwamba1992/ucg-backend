import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { StartWorkflowDto } from './dto/start-workflow.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { RejectWorkflowDto } from './dto/reject-workflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

/**
 * Workflow Management Controller
 *
 * Manages workflow instances, tasks, and transitions for various entities
 * (Service Providers, Transactions, etc.)
 */
@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * Start a new workflow
   *
   * POST /api/v1/workflows/start
   */
  @Post('start')
  @ApiOperation({
    summary: 'Start a new workflow',
    description: 'Initiates a workflow for an entity (e.g., Service Provider onboarding)',
  })
  @ApiResponse({
    status: 201,
    description: 'Workflow started successfully',
    schema: {
      example: {
        id: 'uuid',
        entityType: 'SERVICE_PROVIDER',
        entityId: 'uuid',
        currentStep: 'document_verification',
        status: 'IN_PROGRESS',
        startedAt: '2025-11-07T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Workflow already in progress' })
  @ApiResponse({ status: 404, description: 'Workflow definition not found' })
  async startWorkflow(@Body() dto: StartWorkflowDto) {
    return await this.workflowService.startWorkflow(dto);
  }

  /**
   * Get my pending tasks
   *
   * GET /api/v1/workflows/my-tasks
   */
  @Get('my-tasks')
  @ApiOperation({
    summary: 'Get my pending tasks',
    description: 'Retrieves all tasks assigned to the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    schema: {
      example: [
        {
          id: 'uuid',
          taskName: 'Document Verification',
          status: 'PENDING',
          priority: 'HIGH',
          dueDate: '2025-11-08T10:00:00.000Z',
          workflowInstance: {
            id: 'uuid',
            entityType: 'SERVICE_PROVIDER',
            currentStep: 'document_verification',
          },
        },
      ],
    },
  })
  async getMyTasks(@CurrentUser() user: User) {
    return await this.workflowService.getMyTasks(user.id);
  }

  /**
   * Get tasks by role
   *
   * GET /api/v1/workflows/role-tasks/:role
   */
  @Get('role-tasks/:role')
  @ApiOperation({
    summary: 'Get tasks by role',
    description: 'Retrieves all tasks assigned to a specific role',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
  })
  async getTasksByRole(@Param('role') role: string) {
    return await this.workflowService.getTasksByRole(role);
  }

  /**
   * Complete a task
   *
   * POST /api/v1/workflows/tasks/:taskId/complete
   */
  @Post('tasks/:taskId/complete')
  @ApiOperation({
    summary: 'Complete a task',
    description: 'Marks a task as completed and potentially transitions the workflow to next step',
  })
  @ApiResponse({
    status: 200,
    description: 'Task completed successfully',
    schema: {
      example: {
        id: 'uuid',
        taskName: 'Document Verification',
        status: 'COMPLETED',
        completedAt: '2025-11-07T11:00:00.000Z',
        result: { approved: true, score: 95 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Task cannot be completed' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async completeTask(
    @Param('taskId') taskId: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: User,
  ) {
    return await this.workflowService.completeTask(taskId, user.id, dto);
  }

  /**
   * Get workflow instance details
   *
   * GET /api/v1/workflows/instances/:instanceId
   */
  @Get('instances/:instanceId')
  @ApiOperation({
    summary: 'Get workflow instance',
    description: 'Retrieves details of a specific workflow instance',
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow instance retrieved',
  })
  @ApiResponse({ status: 404, description: 'Workflow instance not found' })
  async getWorkflowInstance(@Param('instanceId') instanceId: string) {
    return await this.workflowService.findWorkflowInstance(instanceId);
  }

  /**
   * Get workflow by entity
   *
   * GET /api/v1/workflows/entity/:entityType/:entityId
   */
  @Get('entity/:entityType/:entityId')
  @ApiOperation({
    summary: 'Get workflow by entity',
    description: 'Retrieves the active workflow for a specific entity',
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow retrieved',
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflowByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const workflow = await this.workflowService.getWorkflowByEntity(entityType, entityId);

    if (!workflow) {
      return {
        message: 'No active workflow found for this entity',
        entityType,
        entityId,
      };
    }

    return workflow;
  }

  /**
   * Get workflow history
   *
   * GET /api/v1/workflows/instances/:instanceId/history
   */
  @Get('instances/:instanceId/history')
  @ApiOperation({
    summary: 'Get workflow history',
    description: 'Retrieves complete audit trail for a workflow instance',
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow history retrieved',
    schema: {
      example: [
        {
          action: 'WORKFLOW_STARTED',
          toStep: 'document_verification',
          createdAt: '2025-11-07T10:00:00.000Z',
        },
        {
          action: 'TASK_COMPLETED',
          fromStep: 'document_verification',
          performedBy: 'user-uuid',
          comments: 'All documents verified',
          createdAt: '2025-11-07T11:00:00.000Z',
        },
      ],
    },
  })
  async getWorkflowHistory(@Param('instanceId') instanceId: string) {
    return await this.workflowService.getWorkflowHistory(instanceId);
  }

  /**
   * Get workflow tasks
   *
   * GET /api/v1/workflows/instances/:instanceId/tasks
   */
  @Get('instances/:instanceId/tasks')
  @ApiOperation({
    summary: 'Get workflow tasks',
    description: 'Retrieves all tasks for a workflow instance',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved',
  })
  async getWorkflowTasks(@Param('instanceId') instanceId: string) {
    return await this.workflowService.getWorkflowTasks(instanceId);
  }

  /**
   * Reject workflow
   *
   * POST /api/v1/workflows/instances/:instanceId/reject
   */
  @Post('instances/:instanceId/reject')
  @ApiOperation({
    summary: 'Reject workflow',
    description: 'Rejects a workflow and cancels all pending tasks',
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow rejected',
  })
  @ApiResponse({ status: 400, description: 'Workflow cannot be rejected' })
  async rejectWorkflow(
    @Param('instanceId') instanceId: string,
    @Body() dto: RejectWorkflowDto,
    @CurrentUser() user: User,
  ) {
    return await this.workflowService.rejectWorkflow(instanceId, user.id, dto.reason);
  }

  /**
   * Get workflow statistics
   *
   * GET /api/v1/workflows/statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get workflow statistics',
    description: 'Retrieves workflow and task statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved',
    schema: {
      example: {
        workflows: {
          total: 150,
          inProgress: 45,
          completed: 95,
          rejected: 10,
          completionRate: '63.33',
        },
        tasks: {
          total: 450,
          pending: 75,
          overdue: 5,
        },
      },
    },
  })
  async getStatistics() {
    return await this.workflowService.getStatistics();
  }
}
