import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Settlement, SettlementStatus, SettlementPeriod } from './entities/settlement.entity';
import { Payment, PaymentStatus } from '../payment/entities/payment.entity';
import { PaymentReference, ReferenceStatus } from '../reference/entities/payment-reference.entity';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';
import {
  ReconciliationQueryDto,
  TransactionQueryDto,
  GenerateSettlementDto,
} from './dto/reconciliation-query.dto';
import * as crypto from 'crypto';

@Injectable()
export class ReconciliationService {
  constructor(
    @InjectRepository(Settlement)
    private readonly settlementRepo: Repository<Settlement>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentReference)
    private readonly referenceRepo: Repository<PaymentReference>,
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepo: Repository<ServiceProvider>,
  ) {}

  /**
   * Generate settlement for a service provider and period
   */
  async generateSettlement(dto: GenerateSettlementDto): Promise<Settlement> {
    const { serviceProviderId, periodStart, periodEnd, period } = dto;

    // Verify service provider exists
    const serviceProvider = await this.serviceProviderRepo.findOne({
      where: { id: serviceProviderId },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    // Check if settlement already exists for this period
    const existing = await this.settlementRepo.findOne({
      where: {
        serviceProviderId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    });

    if (existing) {
      throw new BadRequestException('Settlement already exists for this period');
    }

    // Get all successful payments in the period
    const payments = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.reference', 'ref')
      .where('ref.serviceProviderId = :serviceProviderId', { serviceProviderId })
      .andWhere('payment.paidAt BETWEEN :start AND :end', {
        start: new Date(periodStart),
        end: new Date(periodEnd),
      })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .getMany();

    // Calculate totals
    const totalTransactions = payments.length;
    const totalAmount = payments.reduce(
      (sum, p) => sum + parseFloat(p.amountPaid.toString()),
      0,
    );

    // Calculate fees (you can customize the fee structure)
    const feePercentage = serviceProvider.settings?.commissionRate || 0;
    const totalFees = (totalAmount * feePercentage) / 100;
    const netSettlement = totalAmount - totalFees;

    // Generate settlement number
    const settlementNumber = await this.generateSettlementNumber(periodStart);

    // Create settlement record
    const settlement = this.settlementRepo.create({
      settlementNumber,
      serviceProviderId,
      settlementDate: new Date(),
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      period,
      totalTransactions,
      successfulTransactions: totalTransactions,
      failedTransactions: 0,
      totalAmount,
      totalFees,
      netSettlement,
      currency: 'TZS',
      status: SettlementStatus.PENDING,
      metadata: {
        generatedAt: new Date(),
        paymentIds: payments.map(p => p.id),
      },
    });

    return await this.settlementRepo.save(settlement);
  }

  /**
   * Get settlements for a service provider
   */
  async getSettlements(query: ReconciliationQueryDto) {
    const { serviceProviderId, startDate, endDate, status, isReconciled } = query;

    const whereClause: any = { serviceProviderId };

    if (startDate && endDate) {
      whereClause.periodStart = Between(new Date(startDate), new Date(endDate));
    }

    if (status) {
      whereClause.status = status;
    }

    if (isReconciled !== undefined) {
      whereClause.isReconciled = isReconciled;
    }

    return await this.settlementRepo.find({
      where: whereClause,
      relations: ['serviceProvider'],
      order: { settlementDate: 'DESC' },
    });
  }

  /**
   * Get settlement by ID
   */
  async getSettlementById(settlementId: string): Promise<Settlement> {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
      relations: ['serviceProvider'],
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    return settlement;
  }

  /**
   * Get transactions for reconciliation
   */
  async getTransactionsForReconciliation(query: TransactionQueryDto) {
    const { serviceProviderId, startDate, endDate, status, paymentChannel } = query;

    const queryBuilder = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.reference', 'ref')
      .leftJoinAndSelect('ref.serviceProvider', 'sp')
      .where('ref.serviceProviderId = :serviceProviderId', { serviceProviderId })
      .andWhere('payment.paidAt BETWEEN :start AND :end', {
        start: new Date(startDate),
        end: new Date(endDate),
      });

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (paymentChannel) {
      queryBuilder.andWhere('payment.paymentChannel = :channel', {
        channel: paymentChannel,
      });
    }

    const transactions = await queryBuilder
      .orderBy('payment.paidAt', 'DESC')
      .getMany();

    return transactions.map(payment => ({
      paymentId: payment.id,
      referenceNumber: payment.referenceNumber,
      payerName: payment.payerName,
      payerPhone: payment.payerPhone,
      amountPaid: payment.amountPaid,
      currency: payment.currency,
      paymentChannel: payment.paymentChannel,
      status: payment.status,
      paidAt: payment.paidAt,
      reference: {
        customerName: payment.reference?.customerName,
        amount: payment.reference?.amount,
      },
    }));
  }

  /**
   * Get settlement summary/report
   */
  async getSettlementReport(settlementId: string) {
    const settlement = await this.getSettlementById(settlementId);

    // Get all payments in this settlement
    const paymentIds = settlement.metadata?.paymentIds || [];

    if (paymentIds.length === 0) {
      return {
        settlement,
        transactions: [],
        summary: this.buildSummary(settlement, []),
      };
    }

    const payments = await this.paymentRepo.find({
      where: { id: In(paymentIds) },
      relations: ['reference'],
      order: { paidAt: 'ASC' },
    });

    const transactions = payments.map(payment => ({
      paymentId: payment.id,
      referenceNumber: payment.referenceNumber,
      customerName: payment.reference?.customerName || payment.payerName,
      payerPhone: payment.payerPhone,
      amountPaid: parseFloat(payment.amountPaid.toString()),
      paymentChannel: payment.paymentChannel,
      paidAt: payment.paidAt,
      status: payment.status,
    }));

    return {
      settlement: {
        settlementNumber: settlement.settlementNumber,
        period: settlement.period,
        periodStart: settlement.periodStart,
        periodEnd: settlement.periodEnd,
        settlementDate: settlement.settlementDate,
        status: settlement.status,
        isReconciled: settlement.isReconciled,
      },
      transactions,
      summary: this.buildSummary(settlement, transactions),
    };
  }

  /**
   * Mark settlement as reconciled
   */
  async markAsReconciled(settlementId: string, reconciledBy: string): Promise<Settlement> {
    const settlement = await this.getSettlementById(settlementId);

    settlement.isReconciled = true;
    settlement.reconciledAt = new Date();
    settlement.reconciledBy = reconciledBy;
    settlement.status = SettlementStatus.COMPLETED;

    return await this.settlementRepo.save(settlement);
  }

  /**
   * Report discrepancy
   */
  async reportDiscrepancy(
    settlementId: string,
    discrepancyDetails: string,
  ): Promise<Settlement> {
    const settlement = await this.getSettlementById(settlementId);

    settlement.status = SettlementStatus.DISPUTED;
    settlement.notes = discrepancyDetails;

    return await this.settlementRepo.save(settlement);
  }

  /**
   * Private helper methods
   */
  private async generateSettlementNumber(date: string): Promise<string> {
    const dateObj = new Date(date);
    const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '');

    // Count settlements for this date
    const count = await this.settlementRepo.count({
      where: {
        settlementNumber: Between(`SET-${dateStr}-00000`, `SET-${dateStr}-99999`),
      },
    });

    const sequence = (count + 1).toString().padStart(5, '0');
    return `SET-${dateStr}-${sequence}`;
  }

  private buildSummary(settlement: Settlement, transactions: any[]) {
    const byChannel = transactions.reduce((acc, t) => {
      const channel = t.paymentChannel || 'Unknown';
      if (!acc[channel]) {
        acc[channel] = { count: 0, amount: 0 };
      }
      acc[channel].count++;
      acc[channel].amount += t.amountPaid;
      return acc;
    }, {});

    return {
      totalTransactions: settlement.totalTransactions,
      totalAmount: parseFloat(settlement.totalAmount.toString()),
      totalFees: parseFloat(settlement.totalFees.toString()),
      netSettlement: parseFloat(settlement.netSettlement.toString()),
      currency: settlement.currency,
      byChannel: Object.entries(byChannel).map(([channel, data]: [string, any]) => ({
        channel,
        count: data.count,
        amount: data.amount,
      })),
    };
  }
}
