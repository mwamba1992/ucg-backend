import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import * as ExcelJS from 'exceljs';

import { Payment, PaymentStatus } from '../payment/entities/payment.entity';
import {
  PaymentReference,
  ReferenceStatus,
} from '../reference/entities/payment-reference.entity';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';

import {
  ReportFormat,
  GroupBy,
  SpPaymentReportFilterDto,
  SpReferenceReportFilterDto,
  SpRevenueSummaryReportFilterDto,
  SpChannelPerformanceReportFilterDto,
  SpOutstandingReportFilterDto,
  SpDailyTrendsReportFilterDto,
  SpCollectionRateReportFilterDto,
  SpCustomerReportFilterDto,
} from './dto/sp-report-filter.dto';

import {
  generatePaymentReportHtml,
  PaymentReportData,
  PaymentReportSummary,
} from './templates/payment-report.template';
import {
  generateReferenceReportHtml,
  ReferenceReportData,
  ReferenceReportSummary,
} from './templates/reference-report.template';
import {
  generateRevenueSummaryReportHtml,
  RevenueSummaryRow,
  RevenueSummaryReportSummary,
} from './templates/revenue-summary-report.template';
import {
  generateChannelPerformanceReportHtml,
  ChannelPerformanceRow,
  ChannelPerformanceReportSummary,
} from './templates/channel-performance-report.template';
import {
  generateOutstandingReportHtml,
  OutstandingReportData,
  OutstandingReportSummary,
} from './templates/outstanding-report.template';
import {
  generateDailyTrendsReportHtml,
  DailyTrendsRow,
  DailyTrendsReportSummary,
} from './templates/daily-trends-report.template';
import {
  generateCollectionRateReportHtml,
  CollectionRateRow,
  CollectionRateReportSummary,
} from './templates/collection-rate-report.template';

export interface ReportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

@Injectable()
export class SpReportService {
  private readonly logger = new Logger(SpReportService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentReference)
    private readonly referenceRepo: Repository<PaymentReference>,
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepo: Repository<ServiceProvider>,
  ) {}

  // ============================================
  // SP PAYMENT REPORT
  // ============================================
  async generateSpPaymentReport(
    serviceProviderId: string,
    filters: SpPaymentReportFilterDto,
  ): Promise<ReportResult> {
    this.logger.log(`Generating SP payment report for ${serviceProviderId}`);

    const { data, summary } = await this.querySpPaymentData(serviceProviderId, filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generatePaymentReportHtml(data, summary, {
        ...filters,
        serviceProviderId,
      } as any);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `my-payments-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateSpPaymentExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `my-payments-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async querySpPaymentData(
    serviceProviderId: string,
    filters: SpPaymentReportFilterDto,
  ): Promise<{ data: PaymentReportData[]; summary: PaymentReportSummary }> {
    const queryBuilder = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.reference', 'ref')
      .where('ref.serviceProviderId = :spId', { spId: serviceProviderId })
      .andWhere('payment.paidAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.status) {
      queryBuilder.andWhere('payment.status = :status', { status: filters.status });
    }

    if (filters.channel) {
      queryBuilder.andWhere('payment.paymentChannel = :channel', { channel: filters.channel });
    }

    if (filters.minAmount) {
      queryBuilder.andWhere('payment.amountPaid >= :minAmount', { minAmount: filters.minAmount });
    }

    if (filters.maxAmount) {
      queryBuilder.andWhere('payment.amountPaid <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    queryBuilder.orderBy('payment.paidAt', 'DESC');

    const payments = await queryBuilder.getMany();

    const data: PaymentReportData[] = payments.map((p) => ({
      id: p.id,
      referenceNumber: p.referenceNumber,
      payerName: p.payerName,
      payerPhone: p.payerPhone,
      amountPaid: Number(p.amountPaid),
      currency: p.currency,
      status: p.status,
      paymentChannel: p.paymentChannel,
      fspCode: p.fspCode,
      paidAt: p.paidAt,
    }));

    const totalTransactions = data.length;
    const successfulTransactions = data.filter((p) => p.status === PaymentStatus.SUCCESS).length;
    const failedTransactions = data.filter(
      (p) => p.status === PaymentStatus.FAILED || p.status === PaymentStatus.REVERSED,
    ).length;
    const pendingTransactions = data.filter((p) => p.status === PaymentStatus.PENDING).length;

    const totalAmount = data.reduce((sum, p) => sum + p.amountPaid, 0);
    const successfulAmount = data
      .filter((p) => p.status === PaymentStatus.SUCCESS)
      .reduce((sum, p) => sum + p.amountPaid, 0);

    const channelMap = new Map<string, { count: number; amount: number }>();
    data.forEach((p) => {
      const channel = p.paymentChannel || 'Unknown';
      const current = channelMap.get(channel) || { count: 0, amount: 0 };
      channelMap.set(channel, {
        count: current.count + 1,
        amount: current.amount + p.amountPaid,
      });
    });

    const byChannel = Array.from(channelMap.entries()).map(([channel, stats]) => ({
      channel,
      count: stats.count,
      amount: stats.amount,
    }));

    const summary: PaymentReportSummary = {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
      totalAmount,
      successfulAmount,
      currency: 'TZS',
      successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
      byChannel,
    };

    return { data, summary };
  }

  private async generateSpPaymentExcel(
    data: PaymentReportData[],
    summary: PaymentReportSummary,
    filters: SpPaymentReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('My Payments', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'My Payments Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells('A2:I2');
    const periodCell = sheet.getCell('A2');
    periodCell.value = `Period: ${filters.dateFrom} to ${filters.dateTo}`;
    periodCell.font = { name: 'Arial', size: 12 };
    periodCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const headers = ['Sn', 'Reference No', 'Payer Name', 'Phone', 'Amount', 'Channel', 'FSP', 'Status', 'Paid At'];
    const headerRow = sheet.getRow(4);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0056B3' } };
    });

    const widths = [5, 18, 25, 15, 18, 12, 12, 12, 18];
    widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    data.forEach((payment, index) => {
      const row = sheet.getRow(index + 5);
      const values = [
        index + 1,
        payment.referenceNumber || '-',
        payment.payerName || '-',
        payment.payerPhone || '-',
        payment.amountPaid,
        payment.paymentChannel || '-',
        payment.fspCode || '-',
        payment.status || '-',
        payment.paidAt ? new Date(payment.paidAt).toLocaleString('en-GB') : '-',
      ];

      values.forEach((val, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
      });
      row.getCell(5).numFmt = '#,##0.00';

      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
        });
      }
    });

    const totalRow = sheet.getRow(data.length + 5);
    totalRow.getCell(4).value = 'TOTAL';
    totalRow.getCell(4).font = { bold: true };
    totalRow.getCell(5).value = summary.totalAmount;
    totalRow.getCell(5).numFmt = '#,##0.00';
    totalRow.getCell(5).font = { bold: true };
    totalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FF' } };
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // SP REFERENCE REPORT
  // ============================================
  async generateSpReferenceReport(
    serviceProviderId: string,
    filters: SpReferenceReportFilterDto,
  ): Promise<ReportResult> {
    this.logger.log(`Generating SP reference report for ${serviceProviderId}`);

    const { data, summary } = await this.querySpReferenceData(serviceProviderId, filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateReferenceReportHtml(data, summary, {
        ...filters,
        serviceProviderId,
      } as any);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `my-references-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateSpReferenceExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `my-references-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async querySpReferenceData(
    serviceProviderId: string,
    filters: SpReferenceReportFilterDto,
  ): Promise<{ data: ReferenceReportData[]; summary: ReferenceReportSummary }> {
    const queryBuilder = this.referenceRepo
      .createQueryBuilder('ref')
      .where('ref.serviceProviderId = :spId', { spId: serviceProviderId })
      .andWhere('ref.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.status) {
      queryBuilder.andWhere('ref.status = :status', { status: filters.status });
    }

    if (filters.paymentOption) {
      queryBuilder.andWhere('ref.paymentOption = :paymentOption', {
        paymentOption: filters.paymentOption,
      });
    }

    if (filters.customerName) {
      queryBuilder.andWhere('ref.customerName ILIKE :customerName', {
        customerName: `%${filters.customerName}%`,
      });
    }

    queryBuilder.orderBy('ref.createdAt', 'DESC');

    const references = await queryBuilder.getMany();

    const data: ReferenceReportData[] = references.map((r) => ({
      id: r.id,
      referenceNumber: r.referenceNumber,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerEmail: r.customerEmail,
      amount: Number(r.amount),
      totalPaid: Number(r.totalPaid),
      currency: r.currency,
      status: r.status,
      paymentOption: r.paymentOption,
      installmentCount: r.installmentCount,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    }));

    const totalReferences = data.length;
    const activeReferences = data.filter((r) => r.status === ReferenceStatus.ACTIVE).length;
    const usedReferences = data.filter((r) => r.status === ReferenceStatus.USED).length;
    const expiredReferences = data.filter((r) => r.status === ReferenceStatus.EXPIRED).length;
    const cancelledReferences = data.filter((r) => r.status === ReferenceStatus.CANCELLED).length;

    const totalAmount = data.reduce((sum, r) => sum + r.amount, 0);
    const paidAmount = data.reduce((sum, r) => sum + r.totalPaid, 0);
    const pendingAmount = totalAmount - paidAmount;

    const optionMap = new Map<string, { count: number; amount: number }>();
    data.forEach((r) => {
      const option = r.paymentOption || 'Unknown';
      const current = optionMap.get(option) || { count: 0, amount: 0 };
      optionMap.set(option, {
        count: current.count + 1,
        amount: current.amount + r.amount,
      });
    });

    const byPaymentOption = Array.from(optionMap.entries()).map(([option, stats]) => ({
      option,
      count: stats.count,
      amount: stats.amount,
    }));

    const summary: ReferenceReportSummary = {
      totalReferences,
      activeReferences,
      usedReferences,
      expiredReferences,
      cancelledReferences,
      totalAmount,
      paidAmount,
      pendingAmount,
      currency: 'TZS',
      collectionRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
      byPaymentOption,
    };

    return { data, summary };
  }

  private async generateSpReferenceExcel(
    data: ReferenceReportData[],
    summary: ReferenceReportSummary,
    filters: SpReferenceReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('My References', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.mergeCells('A1:K1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'My Payment References Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headers = [
      'Sn', 'Reference No', 'Customer Name', 'Phone', 'Amount', 'Paid', 'Remaining',
      'Pay Option', 'Installments', 'Status', 'Expires',
    ];
    const headerRow = sheet.getRow(3);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0056B3' } };
    });

    const widths = [5, 18, 25, 15, 15, 15, 15, 12, 10, 10, 12];
    widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    data.forEach((ref, index) => {
      const row = sheet.getRow(index + 4);
      const remaining = Math.max(0, ref.amount - ref.totalPaid);
      const values = [
        index + 1, ref.referenceNumber, ref.customerName, ref.customerPhone,
        ref.amount, ref.totalPaid, remaining, ref.paymentOption, ref.installmentCount,
        ref.status, ref.expiresAt ? new Date(ref.expiresAt).toLocaleDateString('en-GB') : '-',
      ];
      values.forEach((val, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
      });
      [5, 6, 7].forEach((col) => { row.getCell(col).numFmt = '#,##0.00'; });
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
        });
      }
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // SP REVENUE SUMMARY REPORT
  // ============================================
  async generateSpRevenueSummaryReport(
    serviceProviderId: string,
    filters: SpRevenueSummaryReportFilterDto,
  ): Promise<ReportResult> {
    this.logger.log(`Generating SP revenue summary report for ${serviceProviderId}`);

    const { data, summary } = await this.querySpRevenueSummaryData(serviceProviderId, filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateRevenueSummaryReportHtml(data, summary, {
        ...filters,
        serviceProviderId,
      } as any);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `my-revenue-summary-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateSpRevenueSummaryExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `my-revenue-summary-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async querySpRevenueSummaryData(
    serviceProviderId: string,
    filters: SpRevenueSummaryReportFilterDto,
  ): Promise<{ data: RevenueSummaryRow[]; summary: RevenueSummaryReportSummary }> {
    const groupBy = filters.groupBy || GroupBy.DAY;
    let dateFormat: string;

    switch (groupBy) {
      case GroupBy.WEEK:
        dateFormat = "TO_CHAR(ref.createdAt, 'IYYY-IW')";
        break;
      case GroupBy.MONTH:
        dateFormat = "TO_CHAR(ref.createdAt, 'YYYY-MM')";
        break;
      default:
        dateFormat = "TO_CHAR(ref.createdAt, 'YYYY-MM-DD')";
    }

    const queryBuilder = this.referenceRepo
      .createQueryBuilder('ref')
      .select(dateFormat, 'period')
      .addSelect('COUNT(ref.id)', 'referenceCount')
      .addSelect('SUM(ref.amount)', 'totalBilled')
      .addSelect('SUM(ref.totalPaid)', 'totalCollected')
      .where('ref.serviceProviderId = :spId', { spId: serviceProviderId })
      .andWhere('ref.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      })
      .groupBy(dateFormat)
      .orderBy(dateFormat, 'ASC');

    const results = await queryBuilder.getRawMany();

    // Get payment counts
    const paymentQuery = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.reference', 'ref')
      .select(
        groupBy === GroupBy.WEEK
          ? "TO_CHAR(payment.paidAt, 'IYYY-IW')"
          : groupBy === GroupBy.MONTH
            ? "TO_CHAR(payment.paidAt, 'YYYY-MM')"
            : "TO_CHAR(payment.paidAt, 'YYYY-MM-DD')",
        'period',
      )
      .addSelect('COUNT(payment.id)', 'paymentCount')
      .where('ref.serviceProviderId = :spId', { spId: serviceProviderId })
      .andWhere('payment.paidAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .groupBy('period');

    const paymentResults = await paymentQuery.getRawMany();
    const paymentMap = new Map(
      paymentResults.map((p) => [p.period, parseInt(p.paymentCount)]),
    );

    const data: RevenueSummaryRow[] = results.map((row) => {
      const totalBilled = parseFloat(row.totalBilled) || 0;
      const totalCollected = parseFloat(row.totalCollected) || 0;
      return {
        period: row.period,
        referenceCount: parseInt(row.referenceCount) || 0,
        paymentCount: paymentMap.get(row.period) || 0,
        totalBilled,
        totalCollected,
        collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
        successRate: 0,
      };
    });

    const totalBilled = data.reduce((sum, r) => sum + r.totalBilled, 0);
    const totalCollected = data.reduce((sum, r) => sum + r.totalCollected, 0);
    const totalReferences = data.reduce((sum, r) => sum + r.referenceCount, 0);
    const totalPayments = data.reduce((sum, r) => sum + r.paymentCount, 0);

    const summary: RevenueSummaryReportSummary = {
      totalBilled,
      totalCollected,
      totalReferences,
      totalPayments,
      overallCollectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
      overallSuccessRate: 0,
      currency: 'TZS',
    };

    return { data, summary };
  }

  private async generateSpRevenueSummaryExcel(
    data: RevenueSummaryRow[],
    summary: RevenueSummaryReportSummary,
    filters: SpRevenueSummaryReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('My Revenue Summary', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'My Revenue Summary Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headers = ['Sn', 'Period', 'References', 'Payments', 'Total Billed', 'Collected', 'Rate'];
    const headerRow = sheet.getRow(3);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0056B3' } };
    });

    const widths = [5, 15, 12, 12, 18, 18, 12];
    widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    data.forEach((row, index) => {
      const dataRow = sheet.getRow(index + 4);
      const values = [
        index + 1, row.period, row.referenceCount, row.paymentCount,
        row.totalBilled, row.totalCollected, `${row.collectionRate.toFixed(2)}%`,
      ];
      values.forEach((val, idx) => {
        const cell = dataRow.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
      });
      [5, 6].forEach((col) => { dataRow.getCell(col).numFmt = '#,##0.00'; });
      if (index % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
        });
      }
    });

    const totalRow = sheet.getRow(data.length + 4);
    totalRow.getCell(2).value = 'TOTAL';
    totalRow.getCell(2).font = { bold: true };
    totalRow.getCell(3).value = summary.totalReferences;
    totalRow.getCell(4).value = summary.totalPayments;
    totalRow.getCell(5).value = summary.totalBilled;
    totalRow.getCell(6).value = summary.totalCollected;
    totalRow.getCell(7).value = `${summary.overallCollectionRate.toFixed(2)}%`;
    [3, 4, 5, 6, 7].forEach((col) => { totalRow.getCell(col).font = { bold: true }; });
    [5, 6].forEach((col) => { totalRow.getCell(col).numFmt = '#,##0.00'; });
    totalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FF' } };
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // SP CHANNEL PERFORMANCE REPORT
  // ============================================
  async generateSpChannelPerformanceReport(
    serviceProviderId: string,
    filters: SpChannelPerformanceReportFilterDto,
  ): Promise<ReportResult> {
    this.logger.log(`Generating SP channel performance report for ${serviceProviderId}`);

    const { data, summary } = await this.querySpChannelPerformanceData(serviceProviderId, filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateChannelPerformanceReportHtml(data, summary, {
        ...filters,
        serviceProviderId,
      } as any);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `my-channel-performance-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateSpChannelPerformanceExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `my-channel-performance-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async querySpChannelPerformanceData(
    serviceProviderId: string,
    filters: SpChannelPerformanceReportFilterDto,
  ): Promise<{ data: ChannelPerformanceRow[]; summary: ChannelPerformanceReportSummary }> {
    const queryBuilder = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.reference', 'ref')
      .select('payment.paymentChannel', 'channel')
      .addSelect('COUNT(*)', 'transactionCount')
      .addSelect(
        `SUM(CASE WHEN payment.status = 'SUCCESS' THEN 1 ELSE 0 END)`,
        'successfulCount',
      )
      .addSelect(
        `SUM(CASE WHEN payment.status IN ('FAILED', 'REVERSED') THEN 1 ELSE 0 END)`,
        'failedCount',
      )
      .addSelect('SUM(payment.amountPaid)', 'totalAmount')
      .addSelect(
        `SUM(CASE WHEN payment.status = 'SUCCESS' THEN payment.amountPaid ELSE 0 END)`,
        'successfulAmount',
      )
      .where('ref.serviceProviderId = :spId', { spId: serviceProviderId })
      .andWhere('payment.paidAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.channel) {
      queryBuilder.andWhere('payment.paymentChannel = :channel', { channel: filters.channel });
    }

    queryBuilder.groupBy('payment.paymentChannel').orderBy('SUM(payment.amountPaid)', 'DESC');

    const results = await queryBuilder.getRawMany();

    const data: ChannelPerformanceRow[] = results.map((row) => {
      const transactionCount = parseInt(row.transactionCount) || 0;
      const successfulCount = parseInt(row.successfulCount) || 0;
      const totalAmount = parseFloat(row.totalAmount) || 0;
      return {
        channel: row.channel || 'Unknown',
        transactionCount,
        successfulCount,
        failedCount: parseInt(row.failedCount) || 0,
        totalAmount,
        successfulAmount: parseFloat(row.successfulAmount) || 0,
        successRate: transactionCount > 0 ? (successfulCount / transactionCount) * 100 : 0,
        avgTransactionAmount: transactionCount > 0 ? totalAmount / transactionCount : 0,
      };
    });

    const totalTransactions = data.reduce((sum, r) => sum + r.transactionCount, 0);
    const totalSuccessful = data.reduce((sum, r) => sum + r.successfulCount, 0);
    const totalFailed = data.reduce((sum, r) => sum + r.failedCount, 0);
    const totalAmount = data.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalSuccessfulAmount = data.reduce((sum, r) => sum + r.successfulAmount, 0);

    const summary: ChannelPerformanceReportSummary = {
      totalTransactions,
      totalSuccessful,
      totalFailed,
      totalAmount,
      totalSuccessfulAmount,
      overallSuccessRate: totalTransactions > 0 ? (totalSuccessful / totalTransactions) * 100 : 0,
      currency: 'TZS',
      topChannel: data.length > 0 ? data[0].channel : '-',
    };

    return { data, summary };
  }

  private async generateSpChannelPerformanceExcel(
    data: ChannelPerformanceRow[],
    summary: ChannelPerformanceReportSummary,
    filters: SpChannelPerformanceReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('My Channel Performance', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'My Channel Performance Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headers = ['Sn', 'Channel', 'Total Txns', 'Successful', 'Failed', 'Total Amount', 'Avg Amount', 'Success Rate'];
    const headerRow = sheet.getRow(3);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0056B3' } };
    });

    const widths = [5, 15, 12, 12, 10, 18, 18, 12];
    widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    data.forEach((row, index) => {
      const dataRow = sheet.getRow(index + 4);
      const values = [
        index + 1, row.channel, row.transactionCount, row.successfulCount,
        row.failedCount, row.totalAmount, row.avgTransactionAmount, `${row.successRate.toFixed(2)}%`,
      ];
      values.forEach((val, idx) => {
        const cell = dataRow.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
      });
      [6, 7].forEach((col) => { dataRow.getCell(col).numFmt = '#,##0.00'; });
      if (index % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
        });
      }
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // SP OUTSTANDING REPORT
  // ============================================
  async generateSpOutstandingReport(
    serviceProviderId: string,
    filters: SpOutstandingReportFilterDto,
  ): Promise<ReportResult> {
    this.logger.log(`Generating SP outstanding report for ${serviceProviderId}`);

    const { data, summary } = await this.querySpOutstandingData(serviceProviderId, filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateOutstandingReportHtml(data, summary, {
        ...filters,
        serviceProviderId,
      } as any);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `my-outstanding-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateSpOutstandingExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `my-outstanding-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async querySpOutstandingData(
    serviceProviderId: string,
    filters: SpOutstandingReportFilterDto,
  ): Promise<{ data: OutstandingReportData[]; summary: OutstandingReportSummary }> {
    const queryBuilder = this.referenceRepo
      .createQueryBuilder('ref')
      .where('ref.serviceProviderId = :spId', { spId: serviceProviderId })
      .andWhere('ref.status = :status', { status: ReferenceStatus.ACTIVE })
      .andWhere('ref.amount > ref.totalPaid');

    if (filters.minAmount) {
      queryBuilder.andWhere('(ref.amount - ref.totalPaid) >= :minAmount', {
        minAmount: filters.minAmount,
      });
    }

    queryBuilder.orderBy('ref.createdAt', 'ASC');

    const references = await queryBuilder.getMany();
    const now = new Date();

    const getAgeingBucket = (days: number): string => {
      if (days <= 30) return '0-30';
      if (days <= 60) return '31-60';
      if (days <= 90) return '61-90';
      return '90+';
    };

    let data: OutstandingReportData[] = references.map((r) => {
      const ageInDays = Math.floor(
        (now.getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      const outstanding = Number(r.amount) - Number(r.totalPaid);
      return {
        referenceNumber: r.referenceNumber,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        serviceProviderName: '-',
        spCode: '-',
        amount: Number(r.amount),
        totalPaid: Number(r.totalPaid),
        outstanding,
        currency: r.currency,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        ageInDays,
        ageingBucket: getAgeingBucket(ageInDays),
      };
    });

    if (filters.ageingBucket) {
      data = data.filter((r) => r.ageingBucket === filters.ageingBucket);
    }

    const totalReferences = data.length;
    const totalOutstanding = data.reduce((sum, r) => sum + r.outstanding, 0);

    const ageingMap = new Map<string, { count: number; amount: number }>();
    data.forEach((r) => {
      const current = ageingMap.get(r.ageingBucket) || { count: 0, amount: 0 };
      ageingMap.set(r.ageingBucket, {
        count: current.count + 1,
        amount: current.amount + r.outstanding,
      });
    });
    const byAgeing = ['0-30', '31-60', '61-90', '90+'].map((bucket) => ({
      bucket,
      count: ageingMap.get(bucket)?.count || 0,
      amount: ageingMap.get(bucket)?.amount || 0,
    }));

    const summary: OutstandingReportSummary = {
      totalReferences,
      totalOutstanding,
      currency: 'TZS',
      byAgeing,
      byServiceProvider: [],
    };

    return { data, summary };
  }

  private async generateSpOutstandingExcel(
    data: OutstandingReportData[],
    summary: OutstandingReportSummary,
    filters: SpOutstandingReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('My Outstanding', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'My Outstanding Payments Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headers = ['Sn', 'Reference No', 'Customer', 'Phone', 'Invoice Amt', 'Paid', 'Outstanding', 'Age (Days)', 'Bucket'];
    const headerRow = sheet.getRow(3);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0056B3' } };
    });

    const widths = [5, 18, 25, 15, 15, 15, 15, 10, 10];
    widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    data.forEach((row, index) => {
      const dataRow = sheet.getRow(index + 4);
      const values = [
        index + 1, row.referenceNumber, row.customerName, row.customerPhone,
        row.amount, row.totalPaid, row.outstanding, row.ageInDays, row.ageingBucket,
      ];
      values.forEach((val, idx) => {
        const cell = dataRow.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
      });
      [5, 6, 7].forEach((col) => { dataRow.getCell(col).numFmt = '#,##0.00'; });
      if (index % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
        });
      }
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // PDF GENERATION UTILITY
  // ============================================
  private async generatePdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '15mm',
          right: '10mm',
          bottom: '20mm',
          left: '10mm',
        },
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `
          <div style="font-size: 8px; width: 100%; text-align: center; color: #888; padding: 0 20px;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
