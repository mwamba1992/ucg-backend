import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull } from 'typeorm';
import {
  FinancialServiceProvider,
  FspStatus,
} from './entities/financial-service-provider.entity';
import { CreateFspDto } from './dto/create-fsp.dto';
import { UpdateFspDto } from './dto/update-fsp.dto';
import { QueryFspDto } from './dto/query-fsp.dto';
import { FspResponseDto } from './dto/fsp-response.dto';

@Injectable()
export class FinancialServiceProviderService {
  constructor(
    @InjectRepository(FinancialServiceProvider)
    private readonly fspRepository: Repository<FinancialServiceProvider>,
  ) {}

  /**
   * Create a new Financial Service Provider
   */
  async create(createDto: CreateFspDto): Promise<FspResponseDto> {
    // Check if FSP code already exists
    const existing = await this.fspRepository.findOne({
      where: { fspCode: createDto.fspCode },
    });

    if (existing) {
      throw new ConflictException(
        `FSP with code '${createDto.fspCode}' already exists`,
      );
    }

    const fsp = this.fspRepository.create({
      ...createDto,
      status: FspStatus.ACTIVE,
    });

    const saved = await this.fspRepository.save(fsp);
    return this.toResponseDto(saved);
  }

  /**
   * Find all FSPs with filtering and pagination
   */
  async findAll(query: QueryFspDto): Promise<{
    items: FspResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { type, status, search, page = 1, limit = 20 } = query;

    const where: any = {
      deletedAt: IsNull(),
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const queryBuilder = this.fspRepository.createQueryBuilder('fsp');
    queryBuilder.where(where);

    if (search) {
      queryBuilder.andWhere(
        '(fsp.name ILIKE :search OR fsp.shortName ILIKE :search OR fsp.fspCode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('fsp.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items: items.map((fsp) => this.toResponseDto(fsp)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find one FSP by ID
   */
  async findOne(id: string): Promise<FspResponseDto> {
    const fsp = await this.fspRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!fsp) {
      throw new NotFoundException(`FSP with ID '${id}' not found`);
    }

    return this.toResponseDto(fsp);
  }

  /**
   * Find FSP by FSP code
   */
  async findByFspCode(fspCode: string): Promise<FspResponseDto> {
    const fsp = await this.fspRepository.findOne({
      where: { fspCode, deletedAt: IsNull() },
    });

    if (!fsp) {
      throw new NotFoundException(`FSP with code '${fspCode}' not found`);
    }

    return this.toResponseDto(fsp);
  }

  /**
   * Update FSP
   */
  async update(id: string, updateDto: UpdateFspDto): Promise<FspResponseDto> {
    const fsp = await this.fspRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!fsp) {
      throw new NotFoundException(`FSP with ID '${id}' not found`);
    }

    Object.assign(fsp, updateDto);
    const updated = await this.fspRepository.save(fsp);

    return this.toResponseDto(updated);
  }

  /**
   * Activate FSP
   */
  async activate(id: string): Promise<FspResponseDto> {
    const fsp = await this.fspRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!fsp) {
      throw new NotFoundException(`FSP with ID '${id}' not found`);
    }

    fsp.status = FspStatus.ACTIVE;
    const updated = await this.fspRepository.save(fsp);

    return this.toResponseDto(updated);
  }

  /**
   * Deactivate FSP
   */
  async deactivate(id: string): Promise<FspResponseDto> {
    const fsp = await this.fspRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!fsp) {
      throw new NotFoundException(`FSP with ID '${id}' not found`);
    }

    fsp.status = FspStatus.INACTIVE;
    const updated = await this.fspRepository.save(fsp);

    return this.toResponseDto(updated);
  }

  /**
   * Suspend FSP
   */
  async suspend(id: string, reason?: string): Promise<FspResponseDto> {
    const fsp = await this.fspRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!fsp) {
      throw new NotFoundException(`FSP with ID '${id}' not found`);
    }

    fsp.status = FspStatus.SUSPENDED;
    if (reason) {
      fsp.metadata = {
        ...fsp.metadata,
        suspensionReason: reason,
        suspendedAt: new Date(),
      };
    }
    const updated = await this.fspRepository.save(fsp);

    return this.toResponseDto(updated);
  }

  /**
   * Soft delete FSP
   */
  async remove(id: string): Promise<void> {
    const fsp = await this.fspRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!fsp) {
      throw new NotFoundException(`FSP with ID '${id}' not found`);
    }

    fsp.deletedAt = new Date();
    await this.fspRepository.save(fsp);
  }

  /**
   * Get FSP statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byType: { type: string; count: number }[];
    byStatus: { status: string; count: number }[];
    totalTransactions: number;
    totalVolume: number;
  }> {
    const fsps = await this.fspRepository.find({
      where: { deletedAt: IsNull() },
    });

    const byType = fsps.reduce((acc, fsp) => {
      const existing = acc.find((item) => item.type === fsp.type);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ type: fsp.type, count: 1 });
      }
      return acc;
    }, [] as { type: string; count: number }[]);

    const byStatus = fsps.reduce((acc, fsp) => {
      const existing = acc.find((item) => item.status === fsp.status);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ status: fsp.status, count: 1 });
      }
      return acc;
    }, [] as { status: string; count: number }[]);

    const totalTransactions = fsps.reduce(
      (sum, fsp) => sum + Number(fsp.totalTransactions),
      0,
    );
    const totalVolume = fsps.reduce(
      (sum, fsp) => sum + Number(fsp.totalVolume),
      0,
    );

    return {
      total: fsps.length,
      byType,
      byStatus,
      totalTransactions,
      totalVolume,
    };
  }

  /**
   * Update transaction statistics
   */
  async updateTransactionStats(
    fspId: string,
    amount: number,
  ): Promise<void> {
    const fsp = await this.fspRepository.findOne({
      where: { id: fspId },
    });

    if (!fsp) {
      throw new NotFoundException(`FSP with ID '${fspId}' not found`);
    }

    fsp.totalTransactions = Number(fsp.totalTransactions) + 1;
    fsp.totalVolume = Number(fsp.totalVolume) + amount;
    fsp.lastTransactionAt = new Date();

    await this.fspRepository.save(fsp);
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(fsp: FinancialServiceProvider): FspResponseDto {
    return {
      id: fsp.id,
      fspCode: fsp.fspCode,
      name: fsp.name,
      shortName: fsp.shortName,
      type: fsp.type,
      status: fsp.status,
      phoneNumber: fsp.phoneNumber,
      email: fsp.email,
      physicalAddress: fsp.physicalAddress,
      website: fsp.website,
      swiftCode: fsp.swiftCode,
      bankCode: fsp.bankCode,
      mnoCode: fsp.mnoCode,
      ussdCode: fsp.ussdCode,
      apiBaseUrl: fsp.apiBaseUrl,
      callbackUrl: fsp.callbackUrl,
      webhookUrl: fsp.webhookUrl,
      glAccountNumber: fsp.glAccountNumber,
      glAccountName: fsp.glAccountName,
      glSettlementAccount: fsp.glSettlementAccount,
      glCommissionAccount: fsp.glCommissionAccount,
      glSuspenseAccount: fsp.glSuspenseAccount,
      glRevenueAccount: fsp.glRevenueAccount,
      glChargesAccount: fsp.glChargesAccount,
      transactionFeePercentage: fsp.transactionFeePercentage
        ? Number(fsp.transactionFeePercentage)
        : undefined,
      transactionFeeFixed: fsp.transactionFeeFixed
        ? Number(fsp.transactionFeeFixed)
        : undefined,
      settlementPeriodDays: fsp.settlementPeriodDays,
      totalTransactions: Number(fsp.totalTransactions),
      totalVolume: Number(fsp.totalVolume),
      lastTransactionAt: fsp.lastTransactionAt,
      logoUrl: fsp.logoUrl,
      description: fsp.description,
      metadata: fsp.metadata,
      createdAt: fsp.createdAt,
      updatedAt: fsp.updatedAt,
    };
  }
}
