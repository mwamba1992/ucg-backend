import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThan, Between } from 'typeorm';
import { PaymentReference, ReferenceStatus, PaymentOption } from './entities/payment-reference.entity';
import { ReferenceBatch, BatchStatus } from './entities/reference-batch.entity';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
import { QueryReferenceDto } from './dto/query-reference.dto';
import { BulkCreateReferenceDto } from './dto/bulk-create-reference.dto';
import { BulkGenerateReferenceDto } from './dto/bulk-generate-reference.dto';
import { ReferenceProducer } from './reference.producer';
import * as crypto from 'crypto';

@Injectable()
export class ReferenceService {
  constructor(
    @InjectRepository(PaymentReference)
    private readonly referenceRepository: Repository<PaymentReference>,
    @InjectRepository(ReferenceBatch)
    private readonly batchRepository: Repository<ReferenceBatch>,
    @Inject(forwardRef(() => ReferenceProducer))
    private readonly referenceProducer: ReferenceProducer,
  ) {}

  /**
   * Generate unique reference number
   * Format: XXX-YYYYYYY-ZZZ
   * XXX = SP Code (from service provider)
   * YYYYYYY = Sequential number (7 digits)
   * ZZZ = Checksum (3 characters)
   */
  private async generateReferenceNumber(spCode: string): Promise<string> {
    // Get the last reference for this SP to determine sequence
    const lastReference = await this.referenceRepository.findOne({
      where: { serviceProviderId: spCode },
      order: { createdAt: 'DESC' },
    });

    let sequence = 1;
    if (lastReference) {
      // Extract sequence from last reference (XXX-YYYYYYY-ZZZ)
      const parts = lastReference.referenceNumber.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[1]) + 1;
      }
    }

    const sequenceStr = sequence.toString().padStart(7, '0');
    const checksum = this.generateChecksum(spCode, sequenceStr);

    return `${spCode}-${sequenceStr}-${checksum}`;
  }

  /**
   * Generate checksum for reference validation
   */
  private generateChecksum(spCode: string, sequence: string): string {
    const input = `${spCode}${sequence}`;
    const hash = crypto.createHash('md5').update(input).digest('hex');
    return hash.substring(0, 3).toUpperCase();
  }

  /**
   * Validate reference number format and checksum
   */
  validateReferenceFormat(referenceNumber: string): boolean {
    const pattern = /^[A-Z0-9]{3}-\d{7}-[A-Z0-9]{3}$/;
    if (!pattern.test(referenceNumber)) {
      return false;
    }

    const parts = referenceNumber.split('-');
    const [spCode, sequence, providedChecksum] = parts;

    const calculatedChecksum = this.generateChecksum(spCode, sequence);
    return calculatedChecksum === providedChecksum;
  }

  /**
   * Create a new payment reference
   */
  async create(createDto: CreateReferenceDto): Promise<PaymentReference> {
    // Get SP code from service provider (assuming it's passed or fetched)
    // For now, extract from serviceProviderId (in real scenario, fetch from SP table)
    const spCode = createDto.serviceProviderId.substring(0, 3).toUpperCase();

    // Generate reference number
    const referenceNumber = await this.generateReferenceNumber(spCode);

    // Set default expiry if not provided (30 days from now)
    const expiresAt = createDto.expiresAt
      ? new Date(createDto.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const reference = this.referenceRepository.create({
      ...createDto,
      referenceNumber,
      expiresAt,
      currency: createDto.currency || 'TZS',
      paymentOption: createDto.paymentOption || PaymentOption.COMPLETE,
      status: ReferenceStatus.ACTIVE,
    });

    return await this.referenceRepository.save(reference);
  }

  /**
   * Bulk create references
   */
  async bulkCreate(bulkDto: BulkCreateReferenceDto) {
    const results = {
      totalRequested: bulkDto.references.length,
      successCount: 0,
      failureCount: 0,
      createdReferences: [],
      errors: [],
    };

    for (let i = 0; i < bulkDto.references.length; i++) {
      try {
        const reference = await this.create(bulkDto.references[i]);
        results.createdReferences.push({
          id: reference.id,
          referenceNumber: reference.referenceNumber,
          customerName: reference.customerName,
          amount: reference.amount,
        });
        results.successCount++;
      } catch (error) {
        results.errors.push({
          index: i,
          error: error.message,
        });
        results.failureCount++;
      }
    }

    return results;
  }

  /**
   * Get all references with filters and pagination
   */
  async findAll(query: QueryReferenceDto) {
    const { page = 1, limit = 10, serviceProviderId, status, search, customerPhone, includeExpired = false } = query;

    const where: FindOptionsWhere<PaymentReference> = {};

    if (serviceProviderId) {
      where.serviceProviderId = serviceProviderId;
    }

    if (status) {
      where.status = status;
    }

    if (customerPhone) {
      where.customerPhone = customerPhone;
    }

    const queryBuilder = this.referenceRepository
      .createQueryBuilder('ref')
      .leftJoinAndSelect('ref.serviceProvider', 'serviceProvider')
      .where(where);

    // Search functionality
    if (search) {
      queryBuilder.andWhere(
        '(ref.customerName ILIKE :search OR ref.customerPhone ILIKE :search OR ref.referenceNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Exclude expired unless specifically requested
    if (!includeExpired) {
      queryBuilder.andWhere(
        '(ref.expiresAt IS NULL OR ref.expiresAt > :now)',
        { now: new Date() },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by creation date
    queryBuilder.orderBy('ref.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(ref => this.toResponseDto(ref)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get reference by ID
   */
  async findOne(id: string): Promise<PaymentReference> {
    const reference = await this.referenceRepository.findOne({
      where: { id },
      relations: ['serviceProvider'],
    });

    if (!reference) {
      throw new NotFoundException(`Payment reference with ID ${id} not found`);
    }

    return reference;
  }

  /**
   * Get reference by reference number (with optional SP filtering for security)
   */
  async findByReferenceNumber(
    referenceNumber: string,
    serviceProviderId?: string,
  ): Promise<PaymentReference | null> {
    const where: FindOptionsWhere<PaymentReference> = { referenceNumber };

    // Filter by SP if provided (for security)
    if (serviceProviderId) {
      where.serviceProviderId = serviceProviderId;
    }

    const reference = await this.referenceRepository.findOne({
      where,
      relations: ['serviceProvider'],
    });

    return reference;
  }

  /**
   * Validate a reference
   */
  async validate(referenceNumber: string, serviceProviderId?: string) {
    // First check format
    if (!this.validateReferenceFormat(referenceNumber)) {
      return {
        isValid: false,
        referenceNumber,
        status: null,
        reason: 'Invalid reference format',
        validationChecks: {
          formatValid: false,
          checksumValid: false,
          notExpired: false,
          notUsed: false,
          notCancelled: false,
        },
      };
    }

    // Find reference in database
    const reference = await this.findByReferenceNumber(referenceNumber, serviceProviderId);

    if (!reference) {
      return {
        isValid: false,
        referenceNumber,
        status: null,
        reason: 'Reference not found',
        validationChecks: {
          formatValid: true,
          checksumValid: true,
          notExpired: false,
          notUsed: false,
          notCancelled: false,
        },
      };
    }

    // Update validation attempts
    reference.validationAttempts += 1;
    reference.lastValidatedAt = new Date();
    await this.referenceRepository.save(reference);

    const isExpired = reference.isExpired();
    const isUsed = reference.status === ReferenceStatus.USED;
    const isCancelled = reference.status === ReferenceStatus.CANCELLED;

    const isValid = !isExpired && !isUsed && !isCancelled;

    let reason = 'Valid reference';
    if (isUsed) reason = 'Reference already used';
    else if (isCancelled) reason = 'Reference has been cancelled';
    else if (isExpired) reason = 'Reference has expired';

    // Auto-expire if needed
    if (isExpired && reference.status === ReferenceStatus.ACTIVE) {
      reference.status = ReferenceStatus.EXPIRED;
      await this.referenceRepository.save(reference);
    }

    const daysUntilExpiry = reference.expiresAt
      ? Math.ceil((reference.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      isValid,
      referenceNumber,
      status: reference.status,
      expiresAt: reference.expiresAt,
      daysUntilExpiry,
      reason,
      validationChecks: {
        formatValid: true,
        checksumValid: true,
        notExpired: !isExpired,
        notUsed: !isUsed,
        notCancelled: !isCancelled,
      },
      ...(isUsed && {
        usedAt: reference.usedAt,
        transactionId: reference.transactionId,
      }),
    };
  }

  /**
   * Update reference
   */
  async update(id: string, updateDto: UpdateReferenceDto): Promise<PaymentReference> {
    const reference = await this.findOne(id);

    // Prevent updating used or expired references
    if (reference.status === ReferenceStatus.USED) {
      throw new BadRequestException('Cannot update a used reference');
    }

    Object.assign(reference, updateDto);

    if (updateDto.expiresAt) {
      reference.expiresAt = new Date(updateDto.expiresAt);
    }

    return await this.referenceRepository.save(reference);
  }

  /**
   * Cancel a reference (by reference number with SP validation)
   */
  async cancel(
    referenceNumber: string,
    serviceProviderId?: string,
    reason?: string,
  ): Promise<PaymentReference> {
    const reference = await this.findByReferenceNumber(referenceNumber, serviceProviderId);

    if (!reference) {
      throw new NotFoundException('Reference not found');
    }

    if (reference.status === ReferenceStatus.USED) {
      throw new BadRequestException('Cannot cancel a used reference');
    }

    reference.status = ReferenceStatus.CANCELLED;

    if (reason) {
      reference.metadata = {
        ...reference.metadata,
        cancelReason: reason,
        cancelledAt: new Date().toISOString(),
      };
    }

    return await this.referenceRepository.save(reference);
  }

  /**
   * Mark reference as used (called when payment is processed)
   */
  async markAsUsed(id: string, transactionId: string): Promise<PaymentReference> {
    const reference = await this.findOne(id);

    if (reference.status === ReferenceStatus.USED) {
      throw new ConflictException('Reference already used');
    }

    if (!reference.isValid()) {
      throw new BadRequestException('Reference is not valid');
    }

    reference.status = ReferenceStatus.USED;
    reference.usedAt = new Date();
    reference.transactionId = transactionId;

    return await this.referenceRepository.save(reference);
  }

  /**
   * Auto-expire old references (can be run as a cron job)
   */
  async expireOldReferences(): Promise<number> {
    const result = await this.referenceRepository.update(
      {
        status: ReferenceStatus.ACTIVE,
        expiresAt: LessThan(new Date()),
      },
      {
        status: ReferenceStatus.EXPIRED,
      },
    );

    return result.affected || 0;
  }

  /**
   * Get statistics
   */
  async getStatistics(
    serviceProviderId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: FindOptionsWhere<PaymentReference> = {};

    if (serviceProviderId) {
      where.serviceProviderId = serviceProviderId;
    }

    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }

    const [total, active, used, expired, cancelled] = await Promise.all([
      this.referenceRepository.count({ where }),
      this.referenceRepository.count({ where: { ...where, status: ReferenceStatus.ACTIVE } }),
      this.referenceRepository.count({ where: { ...where, status: ReferenceStatus.USED } }),
      this.referenceRepository.count({ where: { ...where, status: ReferenceStatus.EXPIRED } }),
      this.referenceRepository.count({ where: { ...where, status: ReferenceStatus.CANCELLED } }),
    ]);

    // Get amount statistics if serviceProviderId is provided
    let amounts = {
      totalAmount: 0,
      collectedAmount: 0,
      pendingAmount: 0,
      expiredAmount: 0,
      currency: 'TZS',
    };

    if (serviceProviderId) {
      const amountQuery = await this.referenceRepository
        .createQueryBuilder('ref')
        .select('SUM(ref.amount)', 'total')
        .addSelect(
          'SUM(CASE WHEN ref.status = :used THEN ref.amount ELSE 0 END)',
          'collected',
        )
        .addSelect(
          'SUM(CASE WHEN ref.status = :active THEN ref.amount ELSE 0 END)',
          'pending',
        )
        .where('ref.serviceProviderId = :serviceProviderId', { serviceProviderId })
        .setParameter('used', ReferenceStatus.USED)
        .setParameter('active', ReferenceStatus.ACTIVE)
        .getRawOne();

      amounts = {
        totalAmount: parseFloat(amountQuery.total) || 0,
        collectedAmount: parseFloat(amountQuery.collected) || 0,
        pendingAmount: parseFloat(amountQuery.pending) || 0,
        expiredAmount: 0,
        currency: 'TZS',
      };
    }

    const period = {
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate || new Date(),
    };

    return {
      period,
      summary: {
        totalGenerated: total,
        active,
        used,
        expired,
        cancelled,
      },
      amounts,
      trends: {
        generatedToday: 0,
        collectedToday: 0,
        averagePerDay: total / 30,
        collectionRate: total > 0 ? ((used / total) * 100).toFixed(2) : 0,
      },
    };
  }

  /**
   * Convert entity to response DTO
   */
  toResponseDto(reference: PaymentReference): any {
    return {
      id: reference.id,
      referenceNumber: reference.referenceNumber,
      serviceProviderId: reference.serviceProviderId,
      serviceProviderName: reference.serviceProvider?.businessName,
      customerName: reference.customerName,
      customerPhone: reference.customerPhone,
      amount: reference.amount,
      description: reference.description,
      currency: reference.currency,
      paymentOption: reference.paymentOption,
      totalPaid: reference.totalPaid,
      remainingAmount: reference.getRemainingAmount(),
      installmentCount: reference.installmentCount,
      isFullyPaid: reference.isFullyPaid(),
      expiresAt: reference.expiresAt,
      status: reference.status,
      metadata: reference.metadata,
      usedAt: reference.usedAt,
      transactionId: reference.transactionId,
      isValid: reference.isValid(),
      isExpired: reference.isExpired(),
      createdAt: reference.createdAt,
      updatedAt: reference.updatedAt,
    };
  }

  // ========== SP-SPECIFIC METHODS ==========

  /**
   * Bulk generate references (asynchronous processing)
   * Creates a batch job and processes references in background
   */
  async bulkGenerate(
    serviceProviderId: string,
    bulkDto: BulkGenerateReferenceDto,
  ): Promise<ReferenceBatch> {
    // Create batch record
    const batchId = `batch-${crypto.randomUUID()}`;
    const batch = this.batchRepository.create({
      batchId,
      serviceProviderId,
      status: BatchStatus.PENDING,
      totalRequested: bulkDto.references.length,
      successCount: 0,
      failureCount: 0,
      processingCount: 0,
      estimatedCompletionTime: new Date(
        Date.now() + bulkDto.references.length * 100, // ~100ms per reference
      ),
      metadata: {
        defaultExpiryDays: bulkDto.defaultExpiryDays,
        notifyCustomers: bulkDto.notifyCustomers,
      },
    });

    const savedBatch = await this.batchRepository.save(batch);

    // Process references asynchronously (in production, use a queue like Bull/BullMQ)
    this.processBatchAsync(savedBatch.id, serviceProviderId, bulkDto).catch((error) => {
      console.error(`Error processing batch ${batchId}:`, error);
    });

    return savedBatch;
  }

  /**
   * Process batch asynchronously (would use queue in production)
   */
  private async processBatchAsync(
    batchId: string,
    serviceProviderId: string,
    bulkDto: BulkGenerateReferenceDto,
  ): Promise<void> {
    // Update batch status to PROCESSING
    await this.batchRepository.update(batchId, {
      status: BatchStatus.PROCESSING,
      startedAt: new Date(),
    });

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    // Process each reference
    for (const refDto of bulkDto.references) {
      try {
        const createDto: CreateReferenceDto = {
          ...refDto,
          serviceProviderId,
        };

        // Set expiry if not provided
        if (!createDto.expiresAt && bulkDto.defaultExpiryDays) {
          createDto.expiresAt = this.calculateExpiry(bulkDto.defaultExpiryDays);
        }

        const reference = await this.create(createDto);

        results.push({
          status: 'SUCCESS',
          referenceNumber: reference.referenceNumber,
          customerName: reference.customerName,
          customerPhone: reference.customerPhone,
          amount: reference.amount,
        });
        successCount++;
      } catch (error) {
        results.push({
          status: 'FAILED',
          customerName: refDto.customerName,
          error: error.message,
        });
        failureCount++;
      }
    }

    // Save results to file (in production, save to S3/MinIO)
    const resultFileUrl = await this.saveResultsToFile(batchId, results);

    // Update batch with final status
    const finalStatus =
      failureCount === 0
        ? BatchStatus.COMPLETED
        : successCount === 0
        ? BatchStatus.FAILED
        : BatchStatus.PARTIAL;

    await this.batchRepository.update(batchId, {
      status: finalStatus,
      successCount,
      failureCount,
      processingCount: 0,
      completedAt: new Date(),
      resultFileUrl,
    });

    // Send webhook notification (in production)
    // await this.sendWebhookNotification(serviceProviderId, batchId);
  }

  /**
   * Get batch status
   */
  async getBatchStatus(
    batchId: string,
    serviceProviderId: string,
  ): Promise<ReferenceBatch | null> {
    const batch = await this.batchRepository.findOne({
      where: { batchId, serviceProviderId },
    });

    return batch;
  }

  /**
   * Download bulk results
   */
  async downloadBulkResults(
    batchId: string,
    serviceProviderId: string,
    format: 'csv' | 'json',
  ): Promise<any> {
    const batch = await this.getBatchStatus(batchId, serviceProviderId);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (!batch.isComplete()) {
      throw new BadRequestException('Batch processing is not yet complete');
    }

    // In production, read from S3/MinIO
    // For now, return mock data
    if (format === 'json') {
      return {
        batchId: batch.batchId,
        results: [], // Would fetch from file storage
      };
    } else {
      // Return CSV content
      return 'Reference Number,Customer Name,Status\n'; // Would generate from file
    }
  }

  /**
   * Find all references for a service provider
   */
  async findAllForSp(
    serviceProviderId: string,
    query: QueryReferenceDto,
  ): Promise<{ items: PaymentReference[]; total: number }> {
    const { page = 1, limit = 20, status, search } = query;

    const queryBuilder = this.referenceRepository
      .createQueryBuilder('ref')
      .leftJoinAndSelect('ref.serviceProvider', 'sp')
      .where('ref.serviceProviderId = :serviceProviderId', { serviceProviderId });

    if (status) {
      queryBuilder.andWhere('ref.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(ref.customerName ILIKE :search OR ref.customerPhone ILIKE :search OR ref.referenceNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit).orderBy('ref.createdAt', 'DESC');

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  /**
   * Extend reference expiry
   */
  async extendExpiry(
    referenceNumber: string,
    serviceProviderId: string,
    additionalDays: number,
  ): Promise<PaymentReference> {
    const reference = await this.findByReferenceNumber(referenceNumber, serviceProviderId);

    if (!reference) {
      throw new NotFoundException('Reference not found');
    }

    if (reference.status !== ReferenceStatus.ACTIVE) {
      throw new BadRequestException('Can only extend active references');
    }

    const currentExpiry = reference.expiresAt || new Date();
    reference.expiresAt = new Date(
      currentExpiry.getTime() + additionalDays * 24 * 60 * 60 * 1000,
    );

    return await this.referenceRepository.save(reference);
  }

  // ========== ASYNC RABBITMQ METHODS ==========

  /**
   * Create reference asynchronously using RabbitMQ
   * Returns immediately with request ID, actual creation happens in the background
   */
  async createAsync(createDto: CreateReferenceDto, useQueue: boolean = false): Promise<any> {
    if (!useQueue) {
      // Synchronous creation (default behavior)
      return await this.create(createDto);
    }

    // Asynchronous creation via RabbitMQ
    const requestId = crypto.randomUUID();

    const message = {
      ...createDto,
      requestId,
    };

    // Queue the reference creation (fire-and-forget)
    this.referenceProducer.emitReferenceCreated(message);

    return {
      status: 'QUEUED',
      requestId,
      message: 'Reference creation queued. Processing will complete shortly.',
    };
  }

  /**
   * Bulk create references asynchronously using RabbitMQ
   * Returns immediately with request ID, actual creation happens in the background
   */
  async bulkCreateAsync(serviceProviderId: string, bulkDto: BulkGenerateReferenceDto, useQueue: boolean = true): Promise<any> {
    if (!useQueue) {
      // Synchronous bulk creation
      return await this.bulkGenerate(serviceProviderId, bulkDto);
    }

    // Asynchronous creation via RabbitMQ
    const requestId = crypto.randomUUID();

    const message = {
      serviceProviderId,
      references: bulkDto.references.map(ref => ({
        ...ref,
        paymentOption: ref.paymentOption || PaymentOption.COMPLETE,
      })),
      requestId,
    };

    // Queue the bulk reference generation (fire-and-forget)
    this.referenceProducer.emitBulkReferenceGeneration(message);

    return {
      status: 'QUEUED',
      requestId,
      totalRequested: bulkDto.references.length,
      message: 'Bulk reference generation queued. Processing will complete shortly.',
      estimatedCompletionTime: new Date(Date.now() + bulkDto.references.length * 100),
    };
  }

  /**
   * Validate reference asynchronously using RabbitMQ
   * Useful when you need validation but don't need immediate result
   */
  async validateAsync(referenceNumber: string, useQueue: boolean = false): Promise<any> {
    if (!useQueue) {
      // Synchronous validation (default behavior)
      return await this.validate(referenceNumber);
    }

    // Asynchronous validation via RabbitMQ
    const requestId = crypto.randomUUID();

    const message = {
      referenceNumber,
      requestId,
    };

    try {
      // Queue validation and wait for response
      const response = await this.referenceProducer.queueReferenceValidation(message);

      return {
        status: 'COMPLETED',
        requestId,
        validation: response,
      };
    } catch (error) {
      return {
        status: 'ERROR',
        requestId,
        error: error.message,
      };
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Calculate expiry date
   */
  private calculateExpiry(days: number = 30): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Save results to file (mock implementation)
   * In production, save to S3/MinIO
   */
  private async saveResultsToFile(batchId: string, results: any[]): Promise<string> {
    // Mock URL - in production, upload to file storage
    return `https://storage.ucg.mhb.co.tz/batches/${batchId}/results.json`;
  }
}
