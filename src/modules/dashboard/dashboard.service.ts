import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PaymentReference, ReferenceStatus } from '../reference/entities/payment-reference.entity';
import { Payment, PaymentStatus } from '../payment/entities/payment.entity';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';

export interface DashboardQuery {
  startDate?: Date;
  endDate?: Date;
  serviceProviderId?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(PaymentReference)
    private readonly referenceRepo: Repository<PaymentReference>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepo: Repository<ServiceProvider>,
  ) {}

  /**
   * Get comprehensive dashboard overview
   */
  async getOverview(query: DashboardQuery = {}) {
    const { startDate, endDate, serviceProviderId } = query;

    // Default to last 30 days if no dates provided
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const [
      referencesStats,
      paymentsStats,
      recentReferences,
      recentPayments,
      topServiceProviders,
      statusBreakdown,
    ] = await Promise.all([
      this.getReferencesStatistics(start, end, serviceProviderId),
      this.getPaymentsStatistics(start, end, serviceProviderId),
      this.getRecentReferences(10, serviceProviderId),
      this.getRecentPayments(10, serviceProviderId),
      this.getTopServiceProviders(5, start, end),
      this.getStatusBreakdown(start, end, serviceProviderId),
    ]);

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      references: referencesStats,
      payments: paymentsStats,
      recentActivity: {
        references: recentReferences,
        payments: recentPayments,
      },
      topServiceProviders,
      statusBreakdown,
      generatedAt: new Date(),
    };
  }

  /**
   * Get references statistics
   */
  private async getReferencesStatistics(
    startDate: Date,
    endDate: Date,
    serviceProviderId?: string,
  ) {
    // Amounts are derived from ref.totalPaid (incremented on every successful
    // payment), not from the reference status, so installments and partial
    // payments are counted as collected.
    const qb = this.referenceRepo
      .createQueryBuilder('ref')
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN ref.status = :active THEN 1 ELSE 0 END)',
        'active',
      )
      .addSelect('SUM(CASE WHEN ref.status = :used THEN 1 ELSE 0 END)', 'used')
      .addSelect(
        'SUM(CASE WHEN ref.status = :expired THEN 1 ELSE 0 END)',
        'expired',
      )
      .addSelect(
        'SUM(CASE WHEN ref.status = :cancelled THEN 1 ELSE 0 END)',
        'cancelled',
      )
      .addSelect(
        'SUM(CASE WHEN ref.totalPaid >= ref.amount THEN 1 ELSE 0 END)',
        'fullyPaid',
      )
      .addSelect(
        'SUM(CASE WHEN ref.totalPaid > 0 AND ref.totalPaid < ref.amount THEN 1 ELSE 0 END)',
        'partiallyPaid',
      )
      .addSelect('SUM(CASE WHEN ref.totalPaid = 0 THEN 1 ELSE 0 END)', 'unpaid')
      .addSelect('COALESCE(SUM(ref.amount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(ref.totalPaid), 0)', 'paidAmount')
      .addSelect(
        'COALESCE(SUM(CASE WHEN ref.status = :active THEN GREATEST(ref.amount - ref.totalPaid, 0) ELSE 0 END), 0)',
        'pendingAmount',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN ref.status = :expired THEN GREATEST(ref.amount - ref.totalPaid, 0) ELSE 0 END), 0)',
        'expiredAmount',
      )
      .where('ref.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .setParameters({
        active: ReferenceStatus.ACTIVE,
        used: ReferenceStatus.USED,
        expired: ReferenceStatus.EXPIRED,
        cancelled: ReferenceStatus.CANCELLED,
      });

    if (serviceProviderId) {
      qb.andWhere('ref.serviceProviderId = :serviceProviderId', {
        serviceProviderId,
      });
    }

    const raw = await qb.getRawOne();

    const total = parseInt(raw?.total || '0', 10);
    const totalAmount = parseFloat(raw?.totalAmount || '0');
    const paidAmount = parseFloat(raw?.paidAmount || '0');

    const collectionRate =
      totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(2) : '0.00';

    return {
      total,
      active: parseInt(raw?.active || '0', 10),
      used: parseInt(raw?.used || '0', 10),
      expired: parseInt(raw?.expired || '0', 10),
      cancelled: parseInt(raw?.cancelled || '0', 10),
      fullyPaid: parseInt(raw?.fullyPaid || '0', 10),
      partiallyPaid: parseInt(raw?.partiallyPaid || '0', 10),
      unpaid: parseInt(raw?.unpaid || '0', 10),
      amounts: {
        total: totalAmount,
        paid: paidAmount,
        pending: parseFloat(raw?.pendingAmount || '0'),
        expired: parseFloat(raw?.expiredAmount || '0'),
        currency: 'TZS',
      },
      collectionRate: parseFloat(collectionRate),
    };
  }

  /**
   * Get payments statistics
   */
  private async getPaymentsStatistics(
    startDate: Date,
    endDate: Date,
    serviceProviderId?: string,
  ) {
    const queryBuilder = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.reference', 'ref')
      .where('payment.paidAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (serviceProviderId) {
      queryBuilder.andWhere('ref.serviceProviderId = :serviceProviderId', {
        serviceProviderId,
      });
    }

    const [totalCount, successCount] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .clone()
        .andWhere('payment.status = :status', { status: PaymentStatus.SUCCESS })
        .getCount(),
    ]);

    // Get amount statistics
    const amountStats = await queryBuilder
      .clone()
      .select('SUM(payment.amountPaid)', 'totalAmount')
      .addSelect(
        'SUM(CASE WHEN payment.status = :success THEN payment.amountPaid ELSE 0 END)',
        'successAmount',
      )
      .addSelect('COUNT(DISTINCT payment.referenceNumber)', 'uniqueReferences')
      .setParameter('success', PaymentStatus.SUCCESS)
      .getRawOne();

    // Get payment channel breakdown
    const channelBreakdown = await queryBuilder
      .clone()
      .select('payment.paymentChannel', 'channel')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(payment.amountPaid)', 'amount')
      .groupBy('payment.paymentChannel')
      .getRawMany();

    const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : '0.00';

    return {
      total: totalCount,
      successful: successCount,
      successRate: parseFloat(successRate),
      uniqueReferences: parseInt(amountStats?.uniqueReferences || '0'),
      amounts: {
        total: parseFloat(amountStats?.totalAmount || '0'),
        successful: parseFloat(amountStats?.successAmount || '0'),
        currency: 'TZS',
      },
      byChannel: channelBreakdown.map(item => ({
        channel: item.channel,
        count: parseInt(item.count),
        amount: parseFloat(item.amount),
      })),
    };
  }

  /**
   * Get recent references
   */
  private async getRecentReferences(limit: number = 10, serviceProviderId?: string) {
    const whereClause: any = {};
    if (serviceProviderId) {
      whereClause.serviceProviderId = serviceProviderId;
    }

    return await this.referenceRepo.find({
      where: whereClause,
      relations: ['serviceProvider'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get recent payments
   */
  private async getRecentPayments(limit: number = 10, serviceProviderId?: string) {
    const queryBuilder = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.reference', 'ref')
      .leftJoinAndSelect('ref.serviceProvider', 'sp')
      .orderBy('payment.paidAt', 'DESC')
      .take(limit);

    if (serviceProviderId) {
      queryBuilder.where('ref.serviceProviderId = :serviceProviderId', {
        serviceProviderId,
      });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Get top service providers by volume
   */
  private async getTopServiceProviders(
    limit: number,
    startDate: Date,
    endDate: Date,
  ) {
    const results = await this.referenceRepo
      .createQueryBuilder('ref')
      .leftJoin('ref.serviceProvider', 'sp')
      .select('sp.id', 'id')
      .addSelect('sp.businessName', 'businessName')
      .addSelect('sp.spCode', 'spCode')
      .addSelect('COUNT(ref.id)', 'referencesCount')
      .addSelect('SUM(ref.amount)', 'totalAmount')
      // Actual money received, so installments/partial payments are included
      .addSelect('COALESCE(SUM(ref.totalPaid), 0)', 'collectedAmount')
      .where('ref.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('sp.id')
      .addGroupBy('sp.businessName')
      .addGroupBy('sp.spCode')
      .orderBy('SUM(ref.totalPaid)', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map(item => ({
      id: item.id,
      businessName: item.businessName,
      spCode: item.spCode,
      referencesCount: parseInt(item.referencesCount),
      totalAmount: parseFloat(item.totalAmount || '0'),
      collectedAmount: parseFloat(item.collectedAmount || '0'),
      collectionRate:
        parseFloat(item.totalAmount) > 0
          ? ((parseFloat(item.collectedAmount) / parseFloat(item.totalAmount)) * 100).toFixed(2)
          : '0.00',
    }));
  }

  /**
   * Get status breakdown
   */
  private async getStatusBreakdown(
    startDate: Date,
    endDate: Date,
    serviceProviderId?: string,
  ) {
    const queryBuilder = this.referenceRepo
      .createQueryBuilder('ref')
      .select('ref.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(ref.amount)', 'amount')
      .where('ref.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (serviceProviderId) {
      queryBuilder.andWhere('ref.serviceProviderId = :serviceProviderId', {
        serviceProviderId,
      });
    }

    const results = await queryBuilder.groupBy('ref.status').getRawMany();

    return results.map(item => ({
      status: item.status,
      count: parseInt(item.count),
      amount: parseFloat(item.amount || '0'),
    }));
  }

  /**
   * Get daily trends
   */
  async getDailyTrends(query: DashboardQuery = {}) {
    const { startDate, endDate, serviceProviderId } = query;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // References trend
    const referencesTrend = await this.referenceRepo
      .createQueryBuilder('ref')
      .select("DATE(ref.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(ref.amount)', 'amount')
      .where('ref.createdAt BETWEEN :startDate AND :endDate', {
        startDate: start,
        endDate: end,
      })
      .andWhere(serviceProviderId ? 'ref.serviceProviderId = :serviceProviderId' : '1=1', {
        serviceProviderId,
      })
      .groupBy('DATE(ref.createdAt)')
      .orderBy('DATE(ref.createdAt)', 'ASC')
      .getRawMany();

    // Payments trend
    const paymentsTrend = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.reference', 'ref')
      .select("DATE(payment.paidAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(payment.amountPaid)', 'amount')
      .where('payment.paidAt BETWEEN :startDate AND :endDate', {
        startDate: start,
        endDate: end,
      })
      .andWhere(serviceProviderId ? 'ref.serviceProviderId = :serviceProviderId' : '1=1', {
        serviceProviderId,
      })
      .groupBy('DATE(payment.paidAt)')
      .orderBy('DATE(payment.paidAt)', 'ASC')
      .getRawMany();

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      references: referencesTrend.map(item => ({
        date: item.date,
        count: parseInt(item.count),
        amount: parseFloat(item.amount || '0'),
      })),
      payments: paymentsTrend.map(item => ({
        date: item.date,
        count: parseInt(item.count),
        amount: parseFloat(item.amount || '0'),
      })),
    };
  }

  /**
   * Get detailed reference analytics
   */
  async getReferenceAnalytics(query: DashboardQuery = {}) {
    const { startDate, endDate, serviceProviderId } = query;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const whereClause: any = {
      createdAt: Between(start, end),
    };

    if (serviceProviderId) {
      whereClause.serviceProviderId = serviceProviderId;
    }

    // Payment option breakdown
    const paymentOptionBreakdown = await this.referenceRepo
      .createQueryBuilder('ref')
      .select('ref.paymentOption', 'paymentOption')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(ref.amount)', 'amount')
      .where('ref.createdAt BETWEEN :startDate AND :endDate', {
        startDate: start,
        endDate: end,
      })
      .andWhere(serviceProviderId ? 'ref.serviceProviderId = :serviceProviderId' : '1=1', {
        serviceProviderId,
      })
      .groupBy('ref.paymentOption')
      .getRawMany();

    // Average amounts
    const avgStats = await this.referenceRepo
      .createQueryBuilder('ref')
      .select('AVG(ref.amount)', 'avgAmount')
      .addSelect('MIN(ref.amount)', 'minAmount')
      .addSelect('MAX(ref.amount)', 'maxAmount')
      .where(whereClause)
      .getRawOne();

    // Installment statistics
    const installmentStats = await this.referenceRepo
      .createQueryBuilder('ref')
      .select('AVG(ref.installmentCount)', 'avgInstallments')
      .addSelect('MAX(ref.installmentCount)', 'maxInstallments')
      .addSelect(
        'COUNT(CASE WHEN ref.installmentCount > 1 THEN 1 END)',
        'multipleInstallmentCount',
      )
      .where(whereClause)
      .getRawOne();

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      paymentOptions: paymentOptionBreakdown.map(item => ({
        option: item.paymentOption,
        count: parseInt(item.count),
        amount: parseFloat(item.amount || '0'),
      })),
      amounts: {
        average: parseFloat(avgStats?.avgAmount || '0'),
        minimum: parseFloat(avgStats?.minAmount || '0'),
        maximum: parseFloat(avgStats?.maxAmount || '0'),
        currency: 'TZS',
      },
      installments: {
        average: parseFloat(installmentStats?.avgInstallments || '0'),
        maximum: parseInt(installmentStats?.maxInstallments || '0'),
        multipleInstallmentReferences: parseInt(
          installmentStats?.multipleInstallmentCount || '0',
        ),
      },
    };
  }

  /**
   * Get service provider dashboard
   */
  async getServiceProviderDashboard(serviceProviderId: string, query: DashboardQuery = {}) {
    const { startDate, endDate } = query;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const [serviceProvider, overview, trends, analytics] = await Promise.all([
      this.serviceProviderRepo.findOne({
        where: { id: serviceProviderId },
        relations: ['contact', 'bankAccounts', 'settings'],
      }),
      this.getOverview({ startDate: start, endDate: end, serviceProviderId }),
      this.getDailyTrends({ startDate: start, endDate: end, serviceProviderId }),
      this.getReferenceAnalytics({ startDate: start, endDate: end, serviceProviderId }),
    ]);

    return {
      serviceProvider: {
        id: serviceProvider.id,
        businessName: serviceProvider.businessName,
        spCode: serviceProvider.spCode,
        status: serviceProvider.status,
        isActive: serviceProvider.isActive,
      },
      overview,
      trends,
      analytics,
    };
  }
}
