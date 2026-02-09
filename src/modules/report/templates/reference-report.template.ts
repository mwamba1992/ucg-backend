import {
  generateBaseHtml,
  formatDate,
  formatDateTime,
  formatCurrency,
  getRowClass,
} from './base.template';
import { ReferenceReportFilterDto } from '../dto/report-filter.dto';

export interface ReferenceReportData {
  id: string;
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  totalPaid: number;
  currency: string;
  status: string;
  paymentOption: string;
  installmentCount: number;
  expiresAt: Date | null;
  createdAt: Date;
  serviceProviderName?: string;
  spCode?: string;
}

export interface ReferenceReportSummary {
  totalReferences: number;
  activeReferences: number;
  usedReferences: number;
  expiredReferences: number;
  cancelledReferences: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  currency: string;
  collectionRate: number;
  byPaymentOption: { option: string; count: number; amount: number }[];
}

function getStatusClass(status: string): string {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'status-active';
    case 'USED':
      return 'status-success';
    case 'EXPIRED':
      return 'status-expired';
    case 'CANCELLED':
      return 'status-failed';
    default:
      return '';
  }
}

function getRemainingAmount(amount: number, totalPaid: number): number {
  return Math.max(0, Number(amount) - Number(totalPaid));
}

export function generateReferenceReportHtml(
  data: ReferenceReportData[],
  summary: ReferenceReportSummary,
  filters: ReferenceReportFilterDto,
): string {
  const filtersSummary = `
    <strong>Report Period:</strong> <span>${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}</span>
    ${filters.serviceProviderId ? `<strong>Service Provider:</strong> <span>${filters.serviceProviderId}</span>` : ''}
    ${filters.status ? `<strong>Status:</strong> <span>${filters.status}</span>` : ''}
    ${filters.paymentOption ? `<strong>Payment Option:</strong> <span>${filters.paymentOption}</span>` : ''}
    ${filters.customerName ? `<strong>Customer:</strong> <span>${filters.customerName}</span>` : ''}
  `;

  let tableRows = '';
  if (data.length === 0) {
    tableRows = '<tr><td colspan="12" class="no-data">No payment references found for the selected criteria</td></tr>';
  } else {
    tableRows = data
      .map(
        (ref, index) => `
        <tr class="${getRowClass(index)}">
          <td class="text-center">${index + 1}</td>
          <td>${ref.referenceNumber || '-'}</td>
          <td>${ref.customerName || '-'}</td>
          <td>${ref.customerPhone || '-'}</td>
          <td>${ref.serviceProviderName || '-'}</td>
          <td class="amount">${formatCurrency(ref.amount, ref.currency)}</td>
          <td class="amount">${formatCurrency(ref.totalPaid, ref.currency)}</td>
          <td class="amount">${formatCurrency(getRemainingAmount(ref.amount, ref.totalPaid), ref.currency)}</td>
          <td class="text-center">${ref.paymentOption || '-'}</td>
          <td class="text-center">${ref.installmentCount}</td>
          <td class="text-center ${getStatusClass(ref.status)}">${ref.status || '-'}</td>
          <td>${formatDate(ref.expiresAt)}</td>
        </tr>
      `,
      )
      .join('');
  }

  const paymentOptionBreakdown = summary.byPaymentOption
    .map(
      (opt) =>
        `<div class="summary-item">
          <div class="label">${opt.option}</div>
          <div class="value">${opt.count} (${formatCurrency(opt.amount, summary.currency)})</div>
        </div>`,
    )
    .join('');

  const content = `
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 40px">Sn</th>
          <th>Reference No</th>
          <th>Customer Name</th>
          <th>Phone</th>
          <th>Service Provider</th>
          <th class="text-right">Amount</th>
          <th class="text-right">Paid</th>
          <th class="text-right">Remaining</th>
          <th class="text-center">Pay Option</th>
          <th class="text-center">Installs</th>
          <th class="text-center">Status</th>
          <th>Expires</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${
          data.length > 0
            ? `
        <tr class="total-row">
          <td colspan="5" class="text-right"><strong>TOTALS</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.totalAmount, summary.currency)}</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.paidAmount, summary.currency)}</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.pendingAmount, summary.currency)}</strong></td>
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
          <div class="label">Total References</div>
          <div class="value">${summary.totalReferences.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Active</div>
          <div class="value status-active">${summary.activeReferences.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Used (Paid)</div>
          <div class="value status-success">${summary.usedReferences.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Expired</div>
          <div class="value status-expired">${summary.expiredReferences.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Cancelled</div>
          <div class="value status-failed">${summary.cancelledReferences.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Amount</div>
          <div class="value">${formatCurrency(summary.totalAmount, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Collected Amount</div>
          <div class="value">${formatCurrency(summary.paidAmount, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Collection Rate</div>
          <div class="value">${summary.collectionRate.toFixed(2)}%</div>
        </div>
      </div>
      ${
        summary.byPaymentOption.length > 0
          ? `
      <h4 style="margin-top: 15px;">By Payment Option</h4>
      <div class="summary-grid">
        ${paymentOptionBreakdown}
      </div>
      `
          : ''
      }
    </div>
  `;

  return generateBaseHtml(
    'Payment References Report',
    `Period: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`,
    content,
    filtersSummary,
  );
}
