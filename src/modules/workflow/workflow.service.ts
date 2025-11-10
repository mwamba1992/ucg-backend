import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinition, WorkflowStep } from './entities/workflow-definition.entity';
import { WorkflowInstance, WorkflowStatus } from './entities/workflow-instance.entity';
import { WorkflowTask, TaskStatus, TaskType } from './entities/workflow-task.entity';
import { WorkflowHistory } from './entities/workflow-history.entity';
import { StartWorkflowDto } from './dto/start-workflow.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(WorkflowDefinition)
    private readonly workflowDefinitionRepository: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance)
    private readonly workflowInstanceRepository: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowTask)
    private readonly workflowTaskRepository: Repository<WorkflowTask>,
    @InjectRepository(WorkflowHistory)
    private readonly workflowHistoryRepository: Repository<WorkflowHistory>,
  ) {}

  /**
   * Start a new workflow for an entity
   */
  async startWorkflow(dto: StartWorkflowDto): Promise<WorkflowInstance> {
    this.logger.log(`Starting workflow "${dto.workflowName}" for ${dto.entityType}:${dto.entityId}`);

    // Get active workflow definition
    const definition = await this.getWorkflowDefinitionByName(dto.entityType, dto.workflowName);

    if (!definition) {
      throw new NotFoundException(
        `Workflow definition "${dto.workflowName}" not found for entity type "${dto.entityType}"`,
      );
    }

    // Check if workflow already exists for this entity
    const existingWorkflow = await this.workflowInstanceRepository.findOne({
      where: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        status: WorkflowStatus.IN_PROGRESS,
      },
    });

    if (existingWorkflow) {
      throw new BadRequestException(
        `Workflow already in progress for ${dto.entityType}:${dto.entityId}`,
      );
    }

    // Create workflow instance
    const firstStep = definition.getFirstStep();
    const instance = this.workflowInstanceRepository.create({
      workflowDefinitionId: definition.id,
      entityType: dto.entityType,
      entityId: dto.entityId,
      currentStep: firstStep.id,
      status: WorkflowStatus.IN_PROGRESS,
      startedAt: new Date(),
      metadata: dto.metadata || {},
    });

    const savedInstance = await this.workflowInstanceRepository.save(instance);

    // Create first task(s)
    await this.createTasksForStep(savedInstance, firstStep);

    // Log history
    await this.logHistory({
      workflowInstanceId: savedInstance.id,
      action: 'WORKFLOW_STARTED',
      toStep: firstStep.id,
      metadata: { workflowName: dto.workflowName },
    });

    this.logger.log(`Workflow ${savedInstance.id} started successfully`);

    return await this.findWorkflowInstance(savedInstance.id);
  }

  /**
   * Complete a task and potentially move to next step
   */
  async completeTask(
    taskId: string,
    userId: string,
    dto: CompleteTaskDto,
  ): Promise<WorkflowTask> {
    this.logger.log(`Completing task ${taskId} by user ${userId}`);

    const task = await this.workflowTaskRepository.findOne({
      where: { id: taskId },
      relations: ['workflowInstance'],
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (!task.canComplete()) {
      throw new BadRequestException(`Task ${taskId} cannot be completed (status: ${task.status})`);
    }

    // Mark task as completed
    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();
    task.completedBy = userId;
    task.result = dto.result;
    await this.workflowTaskRepository.save(task);

    // Log history
    await this.logHistory({
      workflowInstanceId: task.workflowInstanceId,
      taskId: task.id,
      action: 'TASK_COMPLETED',
      performedBy: userId,
      comments: dto.comments,
      metadata: { taskName: task.taskName, result: dto.result },
    });

    this.logger.log(`Task ${taskId} completed successfully`);

    // Check if all tasks in current step are complete
    await this.checkAndTransitionWorkflow(task.workflowInstance);

    return task;
  }

  /**
   * Check if all tasks in current step are complete and transition if needed
   */
  private async checkAndTransitionWorkflow(instance: WorkflowInstance): Promise<void> {
    const currentStepTasks = await this.workflowTaskRepository.find({
      where: {
        workflowInstanceId: instance.id,
        stepId: instance.currentStep,
      },
    });

    const allComplete = currentStepTasks.every(task => task.status === TaskStatus.COMPLETED);

    if (allComplete) {
      this.logger.log(`All tasks complete for step ${instance.currentStep}, transitioning...`);
      await this.transitionToNextStep(instance);
    } else {
      this.logger.log(
        `Step ${instance.currentStep} has pending tasks: ${currentStepTasks.filter(t => !t.isCompleted()).length} remaining`,
      );
    }
  }

  /**
   * Transition workflow to next step
   */
  private async transitionToNextStep(instance: WorkflowInstance): Promise<void> {
    const definition = await this.workflowDefinitionRepository.findOne({
      where: { id: instance.workflowDefinitionId },
    });

    if (!definition) {
      throw new NotFoundException('Workflow definition not found');
    }

    const currentStep = definition.getStep(instance.currentStep);

    if (!currentStep) {
      throw new NotFoundException(`Current step ${instance.currentStep} not found in definition`);
    }

    // Determine next step
    const nextStepId = this.determineNextStep(currentStep, instance);

    if (!nextStepId) {
      // Workflow complete
      await this.completeWorkflow(instance);
      return;
    }

    const nextStep = definition.getStep(nextStepId);

    if (!nextStep) {
      throw new NotFoundException(`Next step ${nextStepId} not found in definition`);
    }

    // Update instance
    const previousStep = instance.currentStep;
    instance.currentStep = nextStepId;
    await this.workflowInstanceRepository.save(instance);

    // Create tasks for next step
    await this.createTasksForStep(instance, nextStep);

    // Log transition
    await this.logHistory({
      workflowInstanceId: instance.id,
      action: 'STEP_TRANSITION',
      fromStep: previousStep,
      toStep: nextStepId,
      metadata: { nextStepName: nextStep.name },
    });

    this.logger.log(`Transitioned from ${previousStep} to ${nextStepId}`);
  }

  /**
   * Determine next step based on current step definition and task results
   */
  private determineNextStep(currentStep: WorkflowStep, instance: WorkflowInstance): string | null {
    // Simple implementation: return first next step
    // In production, this could have conditional logic based on task results
    if (currentStep.nextSteps && currentStep.nextSteps.length > 0) {
      return currentStep.nextSteps[0];
    }

    return null;
  }

  /**
   * Complete the workflow
   */
  private async completeWorkflow(instance: WorkflowInstance): Promise<void> {
    instance.status = WorkflowStatus.COMPLETED;
    instance.completedAt = new Date();
    await this.workflowInstanceRepository.save(instance);

    await this.logHistory({
      workflowInstanceId: instance.id,
      action: 'WORKFLOW_COMPLETED',
      fromStep: instance.currentStep,
    });

    this.logger.log(`Workflow ${instance.id} completed successfully`);

    // TODO: Send notification
  }

  /**
   * Create tasks for a workflow step
   */
  private async createTasksForStep(
    instance: WorkflowInstance,
    step: WorkflowStep,
  ): Promise<void> {
    if (step.type === 'PARALLEL_TASKS' && step.tasks) {
      // Create multiple tasks in parallel
      for (const subTask of step.tasks) {
        await this.createSingleTask(instance, step.id, subTask.name, step);
      }
    } else {
      // Create single task
      await this.createSingleTask(instance, step.id, step.name, step);
    }
  }

  /**
   * Create a single task
   */
  private async createSingleTask(
    instance: WorkflowInstance,
    stepId: string,
    taskName: string,
    step: WorkflowStep,
  ): Promise<WorkflowTask> {
    // Extract role or user from assignTo
    let assignedRole: string | null = null;
    let assignedTo: string | null = null;

    if (step.assignTo) {
      if (step.assignTo.startsWith('ROLE:')) {
        assignedRole = step.assignTo.replace('ROLE:', '');
      } else if (step.assignTo.startsWith('USER:')) {
        assignedTo = step.assignTo.replace('USER:', '');
      }
    }

    // Calculate due date from SLA
    const dueDate = step.sla
      ? new Date(Date.now() + step.sla * 60 * 60 * 1000)
      : null;

    const task = this.workflowTaskRepository.create({
      workflowInstanceId: instance.id,
      stepId,
      taskName,
      taskType: step.type as TaskType,
      assignedRole,
      assignedTo,
      status: TaskStatus.PENDING,
      dueDate,
      metadata: step.metadata || {},
    });

    const savedTask = await this.workflowTaskRepository.save(task);

    await this.logHistory({
      workflowInstanceId: instance.id,
      taskId: savedTask.id,
      action: 'TASK_CREATED',
      metadata: {
        taskName,
        assignedRole,
        assignedTo,
        dueDate,
      },
    });

    this.logger.log(`Created task ${savedTask.id} for step ${stepId}`);

    // TODO: Send notification to assignee

    return savedTask;
  }

  /**
   * Reject workflow
   */
  async rejectWorkflow(
    instanceId: string,
    userId: string,
    reason: string,
  ): Promise<WorkflowInstance> {
    this.logger.log(`Rejecting workflow ${instanceId} by user ${userId}`);

    const instance = await this.findWorkflowInstance(instanceId);

    if (!instance.canTransition()) {
      throw new BadRequestException('Workflow cannot be rejected in current state');
    }

    instance.status = WorkflowStatus.REJECTED;
    instance.completedAt = new Date();
    await this.workflowInstanceRepository.save(instance);

    // Cancel all pending tasks
    await this.workflowTaskRepository.update(
      {
        workflowInstanceId: instanceId,
        status: TaskStatus.PENDING,
      },
      {
        status: TaskStatus.CANCELLED,
      },
    );

    await this.logHistory({
      workflowInstanceId: instanceId,
      action: 'WORKFLOW_REJECTED',
      fromStep: instance.currentStep,
      performedBy: userId,
      comments: reason,
    });

    this.logger.log(`Workflow ${instanceId} rejected`);

    return instance;
  }

  /**
   * Get pending tasks for a user
   */
  async getMyTasks(userId: string): Promise<WorkflowTask[]> {
    return await this.workflowTaskRepository.find({
      where: [
        { assignedTo: userId, status: TaskStatus.PENDING },
        { assignedTo: userId, status: TaskStatus.IN_PROGRESS },
      ],
      relations: ['workflowInstance'],
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Get tasks by role
   */
  async getTasksByRole(role: string): Promise<WorkflowTask[]> {
    return await this.workflowTaskRepository.find({
      where: [
        { assignedRole: role, status: TaskStatus.PENDING },
        { assignedRole: role, status: TaskStatus.IN_PROGRESS },
      ],
      relations: ['workflowInstance'],
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Get workflow instance
   */
  async findWorkflowInstance(id: string): Promise<WorkflowInstance> {
    const instance = await this.workflowInstanceRepository.findOne({
      where: { id },
      relations: ['workflowDefinition'],
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found`);
    }

    return instance;
  }

  /**
   * Get workflow by entity
   */
  async getWorkflowByEntity(
    entityType: string,
    entityId: string,
  ): Promise<WorkflowInstance | null> {
    return await this.workflowInstanceRepository.findOne({
      where: {
        entityType,
        entityId,
        status: WorkflowStatus.IN_PROGRESS,
      },
      relations: ['workflowDefinition'],
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
   * Get workflow tasks
   */
  async getWorkflowTasks(instanceId: string): Promise<WorkflowTask[]> {
    return await this.workflowTaskRepository.find({
      where: { workflowInstanceId: instanceId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get workflow definition by name
   */
  private async getWorkflowDefinitionByName(
    entityType: string,
    name: string,
  ): Promise<WorkflowDefinition | null> {
    return await this.workflowDefinitionRepository.findOne({
      where: {
        entityType,
        name,
        isActive: true,
      },
      order: { version: 'DESC' },
    });
  }

  /**
   * Log workflow history
   */
  private async logHistory(data: {
    workflowInstanceId: string;
    taskId?: string;
    action: string;
    fromStep?: string;
    toStep?: string;
    performedBy?: string;
    comments?: string;
    metadata?: Record<string, any>;
  }): Promise<WorkflowHistory> {
    const history = this.workflowHistoryRepository.create(data);
    return await this.workflowHistoryRepository.save(history);
  }

  /**
   * Get workflow statistics
   */
  async getStatistics(): Promise<any> {
    const [total, inProgress, completed, rejected] = await Promise.all([
      this.workflowInstanceRepository.count(),
      this.workflowInstanceRepository.count({ where: { status: WorkflowStatus.IN_PROGRESS } }),
      this.workflowInstanceRepository.count({ where: { status: WorkflowStatus.COMPLETED } }),
      this.workflowInstanceRepository.count({ where: { status: WorkflowStatus.REJECTED } }),
    ]);

    const [totalTasks, pendingTasks, overdueTasks] = await Promise.all([
      this.workflowTaskRepository.count(),
      this.workflowTaskRepository.count({ where: { status: TaskStatus.PENDING } }),
      this.workflowTaskRepository
        .createQueryBuilder('task')
        .where('task.dueDate < :now', { now: new Date() })
        .andWhere('task.status = :status', { status: TaskStatus.PENDING })
        .getCount(),
    ]);

    return {
      workflows: {
        total,
        inProgress,
        completed,
        rejected,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
      },
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
      },
    };
  }
}
