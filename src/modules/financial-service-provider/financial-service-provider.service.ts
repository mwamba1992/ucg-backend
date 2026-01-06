import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import {
  FinancialServiceProvider,
  FspStatus,
} from './entities/financial-service-provider.entity';
import { Payment, PaymentStatus } from '../payment/entities/payment.entity';
import { CreateFspDto } from './dto/create-fsp.dto';
import { UpdateFspDto } from './dto/update-fsp.dto';
import { QueryFspDto } from './dto/query-fsp.dto';
import { FspResponseDto } from './dto/fsp-response.dto';

@Injectable()
export class FinancialServiceProviderService {
  constructor(
    @InjectRepository(FinancialServiceProvider)
    private readonly fspRepository: Repository<FinancialServiceProvider>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
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
   * Get payment report for a specific FSP
   */
  async getPaymentReport(
    fspCode: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    fspCode: string;
    fspName: string;
    period: { startDate?: Date; endDate?: Date };
    summary: {
      totalPayments: number;
      totalAmount: number;
      successfulPayments: number;
      successfulAmount: number;
      failedPayments: number;
      failedAmount: number;
      pendingPayments: number;
      pendingAmount: number;
      successRate: number;
    };
    byStatus: Array<{ status: string; count: number; amount: number }>;
    byServiceProvider: Array<{
      spCode: string;
      count: number;
      amount: number;
    }>;
  }> {
    // Verify FSP exists
    const fsp = await this.fspRepository.findOne({
      where: { fspCode, deletedAt: IsNull() },
    });

    if (!fsp) {
      throw new NotFoundException(`FSP with code '${fspCode}' not found`);
    }

    // Build query for payments
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.fspCode = :fspCode', { fspCode });

    if (startDate) {
      queryBuilder.andWhere('payment.paidAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('payment.paidAt <= :endDate', { endDate });
    }

    const payments = await queryBuilder.getMany();

    // Calculate summary statistics
    const totalPayments = payments.length;
    const totalAmount = payments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0,
    );

    const successfulPayments = payments.filter(
      (p) => p.status === PaymentStatus.SUCCESS,
    );
    const successfulAmount = successfulPayments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0,
    );

    const failedPayments = payments.filter(
      (p) =>
        p.status === PaymentStatus.FAILED ||
        p.status === PaymentStatus.REVERSED,
    );
    const failedAmount = failedPayments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0,
    );

    const pendingPayments = payments.filter(
      (p) => p.status === PaymentStatus.PENDING,
    );
    const pendingAmount = pendingPayments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0,
    );

    const successRate =
      totalPayments > 0
        ? (successfulPayments.length / totalPayments) * 100
        : 0;

    // Group by status
    const byStatus = Object.values(PaymentStatus).map((status) => {
      const statusPayments = payments.filter((p) => p.status === status);
      return {
        status,
        count: statusPayments.length,
        amount: statusPayments.reduce((sum, p) => sum + Number(p.amountPaid), 0),
      };
    });

    // Group by service provider (using referenceNumber prefix)
    const spGroups = payments.reduce((acc, payment) => {
      const spCode = payment.referenceNumber?.split('-')[0] || 'UNKNOWN';
      if (!acc[spCode]) {
        acc[spCode] = { spCode, count: 0, amount: 0 };
      }
      acc[spCode].count++;
      acc[spCode].amount += Number(payment.amountPaid);
      return acc;
    }, {} as Record<string, { spCode: string; count: number; amount: number }>);

    return {
      fspCode: fsp.fspCode,
      fspName: fsp.name,
      period: { startDate, endDate },
      summary: {
        totalPayments,
        totalAmount,
        successfulPayments: successfulPayments.length,
        successfulAmount,
        failedPayments: failedPayments.length,
        failedAmount,
        pendingPayments: pendingPayments.length,
        pendingAmount,
        successRate: Number(successRate.toFixed(2)),
      },
      byStatus: byStatus.filter((s) => s.count > 0),
      byServiceProvider: Object.values(spGroups),
    };
  }

  /**
   * Get payment reports for all FSPs
   */
  async getAllFspReports(
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    Array<{
      fspCode: string;
      fspName: string;
      totalPayments: number;
      totalAmount: number;
      successfulPayments: number;
      successRate: number;
    }>
  > {
    const fsps = await this.fspRepository.find({
      where: { deletedAt: IsNull() },
    });

    const reports = await Promise.all(
      fsps.map(async (fsp) => {
        const queryBuilder = this.paymentRepository
          .createQueryBuilder('payment')
          .where('payment.fspCode = :fspCode', { fspCode: fsp.fspCode });

        if (startDate) {
          queryBuilder.andWhere('payment.paidAt >= :startDate', {
            startDate,
          });
        }

        if (endDate) {
          queryBuilder.andWhere('payment.paidAt <= :endDate', { endDate });
        }

        const payments = await queryBuilder.getMany();

        const totalPayments = payments.length;
        const totalAmount = payments.reduce(
          (sum, p) => sum + Number(p.amountPaid),
          0,
        );

        const successfulPayments = payments.filter(
          (p) => p.status === PaymentStatus.SUCCESS,
        ).length;

        const successRate =
          totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

        return {
          fspCode: fsp.fspCode,
          fspName: fsp.name,
          totalPayments,
          totalAmount,
          successfulPayments,
          successRate: Number(successRate.toFixed(2)),
        };
      }),
    );

    return reports.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Get daily transaction trend for a specific FSP
   */
  async getDailyTransactionTrend(
    fspCode: string,
    days: number = 30,
  ): Promise<
    Array<{
      date: string;
      count: number;
      amount: number;
      successCount: number;
      failedCount: number;
    }>
  > {
    // Verify FSP exists
    const fsp = await this.fspRepository.findOne({
      where: { fspCode, deletedAt: IsNull() },
    });

    if (!fsp) {
      throw new NotFoundException(`FSP with code '${fspCode}' not found`);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.fspCode = :fspCode', { fspCode })
      .andWhere('payment.paidAt >= :startDate', { startDate })
      .getMany();

    // Group by date
    const dailyMap = new Map<
      string,
      {
        date: string;
        count: number;
        amount: number;
        successCount: number;
        failedCount: number;
      }
    >();

    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, {
        date: dateStr,
        count: 0,
        amount: 0,
        successCount: 0,
        failedCount: 0,
      });
    }

    // Aggregate payments
    payments.forEach((payment) => {
      const dateStr = payment.paidAt.toISOString().split('T')[0];
      const daily = dailyMap.get(dateStr);

      if (daily) {
        daily.count++;
        daily.amount += Number(payment.amountPaid);

        if (payment.status === PaymentStatus.SUCCESS) {
          daily.successCount++;
        } else if (
          payment.status === PaymentStatus.FAILED ||
          payment.status === PaymentStatus.REVERSED
        ) {
          daily.failedCount++;
        }
      }
    });

    return Array.from(dailyMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
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
