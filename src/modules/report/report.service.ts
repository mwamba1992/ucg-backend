import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In } from 'typeorm';
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
  PaymentReportFilterDto,
  ReferenceReportFilterDto,
  ServiceProviderReportFilterDto,
  RevenueSummaryReportFilterDto,
  ChannelPerformanceReportFilterDto,
  OutstandingReportFilterDto,
  DailyTrendsReportFilterDto,
  TopServiceProvidersReportFilterDto,
  CollectionRateReportFilterDto,
  GroupBy,
  AgeingBucket,
} from './dto/report-filter.dto';

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
  generateServiceProviderReportHtml,
  ServiceProviderReportData,
  ServiceProviderReportSummary,
} from './templates/service-provider-report.template';
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
  generateTopServiceProvidersReportHtml,
  TopServiceProviderRow,
  TopServiceProvidersReportSummary,
} from './templates/top-service-providers-report.template';
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
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentReference)
    private readonly referenceRepo: Repository<PaymentReference>,
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepo: Repository<ServiceProvider>,
  ) {}

  // ============================================
  // PAYMENT TRANSACTION REPORT
  // ============================================
  async generatePaymentReport(filters: PaymentReportFilterDto): Promise<ReportResult> {
    this.logger.log(`Generating payment report: ${JSON.stringify(filters)}`);

    const { data, summary } = await this.queryPaymentData(filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generatePaymentReportHtml(data, summary, filters);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `payment-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generatePaymentExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `payment-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async queryPaymentData(
    filters: PaymentReportFilterDto,
  ): Promise<{ data: PaymentReportData[]; summary: PaymentReportSummary }> {
    const queryBuilder = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.reference', 'ref')
      .leftJoinAndSelect('ref.serviceProvider', 'sp')
      .where('payment.paidAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.serviceProviderId) {
      queryBuilder.andWhere('ref.serviceProviderId = :spId', {
        spId: filters.serviceProviderId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('payment.status = :status', {
        status: filters.status,
      });
    }

    if (filters.channel) {
      queryBuilder.andWhere('payment.paymentChannel = :channel', {
        channel: filters.channel,
      });
    }

    if (filters.fspCode) {
      queryBuilder.andWhere('payment.fspCode = :fspCode', {
        fspCode: filters.fspCode,
      });
    }

    if (filters.minAmount) {
      queryBuilder.andWhere('payment.amountPaid >= :minAmount', {
        minAmount: filters.minAmount,
      });
    }

    if (filters.maxAmount) {
      queryBuilder.andWhere('payment.amountPaid <= :maxAmount', {
        maxAmount: filters.maxAmount,
      });
    }

    queryBuilder.orderBy('payment.paidAt', 'DESC');

    const payments = await queryBuilder.getMany();

    // Transform data
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
      serviceProviderName: p.reference?.serviceProvider?.businessName,
      spCode: p.reference?.serviceProvider?.spCode,
    }));

    // Calculate summary
    const totalTransactions = data.length;
    const successfulTransactions = data.filter(
      (p) => p.status === PaymentStatus.SUCCESS,
    ).length;
    const failedTransactions = data.filter(
      (p) => p.status === PaymentStatus.FAILED || p.status === PaymentStatus.REVERSED,
    ).length;
    const pendingTransactions = data.filter(
      (p) => p.status === PaymentStatus.PENDING,
    ).length;

    const totalAmount = data.reduce((sum, p) => sum + p.amountPaid, 0);
    const successfulAmount = data
      .filter((p) => p.status === PaymentStatus.SUCCESS)
      .reduce((sum, p) => sum + p.amountPaid, 0);

    // Channel breakdown
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

  private async generatePaymentExcel(
    data: PaymentReportData[],
    summary: PaymentReportSummary,
    filters: PaymentReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Payment Transactions', {
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true },
    });

    // Title
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Mwanga Hakika Bank - Payment Transactions Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Period
    sheet.mergeCells('A2:J2');
    const periodCell = sheet.getCell('A2');
    periodCell.value = `Period: ${filters.dateFrom} to ${filters.dateTo}`;
    periodCell.font = { name: 'Arial', size: 12 };
    periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 22;

    // Headers
    const headers = [
      'Sn',
      'Reference No',
      'Payer Name',
      'Phone',
      'Service Provider',
      'Amount',
      'Channel',
      'FSP',
      'Status',
      'Paid At',
    ];
    const headerRow = sheet.getRow(4);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0056B3' },
      };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Column widths
    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 18;
    sheet.getColumn(3).width = 25;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 25;
    sheet.getColumn(6).width = 18;
    sheet.getColumn(7).width = 12;
    sheet.getColumn(8).width = 12;
    sheet.getColumn(9).width = 12;
    sheet.getColumn(10).width = 18;

    // Data rows
    data.forEach((payment, index) => {
      const row = sheet.getRow(index + 5);
      const values = [
        index + 1,
        payment.referenceNumber || '-',
        payment.payerName || '-',
        payment.payerPhone || '-',
        payment.serviceProviderName || '-',
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
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        };
      });

      // Alternate row colors
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7F7F7' },
          };
        });
      }

      // Format amount column
      row.getCell(6).numFmt = '#,##0.00';
    });

    // Total row
    const totalRow = sheet.getRow(data.length + 5);
    totalRow.getCell(5).value = 'TOTAL';
    totalRow.getCell(5).font = { bold: true };
    totalRow.getCell(6).value = summary.totalAmount;
    totalRow.getCell(6).numFmt = '#,##0.00';
    totalRow.getCell(6).font = { bold: true };
    totalRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F4FF' },
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0056B3' } },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Summary section
    const summaryStartRow = data.length + 8;
    sheet.mergeCells(`A${summaryStartRow}:D${summaryStartRow}`);
    sheet.getCell(`A${summaryStartRow}`).value = 'Summary';
    sheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 12 };

    const summaryData = [
      ['Total Transactions', summary.totalTransactions],
      ['Successful', summary.successfulTransactions],
      ['Failed', summary.failedTransactions],
      ['Pending', summary.pendingTransactions],
      ['Total Amount', summary.totalAmount],
      ['Success Rate', `${summary.successRate.toFixed(2)}%`],
    ];

    summaryData.forEach((item, idx) => {
      const row = sheet.getRow(summaryStartRow + idx + 1);
      row.getCell(1).value = item[0];
      row.getCell(2).value = item[1];
      if (typeof item[1] === 'number' && String(item[0]).includes('Amount')) {
        row.getCell(2).numFmt = '#,##0.00';
      }
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // REFERENCE REPORT
  // ============================================
  async generateReferenceReport(filters: ReferenceReportFilterDto): Promise<ReportResult> {
    this.logger.log(`Generating reference report: ${JSON.stringify(filters)}`);

    const { data, summary } = await this.queryReferenceData(filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateReferenceReportHtml(data, summary, filters);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `reference-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateReferenceExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `reference-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async queryReferenceData(
    filters: ReferenceReportFilterDto,
  ): Promise<{ data: ReferenceReportData[]; summary: ReferenceReportSummary }> {
    const queryBuilder = this.referenceRepo
      .createQueryBuilder('ref')
      .leftJoinAndSelect('ref.serviceProvider', 'sp')
      .where('ref.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.serviceProviderId) {
      queryBuilder.andWhere('ref.serviceProviderId = :spId', {
        spId: filters.serviceProviderId,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('ref.status = :status', {
        status: filters.status,
      });
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

    // Transform data
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
      serviceProviderName: r.serviceProvider?.businessName,
      spCode: r.serviceProvider?.spCode,
    }));

    // Calculate summary
    const totalReferences = data.length;
    const activeReferences = data.filter((r) => r.status === ReferenceStatus.ACTIVE).length;
    const usedReferences = data.filter((r) => r.status === ReferenceStatus.USED).length;
    const expiredReferences = data.filter((r) => r.status === ReferenceStatus.EXPIRED).length;
    const cancelledReferences = data.filter((r) => r.status === ReferenceStatus.CANCELLED).length;

    const totalAmount = data.reduce((sum, r) => sum + r.amount, 0);
    const paidAmount = data.reduce((sum, r) => sum + r.totalPaid, 0);
    const pendingAmount = totalAmount - paidAmount;

    // Payment option breakdown
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

  private async generateReferenceExcel(
    data: ReferenceReportData[],
    summary: ReferenceReportSummary,
    filters: ReferenceReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Payment References', {
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true },
    });

    // Title
    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Mwanga Hakika Bank - Payment References Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Period
    sheet.mergeCells('A2:L2');
    const periodCell = sheet.getCell('A2');
    periodCell.value = `Period: ${filters.dateFrom} to ${filters.dateTo}`;
    periodCell.font = { name: 'Arial', size: 12 };
    periodCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Headers
    const headers = [
      'Sn',
      'Reference No',
      'Customer Name',
      'Phone',
      'Service Provider',
      'Amount',
      'Paid',
      'Remaining',
      'Pay Option',
      'Installments',
      'Status',
      'Expires',
    ];
    const headerRow = sheet.getRow(4);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0056B3' },
      };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Column widths
    const widths = [5, 18, 25, 15, 20, 15, 15, 15, 12, 10, 10, 12];
    widths.forEach((w, i) => {
      sheet.getColumn(i + 1).width = w;
    });

    // Data rows
    data.forEach((ref, index) => {
      const row = sheet.getRow(index + 5);
      const remaining = Math.max(0, ref.amount - ref.totalPaid);
      const values = [
        index + 1,
        ref.referenceNumber || '-',
        ref.customerName || '-',
        ref.customerPhone || '-',
        ref.serviceProviderName || '-',
        ref.amount,
        ref.totalPaid,
        remaining,
        ref.paymentOption || '-',
        ref.installmentCount,
        ref.status || '-',
        ref.expiresAt ? new Date(ref.expiresAt).toLocaleDateString('en-GB') : '-',
      ];

      values.forEach((val, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        };
      });

      // Format amount columns
      [6, 7, 8].forEach((col) => {
        row.getCell(col).numFmt = '#,##0.00';
      });

      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7F7F7' },
          };
        });
      }
    });

    // Total row
    const totalRow = sheet.getRow(data.length + 5);
    totalRow.getCell(5).value = 'TOTALS';
    totalRow.getCell(5).font = { bold: true };
    totalRow.getCell(6).value = summary.totalAmount;
    totalRow.getCell(7).value = summary.paidAmount;
    totalRow.getCell(8).value = summary.pendingAmount;
    [6, 7, 8].forEach((col) => {
      totalRow.getCell(col).numFmt = '#,##0.00';
      totalRow.getCell(col).font = { bold: true };
    });
    totalRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F4FF' },
      };
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // SERVICE PROVIDER REPORT
  // ============================================
  async generateServiceProviderReport(
    filters: ServiceProviderReportFilterDto,
  ): Promise<ReportResult> {
    this.logger.log(`Generating service provider report: ${JSON.stringify(filters)}`);

    const { data, summary } = await this.queryServiceProviderData(filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateServiceProviderReportHtml(data, summary, filters);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `service-provider-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateServiceProviderExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `service-provider-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async queryServiceProviderData(
    filters: ServiceProviderReportFilterDto,
  ): Promise<{
    data: ServiceProviderReportData[];
    summary: ServiceProviderReportSummary;
  }> {
    const queryBuilder = this.serviceProviderRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.contact', 'contact');

    if (filters.status) {
      queryBuilder.andWhere('sp.status = :status', { status: filters.status });
    }

    if (filters.businessType) {
      queryBuilder.andWhere('sp.businessType = :businessType', {
        businessType: filters.businessType,
      });
    }

    if (filters.region) {
      queryBuilder.andWhere('sp.region = :region', { region: filters.region });
    }

    if (filters.district) {
      queryBuilder.andWhere('sp.district = :district', { district: filters.district });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('sp.isActive = :isActive', { isActive: filters.isActive });
    }

    queryBuilder.orderBy('sp.createdAt', 'DESC');

    const serviceProviders = await queryBuilder.getMany();

    // Transform data
    const data: ServiceProviderReportData[] = serviceProviders.map((sp) => ({
      id: sp.id,
      spCode: sp.spCode,
      businessName: sp.businessName,
      businessType: sp.businessType,
      registrationNumber: sp.registrationNumber,
      tinNumber: sp.tinNumber,
      phoneNumber: sp.phoneNumber,
      email: sp.email,
      region: sp.region,
      district: sp.district,
      status: sp.status,
      isActive: sp.isActive,
      createdAt: sp.createdAt,
      approvedAt: sp.approvedAt,
      contactName: sp.contact?.fullName,
      contactPhone: sp.contact?.phoneNumber,
    }));

    // Calculate summary
    const totalServiceProviders = data.length;
    const activeServiceProviders = data.filter(
      (sp) => sp.status === 'ACTIVE' || sp.status === 'APPROVED',
    ).length;
    const pendingServiceProviders = data.filter(
      (sp) =>
        sp.status === 'PENDING' ||
        sp.status === 'UNDER_REVIEW' ||
        sp.status === 'KYC_VERIFICATION',
    ).length;
    const suspendedServiceProviders = data.filter(
      (sp) => sp.status === 'SUSPENDED' || sp.status === 'REJECTED',
    ).length;

    // Business type breakdown
    const typeMap = new Map<string, number>();
    data.forEach((sp) => {
      const type = sp.businessType || 'Unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    const byBusinessType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // Status breakdown
    const statusMap = new Map<string, number>();
    data.forEach((sp) => {
      const status = sp.status || 'Unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // Region breakdown
    const regionMap = new Map<string, number>();
    data.forEach((sp) => {
      const region = sp.region || 'Unknown';
      regionMap.set(region, (regionMap.get(region) || 0) + 1);
    });
    const byRegion = Array.from(regionMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    const summary: ServiceProviderReportSummary = {
      totalServiceProviders,
      activeServiceProviders,
      pendingServiceProviders,
      suspendedServiceProviders,
      byBusinessType,
      byStatus,
      byRegion,
    };

    return { data, summary };
  }

  private async generateServiceProviderExcel(
    data: ServiceProviderReportData[],
    summary: ServiceProviderReportSummary,
    filters: ServiceProviderReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Service Providers', {
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true },
    });

    // Title
    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Mwanga Hakika Bank - Service Providers Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Headers
    const headers = [
      'Sn',
      'SP Code',
      'Business Name',
      'Type',
      'Reg. Number',
      'TIN',
      'Phone',
      'Email',
      'Region',
      'Status',
      'Active',
      'Registered',
    ];
    const headerRow = sheet.getRow(3);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0056B3' },
      };
    });

    // Column widths
    const widths = [5, 10, 30, 15, 15, 15, 15, 25, 15, 12, 8, 12];
    widths.forEach((w, i) => {
      sheet.getColumn(i + 1).width = w;
    });

    // Data rows
    data.forEach((sp, index) => {
      const row = sheet.getRow(index + 4);
      const values = [
        index + 1,
        sp.spCode || '-',
        sp.businessName || '-',
        sp.businessType || '-',
        sp.registrationNumber || '-',
        sp.tinNumber || '-',
        sp.phoneNumber || '-',
        sp.email || '-',
        sp.region || '-',
        sp.status || '-',
        sp.isActive ? 'Yes' : 'No',
        sp.createdAt ? new Date(sp.createdAt).toLocaleDateString('en-GB') : '-',
      ];

      values.forEach((val, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
      });

      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7F7F7' },
          };
        });
      }
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // REVENUE SUMMARY REPORT
  // ============================================
  async generateRevenueSummaryReport(
    filters: RevenueSummaryReportFilterDto,
  ): Promise<ReportResult> {
    this.logger.log(`Generating revenue summary report: ${JSON.stringify(filters)}`);

    const { data, summary } = await this.queryRevenueSummaryData(filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateRevenueSummaryReportHtml(data, summary, filters);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `revenue-summary-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateRevenueSummaryExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `revenue-summary-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async queryRevenueSummaryData(
    filters: RevenueSummaryReportFilterDto,
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
      .where('ref.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.serviceProviderId) {
      queryBuilder.andWhere('ref.serviceProviderId = :spId', {
        spId: filters.serviceProviderId,
      });
    }

    queryBuilder.groupBy(dateFormat).orderBy(dateFormat, 'ASC');

    const results = await queryBuilder.getRawMany();

    // Get payment counts per period
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
      .where('payment.paidAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCESS });

    if (filters.serviceProviderId) {
      paymentQuery.andWhere('ref.serviceProviderId = :spId', {
        spId: filters.serviceProviderId,
      });
    }

    paymentQuery.groupBy('period');

    const paymentResults = await paymentQuery.getRawMany();
    const paymentMap = new Map(
      paymentResults.map((p) => [p.period, parseInt(p.paymentCount)]),
    );

    // Transform data
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

    // Calculate summary
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

  private async generateRevenueSummaryExcel(
    data: RevenueSummaryRow[],
    summary: RevenueSummaryReportSummary,
    filters: RevenueSummaryReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Revenue Summary', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    // Title
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Mwanga Hakika Bank - Revenue Summary Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Period
    sheet.mergeCells('A2:G2');
    const periodCell = sheet.getCell('A2');
    periodCell.value = `Period: ${filters.dateFrom} to ${filters.dateTo}`;
    periodCell.font = { name: 'Arial', size: 12 };
    periodCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Headers
    const headers = [
      'Sn',
      'Period',
      'References',
      'Payments',
      'Total Billed',
      'Total Collected',
      'Collection Rate',
    ];
    const headerRow = sheet.getRow(4);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0056B3' },
      };
    });

    // Column widths
    const widths = [5, 15, 12, 12, 18, 18, 15];
    widths.forEach((w, i) => {
      sheet.getColumn(i + 1).width = w;
    });

    // Data rows
    data.forEach((row, index) => {
      const dataRow = sheet.getRow(index + 5);
      const values = [
        index + 1,
        row.period,
        row.referenceCount,
        row.paymentCount,
        row.totalBilled,
        row.totalCollected,
        `${row.collectionRate.toFixed(2)}%`,
      ];

      values.forEach((val, idx) => {
        const cell = dataRow.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
      });

      // Format amount columns
      [5, 6].forEach((col) => {
        dataRow.getCell(col).numFmt = '#,##0.00';
      });

      if (index % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7F7F7' },
          };
        });
      }
    });

    // Total row
    const totalRow = sheet.getRow(data.length + 5);
    totalRow.getCell(1).value = '';
    totalRow.getCell(2).value = 'GRAND TOTAL';
    totalRow.getCell(2).font = { bold: true };
    totalRow.getCell(3).value = summary.totalReferences;
    totalRow.getCell(4).value = summary.totalPayments;
    totalRow.getCell(5).value = summary.totalBilled;
    totalRow.getCell(6).value = summary.totalCollected;
    totalRow.getCell(7).value = `${summary.overallCollectionRate.toFixed(2)}%`;
    [3, 4, 5, 6, 7].forEach((col) => {
      totalRow.getCell(col).font = { bold: true };
    });
    [5, 6].forEach((col) => {
      totalRow.getCell(col).numFmt = '#,##0.00';
    });
    totalRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F4FF' },
      };
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // CHANNEL PERFORMANCE REPORT
  // ============================================
  async generateChannelPerformanceReport(
    filters: ChannelPerformanceReportFilterDto,
  ): Promise<ReportResult> {
    this.logger.log(`Generating channel performance report: ${JSON.stringify(filters)}`);

    const { data, summary } = await this.queryChannelPerformanceData(filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateChannelPerformanceReportHtml(data, summary, filters);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `channel-performance-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateChannelPerformanceExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `channel-performance-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async queryChannelPerformanceData(
    filters: ChannelPerformanceReportFilterDto,
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
      .where('payment.paidAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.serviceProviderId) {
      queryBuilder.andWhere('ref.serviceProviderId = :spId', {
        spId: filters.serviceProviderId,
      });
    }

    if (filters.channel) {
      queryBuilder.andWhere('payment.paymentChannel = :channel', {
        channel: filters.channel,
      });
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

  private async generateChannelPerformanceExcel(
    data: ChannelPerformanceRow[],
    summary: ChannelPerformanceReportSummary,
    filters: ChannelPerformanceReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Channel Performance', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Mwanga Hakika Bank - Channel Performance Report';
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
  // OUTSTANDING REPORT
  // ============================================
  async generateOutstandingReport(filters: OutstandingReportFilterDto): Promise<ReportResult> {
    this.logger.log(`Generating outstanding report: ${JSON.stringify(filters)}`);

    const { data, summary } = await this.queryOutstandingData(filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateOutstandingReportHtml(data, summary, filters);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `outstanding-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateOutstandingExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `outstanding-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async queryOutstandingData(
    filters: OutstandingReportFilterDto,
  ): Promise<{ data: OutstandingReportData[]; summary: OutstandingReportSummary }> {
    const queryBuilder = this.referenceRepo
      .createQueryBuilder('ref')
      .leftJoinAndSelect('ref.serviceProvider', 'sp')
      .where('ref.status = :status', { status: ReferenceStatus.ACTIVE })
      .andWhere('ref.amount > ref.totalPaid');

    if (filters.serviceProviderId) {
      queryBuilder.andWhere('ref.serviceProviderId = :spId', {
        spId: filters.serviceProviderId,
      });
    }

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
        serviceProviderName: r.serviceProvider?.businessName || '-',
        spCode: r.serviceProvider?.spCode || '-',
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

    // Filter by ageing bucket if specified
    if (filters.ageingBucket) {
      data = data.filter((r) => r.ageingBucket === filters.ageingBucket);
    }

    // Calculate summary
    const totalReferences = data.length;
    const totalOutstanding = data.reduce((sum, r) => sum + r.outstanding, 0);

    // By ageing
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

    // By service provider
    const spMap = new Map<string, { count: number; amount: number }>();
    data.forEach((r) => {
      const name = r.serviceProviderName || 'Unknown';
      const current = spMap.get(name) || { count: 0, amount: 0 };
      spMap.set(name, {
        count: current.count + 1,
        amount: current.amount + r.outstanding,
      });
    });
    const byServiceProvider = Array.from(spMap.entries())
      .map(([name, stats]) => ({ name, count: stats.count, amount: stats.amount }))
      .sort((a, b) => b.amount - a.amount);

    const summary: OutstandingReportSummary = {
      totalReferences,
      totalOutstanding,
      currency: 'TZS',
      byAgeing,
      byServiceProvider,
    };

    return { data, summary };
  }

  private async generateOutstandingExcel(
    data: OutstandingReportData[],
    summary: OutstandingReportSummary,
    filters: OutstandingReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Outstanding Payments', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Mwanga Hakika Bank - Outstanding Payments Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headers = ['Sn', 'Reference No', 'Customer', 'Phone', 'Service Provider', 'Invoice Amt', 'Paid', 'Outstanding', 'Age (Days)', 'Bucket'];
    const headerRow = sheet.getRow(3);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0056B3' } };
    });

    const widths = [5, 18, 20, 15, 20, 15, 15, 15, 10, 10];
    widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    data.forEach((row, index) => {
      const dataRow = sheet.getRow(index + 4);
      const values = [
        index + 1, row.referenceNumber, row.customerName, row.customerPhone,
        row.serviceProviderName, row.amount, row.totalPaid, row.outstanding,
        row.ageInDays, row.ageingBucket,
      ];
      values.forEach((val, idx) => {
        const cell = dataRow.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
      });
      [6, 7, 8].forEach((col) => { dataRow.getCell(col).numFmt = '#,##0.00'; });
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
  // DAILY TRENDS REPORT
  // ============================================
  async generateDailyTrendsReport(filters: DailyTrendsReportFilterDto): Promise<ReportResult> {
    this.logger.log(`Generating daily trends report: ${JSON.stringify(filters)}`);

    const { data, summary } = await this.queryDailyTrendsData(filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateDailyTrendsReportHtml(data, summary, filters);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `daily-trends-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateDailyTrendsExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `daily-trends-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async queryDailyTrendsData(
    filters: DailyTrendsReportFilterDto,
  ): Promise<{ data: DailyTrendsRow[]; summary: DailyTrendsReportSummary }> {
    // Get references by day
    const refQuery = this.referenceRepo
      .createQueryBuilder('ref')
      .select("TO_CHAR(ref.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'referenceCount')
      .addSelect('SUM(ref.amount)', 'referenceAmount')
      .where('ref.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.serviceProviderId) {
      refQuery.andWhere('ref.serviceProviderId = :spId', {
        spId: filters.serviceProviderId,
      });
    }

    refQuery.groupBy("TO_CHAR(ref.createdAt, 'YYYY-MM-DD')").orderBy('date', 'ASC');

    const refResults = await refQuery.getRawMany();

    // Get payments by day
    const payQuery = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.reference', 'ref')
      .select("TO_CHAR(payment.paidAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'paymentCount')
      .addSelect('SUM(payment.amountPaid)', 'paymentAmount')
      .where('payment.paidAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCESS });

    if (filters.serviceProviderId) {
      payQuery.andWhere('ref.serviceProviderId = :spId', {
        spId: filters.serviceProviderId,
      });
    }

    payQuery.groupBy("TO_CHAR(payment.paidAt, 'YYYY-MM-DD')");

    const payResults = await payQuery.getRawMany();
    const payMap = new Map(
      payResults.map((p) => [
        p.date,
        { count: parseInt(p.paymentCount), amount: parseFloat(p.paymentAmount) || 0 },
      ]),
    );

    const data: DailyTrendsRow[] = refResults.map((row) => {
      const referenceAmount = parseFloat(row.referenceAmount) || 0;
      const payData = payMap.get(row.date) || { count: 0, amount: 0 };
      return {
        date: row.date,
        referenceCount: parseInt(row.referenceCount) || 0,
        referenceAmount,
        paymentCount: payData.count,
        paymentAmount: payData.amount,
        collectionRate: referenceAmount > 0 ? (payData.amount / referenceAmount) * 100 : 0,
      };
    });

    const totalDays = data.length;
    const totalReferences = data.reduce((sum, r) => sum + r.referenceCount, 0);
    const totalReferenceAmount = data.reduce((sum, r) => sum + r.referenceAmount, 0);
    const totalPayments = data.reduce((sum, r) => sum + r.paymentCount, 0);
    const totalPaymentAmount = data.reduce((sum, r) => sum + r.paymentAmount, 0);

    const peakDay = data.reduce(
      (max, r) => (r.paymentAmount > max.amount ? { date: r.date, amount: r.paymentAmount } : max),
      { date: '-', amount: 0 },
    );

    const summary: DailyTrendsReportSummary = {
      totalDays,
      totalReferences,
      totalReferenceAmount,
      totalPayments,
      totalPaymentAmount,
      avgDailyReferences: totalDays > 0 ? totalReferences / totalDays : 0,
      avgDailyPayments: totalDays > 0 ? totalPayments / totalDays : 0,
      avgDailyAmount: totalDays > 0 ? totalPaymentAmount / totalDays : 0,
      overallCollectionRate:
        totalReferenceAmount > 0 ? (totalPaymentAmount / totalReferenceAmount) * 100 : 0,
      currency: 'TZS',
      peakDay: peakDay.date,
      peakDayAmount: peakDay.amount,
    };

    return { data, summary };
  }

  private async generateDailyTrendsExcel(
    data: DailyTrendsRow[],
    summary: DailyTrendsReportSummary,
    filters: DailyTrendsReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Daily Trends', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Mwanga Hakika Bank - Daily Trends Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headers = ['Sn', 'Date', 'References', 'Ref Amount', 'Payments', 'Pay Amount', 'Collection Rate'];
    const headerRow = sheet.getRow(3);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0056B3' } };
    });

    const widths = [5, 12, 12, 18, 12, 18, 15];
    widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    data.forEach((row, index) => {
      const dataRow = sheet.getRow(index + 4);
      const values = [
        index + 1, row.date, row.referenceCount, row.referenceAmount,
        row.paymentCount, row.paymentAmount, `${row.collectionRate.toFixed(2)}%`,
      ];
      values.forEach((val, idx) => {
        const cell = dataRow.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
      });
      [4, 6].forEach((col) => { dataRow.getCell(col).numFmt = '#,##0.00'; });
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
  // TOP SERVICE PROVIDERS REPORT
  // ============================================
  async generateTopServiceProvidersReport(
    filters: TopServiceProvidersReportFilterDto,
  ): Promise<ReportResult> {
    this.logger.log(`Generating top service providers report: ${JSON.stringify(filters)}`);

    const { data, summary } = await this.queryTopServiceProvidersData(filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateTopServiceProvidersReportHtml(data, summary, filters);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `top-service-providers-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateTopServiceProvidersExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `top-service-providers-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async queryTopServiceProvidersData(
    filters: TopServiceProvidersReportFilterDto,
  ): Promise<{ data: TopServiceProviderRow[]; summary: TopServiceProvidersReportSummary }> {
    const limit = filters.limit || 10;

    const queryBuilder = this.referenceRepo
      .createQueryBuilder('ref')
      .leftJoin('ref.serviceProvider', 'sp')
      .select('sp.id', 'id')
      .addSelect('sp.spCode', 'spCode')
      .addSelect('sp.businessName', 'businessName')
      .addSelect('sp.businessType', 'businessType')
      .addSelect('COUNT(ref.id)', 'referenceCount')
      .addSelect('SUM(ref.amount)', 'totalBilled')
      .addSelect('SUM(ref.totalPaid)', 'totalCollected')
      .where('ref.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.businessType) {
      queryBuilder.andWhere('sp.businessType = :businessType', {
        businessType: filters.businessType,
      });
    }

    queryBuilder
      .groupBy('sp.id')
      .addGroupBy('sp.spCode')
      .addGroupBy('sp.businessName')
      .addGroupBy('sp.businessType')
      .orderBy('SUM(ref.totalPaid)', 'DESC')
      .limit(limit);

    const results = await queryBuilder.getRawMany();

    // Get payment counts
    const paymentQuery = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.reference', 'ref')
      .leftJoin('ref.serviceProvider', 'sp')
      .select('sp.id', 'id')
      .addSelect('COUNT(payment.id)', 'paymentCount')
      .where('payment.paidAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .groupBy('sp.id');

    const paymentResults = await paymentQuery.getRawMany();
    const paymentMap = new Map(
      paymentResults.map((p) => [p.id, parseInt(p.paymentCount)]),
    );

    const data: TopServiceProviderRow[] = results.map((row, index) => {
      const totalBilled = parseFloat(row.totalBilled) || 0;
      const totalCollected = parseFloat(row.totalCollected) || 0;
      return {
        rank: index + 1,
        spCode: row.spCode || '-',
        businessName: row.businessName || '-',
        businessType: row.businessType || '-',
        referenceCount: parseInt(row.referenceCount) || 0,
        paymentCount: paymentMap.get(row.id) || 0,
        totalBilled,
        totalCollected,
        collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
      };
    });

    const totalReferences = data.reduce((sum, r) => sum + r.referenceCount, 0);
    const totalPayments = data.reduce((sum, r) => sum + r.paymentCount, 0);
    const totalBilled = data.reduce((sum, r) => sum + r.totalBilled, 0);
    const totalCollected = data.reduce((sum, r) => sum + r.totalCollected, 0);

    const summary: TopServiceProvidersReportSummary = {
      totalServiceProviders: data.length,
      totalReferences,
      totalPayments,
      totalBilled,
      totalCollected,
      overallCollectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
      currency: 'TZS',
    };

    return { data, summary };
  }

  private async generateTopServiceProvidersExcel(
    data: TopServiceProviderRow[],
    summary: TopServiceProvidersReportSummary,
    filters: TopServiceProvidersReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Top Service Providers', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Mwanga Hakika Bank - Top Service Providers Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headers = ['Rank', 'SP Code', 'Business Name', 'Type', 'References', 'Payments', 'Total Billed', 'Collected', 'Rate'];
    const headerRow = sheet.getRow(3);
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0056B3' } };
    });

    const widths = [6, 10, 30, 15, 12, 12, 18, 18, 10];
    widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    data.forEach((row, index) => {
      const dataRow = sheet.getRow(index + 4);
      const values = [
        row.rank, row.spCode, row.businessName, row.businessType,
        row.referenceCount, row.paymentCount, row.totalBilled, row.totalCollected,
        `${row.collectionRate.toFixed(2)}%`,
      ];
      values.forEach((val, idx) => {
        const cell = dataRow.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 10 };
      });
      [7, 8].forEach((col) => { dataRow.getCell(col).numFmt = '#,##0.00'; });
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
  // COLLECTION RATE REPORT
  // ============================================
  async generateCollectionRateReport(
    filters: CollectionRateReportFilterDto,
  ): Promise<ReportResult> {
    this.logger.log(`Generating collection rate report: ${JSON.stringify(filters)}`);

    const { data, summary } = await this.queryCollectionRateData(filters);

    if (filters.format === ReportFormat.PDF) {
      const html = generateCollectionRateReportHtml(data, summary, filters);
      const buffer = await this.generatePdf(html);
      return {
        buffer,
        contentType: 'application/pdf',
        filename: `collection-rate-report-${Date.now()}.pdf`,
      };
    } else {
      const buffer = await this.generateCollectionRateExcel(data, summary, filters);
      return {
        buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `collection-rate-report-${Date.now()}.xlsx`,
      };
    }
  }

  private async queryCollectionRateData(
    filters: CollectionRateReportFilterDto,
  ): Promise<{ data: CollectionRateRow[]; summary: CollectionRateReportSummary }> {
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
      .leftJoin('ref.serviceProvider', 'sp')
      .select(dateFormat, 'period')
      .addSelect('COUNT(ref.id)', 'referenceCount')
      .addSelect(
        `SUM(CASE WHEN ref.status = '${ReferenceStatus.USED}' THEN 1 ELSE 0 END)`,
        'usedCount',
      )
      .addSelect('SUM(ref.amount)', 'totalBilled')
      .addSelect('SUM(ref.totalPaid)', 'totalCollected')
      .where('ref.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.serviceProviderId) {
      queryBuilder.andWhere('ref.serviceProviderId = :spId', {
        spId: filters.serviceProviderId,
      });
    }

    if (filters.businessType) {
      queryBuilder.andWhere('sp.businessType = :businessType', {
        businessType: filters.businessType,
      });
    }

    queryBuilder.groupBy(dateFormat).orderBy(dateFormat, 'ASC');

    const results = await queryBuilder.getRawMany();

    const data: CollectionRateRow[] = results.map((row) => {
      const totalBilled = parseFloat(row.totalBilled) || 0;
      const totalCollected = parseFloat(row.totalCollected) || 0;
      return {
        period: row.period,
        referenceCount: parseInt(row.referenceCount) || 0,
        usedCount: parseInt(row.usedCount) || 0,
        totalBilled,
        totalCollected,
        collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
      };
    });

    // Get business type breakdown
    const businessTypeQuery = this.referenceRepo
      .createQueryBuilder('ref')
      .leftJoin('ref.serviceProvider', 'sp')
      .select('sp.businessType', 'type')
      .addSelect('COUNT(ref.id)', 'count')
      .addSelect(
        `SUM(CASE WHEN ref.status = '${ReferenceStatus.USED}' THEN 1 ELSE 0 END)`,
        'usedCount',
      )
      .addSelect('SUM(ref.amount)', 'amount')
      .addSelect('SUM(ref.totalPaid)', 'collected')
      .where('ref.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo + 'T23:59:59'),
      });

    if (filters.serviceProviderId) {
      businessTypeQuery.andWhere('ref.serviceProviderId = :spId', {
        spId: filters.serviceProviderId,
      });
    }

    businessTypeQuery.groupBy('sp.businessType');

    const businessTypeResults = await businessTypeQuery.getRawMany();
    const byBusinessType = businessTypeResults.map((row) => {
      const amount = parseFloat(row.amount) || 0;
      const collected = parseFloat(row.collected) || 0;
      return {
        type: row.type || 'Unknown',
        count: parseInt(row.count) || 0,
        usedCount: parseInt(row.usedCount) || 0,
        amount,
        collected,
        rate: amount > 0 ? (collected / amount) * 100 : 0,
      };
    });

    const totalReferences = data.reduce((sum, r) => sum + r.referenceCount, 0);
    const totalUsed = data.reduce((sum, r) => sum + r.usedCount, 0);
    const totalBilled = data.reduce((sum, r) => sum + r.totalBilled, 0);
    const totalCollected = data.reduce((sum, r) => sum + r.totalCollected, 0);

    const summary: CollectionRateReportSummary = {
      totalReferences,
      totalUsed,
      totalBilled,
      totalCollected,
      overallCollectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
      currency: 'TZS',
      byBusinessType,
    };

    return { data, summary };
  }

  private async generateCollectionRateExcel(
    data: CollectionRateRow[],
    summary: CollectionRateReportSummary,
    filters: CollectionRateReportFilterDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UCG Report System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Collection Rate', {
      pageSetup: { orientation: 'landscape', paperSize: 9 },
    });

    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Mwanga Hakika Bank - Collection Rate Report';
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headers = ['Sn', 'Period', 'Total Refs', 'Paid Refs', 'Total Billed', 'Collected', 'Rate'];
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
        index + 1, row.period, row.referenceCount, row.usedCount,
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
