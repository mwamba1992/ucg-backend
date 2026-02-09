import {
  generateBaseHtml,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatAmount,
  getRowClass,
} from './base.template';
import { PaymentReportFilterDto } from '../dto/report-filter.dto';

export interface PaymentReportData {
  id: string;
  referenceNumber: string;
  payerName: string;
  payerPhone: string;
  amountPaid: number;
  currency: string;
  status: string;
  paymentChannel: string;
  fspCode: string;
  paidAt: Date;
  serviceProviderName?: string;
  spCode?: string;
}

export interface PaymentReportSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalAmount: number;
  successfulAmount: number;
  currency: string;
  successRate: number;
  byChannel: { channel: string; count: number; amount: number }[];
}

function getStatusClass(status: string): string {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':
      return 'status-success';
    case 'FAILED':
    case 'REVERSED':
      return 'status-failed';
    case 'PENDING':
      return 'status-pending';
    default:
      return '';
  }
}

export function generatePaymentReportHtml(
  data: PaymentReportData[],
  summary: PaymentReportSummary,
  filters: PaymentReportFilterDto,
): string {
  const filtersSummary = `
    <strong>Report Period:</strong> <span>${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}</span>
    ${filters.serviceProviderId ? `<strong>Service Provider:</strong> <span>${filters.serviceProviderId}</span>` : ''}
    ${filters.status ? `<strong>Status:</strong> <span>${filters.status}</span>` : ''}
    ${filters.channel ? `<strong>Channel:</strong> <span>${filters.channel}</span>` : ''}
    ${filters.fspCode ? `<strong>FSP:</strong> <span>${filters.fspCode}</span>` : ''}
  `;

  let tableRows = '';
  if (data.length === 0) {
    tableRows = '<tr><td colspan="10" class="no-data">No payment transactions found for the selected criteria</td></tr>';
  } else {
    tableRows = data
      .map(
        (payment, index) => `
        <tr class="${getRowClass(index)}">
          <td class="text-center">${index + 1}</td>
          <td>${payment.referenceNumber || '-'}</td>
          <td>${payment.payerName || '-'}</td>
          <td>${payment.payerPhone || '-'}</td>
          <td>${payment.serviceProviderName || '-'}</td>
          <td class="amount">${formatCurrency(payment.amountPaid, payment.currency)}</td>
          <td class="text-center">${payment.paymentChannel || '-'}</td>
          <td class="text-center">${payment.fspCode || '-'}</td>
          <td class="text-center ${getStatusClass(payment.status)}">${payment.status || '-'}</td>
          <td>${formatDateTime(payment.paidAt)}</td>
        </tr>
      `,
      )
      .join('');
  }

  const channelBreakdown = summary.byChannel
    .map(
      (ch) =>
        `<div class="summary-item">
          <div class="label">${ch.channel}</div>
          <div class="value">${ch.count} (${formatCurrency(ch.amount, summary.currency)})</div>
        </div>`,
    )
    .join('');

  const content = `
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 40px">Sn</th>
          <th>Reference No</th>
          <th>Payer Name</th>
          <th>Phone</th>
          <th>Service Provider</th>
          <th class="text-right">Amount</th>
          <th class="text-center">Channel</th>
          <th class="text-center">FSP</th>
          <th class="text-center">Status</th>
          <th>Paid At</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${
          data.length > 0
            ? `
        <tr class="total-row">
          <td colspan="5" class="text-right"><strong>TOTAL</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.totalAmount, summary.currency)}</strong></td>
          <td colspan="4"></td>
        </tr>
        `
            : ''
        }
      </tbody>
    </table>

    <div class="summary-section">
      <h4>Summary</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Transactions</div>
          <div class="value">${summary.totalTransactions.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Successful</div>
          <div class="value status-success">${summary.successfulTransactions.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Failed</div>
          <div class="value status-failed">${summary.failedTransactions.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Pending</div>
          <div class="value status-pending">${summary.pendingTransactions.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Amount</div>
          <div class="value">${formatCurrency(summary.totalAmount, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Successful Amount</div>
          <div class="value">${formatCurrency(summary.successfulAmount, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Success Rate</div>
          <div class="value">${summary.successRate.toFixed(2)}%</div>
        </div>
      </div>
      ${
        summary.byChannel.length > 0
          ? `
      <h4 style="margin-top: 15px;">By Channel</h4>
      <div class="summary-grid">
        ${channelBreakdown}
      </div>
      `
          : ''
      }
    </div>
  `;

  return generateBaseHtml(
    'Payment Transactions Report',
    `Period: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`,
    content,
    filtersSummary,
  );
}
