import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThan } from 'typeorm';
import { PaymentReference, ReferenceStatus } from './entities/payment-reference.entity';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
import { QueryReferenceDto } from './dto/query-reference.dto';
import { BulkCreateReferenceDto } from './dto/bulk-create-reference.dto';
import * as crypto from 'crypto';

@Injectable()
export class ReferenceService {
  constructor(
    @InjectRepository(PaymentReference)
    private readonly referenceRepository: Repository<PaymentReference>,
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
   * Get reference by reference number
   */
  async findByReferenceNumber(referenceNumber: string): Promise<PaymentReference> {
    const reference = await this.referenceRepository.findOne({
      where: { referenceNumber },
      relations: ['serviceProvider'],
    });

    if (!reference) {
      throw new NotFoundException(`Payment reference ${referenceNumber} not found`);
    }

    return reference;
  }

  /**
   * Validate a reference
   */
  async validate(referenceNumber: string) {
    // First check format
    if (!this.validateReferenceFormat(referenceNumber)) {
      return {
        isValid: false,
        referenceNumber,
        reason: 'Invalid reference format',
      };
    }

    // Find reference in database
    const reference = await this.referenceRepository.findOne({
      where: { referenceNumber },
      relations: ['serviceProvider'],
    });

    if (!reference) {
      return {
        isValid: false,
        referenceNumber,
        reason: 'Reference not found',
      };
    }

    // Update validation attempts
    reference.validationAttempts += 1;
    reference.lastValidatedAt = new Date();
    await this.referenceRepository.save(reference);

    // Check if already used
    if (reference.status === ReferenceStatus.USED) {
      return {
        isValid: false,
        referenceNumber,
        reason: 'Reference already used',
        reference: this.toResponseDto(reference),
      };
    }

    // Check if cancelled
    if (reference.status === ReferenceStatus.CANCELLED) {
      return {
        isValid: false,
        referenceNumber,
        reason: 'Reference has been cancelled',
        reference: this.toResponseDto(reference),
      };
    }

    // Check if expired
    if (reference.isExpired()) {
      // Auto-update status to expired
      reference.status = ReferenceStatus.EXPIRED;
      await this.referenceRepository.save(reference);

      return {
        isValid: false,
        referenceNumber,
        reason: 'Reference has expired',
        reference: this.toResponseDto(reference),
      };
    }

    // Valid reference
    return {
      isValid: true,
      referenceNumber,
      reference: this.toResponseDto(reference),
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
   * Cancel a reference
   */
  async cancel(id: string): Promise<PaymentReference> {
    const reference = await this.findOne(id);

    if (reference.status === ReferenceStatus.USED) {
      throw new BadRequestException('Cannot cancel a used reference');
    }

    reference.status = ReferenceStatus.CANCELLED;

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
  async getStatistics(serviceProviderId?: string) {
    const where: FindOptionsWhere<PaymentReference> = serviceProviderId
      ? { serviceProviderId }
      : {};

    const [total, active, used, expired, cancelled] = await Promise.all([
      this.referenceRepository.count({ where }),
      this.referenceRepository.count({ where: { ...where, status: ReferenceStatus.ACTIVE } }),
      this.referenceRepository.count({ where: { ...where, status: ReferenceStatus.USED } }),
      this.referenceRepository.count({ where: { ...where, status: ReferenceStatus.EXPIRED } }),
      this.referenceRepository.count({ where: { ...where, status: ReferenceStatus.CANCELLED } }),
    ]);

    return {
      total,
      active,
      used,
      expired,
      cancelled,
    };
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(reference: PaymentReference): any {
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
}
