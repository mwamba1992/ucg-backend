import {
  generateBaseHtml,
  formatDate,
  formatCurrency,
  getRowClass,
} from './base.template';
import { OutstandingReportFilterDto } from '../dto/report-filter.dto';

export interface OutstandingReportData {
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  serviceProviderName: string;
  spCode: string;
  amount: number;
  totalPaid: number;
  outstanding: number;
  currency: string;
  createdAt: Date;
  expiresAt: Date | null;
  ageInDays: number;
  ageingBucket: string;
}

export interface OutstandingReportSummary {
  totalReferences: number;
  totalOutstanding: number;
  currency: string;
  byAgeing: {
    bucket: string;
    count: number;
    amount: number;
  }[];
  byServiceProvider: {
    name: string;
    count: number;
    amount: number;
  }[];
}

function getAgeingClass(bucket: string): string {
  if (bucket === '90+') return 'status-failed';
  if (bucket === '61-90') return 'status-pending';
  return '';
}

export function generateOutstandingReportHtml(
  data: OutstandingReportData[],
  summary: OutstandingReportSummary,
  filters: OutstandingReportFilterDto,
): string {
  const filtersSummary = `
    ${filters.serviceProviderId ? `<strong>Service Provider:</strong> <span>${filters.serviceProviderId}</span>` : '<strong>Service Provider:</strong> <span>All</span>'}
    ${filters.ageingBucket ? `<strong>Ageing Bucket:</strong> <span>${filters.ageingBucket} days</span>` : '<strong>Ageing:</strong> <span>All</span>'}
    ${filters.minAmount ? `<strong>Min Amount:</strong> <span>${formatCurrency(filters.minAmount, summary.currency)}</span>` : ''}
  `;

  let tableRows = '';
  if (data.length === 0) {
    tableRows = '<tr><td colspan="10" class="no-data">No outstanding references found for the selected criteria</td></tr>';
  } else {
    tableRows = data
      .map(
        (row, index) => `
        <tr class="${getRowClass(index)}">
          <td class="text-center">${index + 1}</td>
          <td>${row.referenceNumber || '-'}</td>
          <td>${row.customerName || '-'}</td>
          <td>${row.customerPhone || '-'}</td>
          <td>${row.serviceProviderName || '-'}</td>
          <td class="amount">${formatCurrency(row.amount, row.currency)}</td>
          <td class="amount">${formatCurrency(row.totalPaid, row.currency)}</td>
          <td class="amount"><strong>${formatCurrency(row.outstanding, row.currency)}</strong></td>
          <td class="text-center">${row.ageInDays}</td>
          <td class="text-center ${getAgeingClass(row.ageingBucket)}"><strong>${row.ageingBucket}</strong></td>
        </tr>
      `,
      )
      .join('');
  }

  const ageingBreakdown = summary.byAgeing
    .map(
      (item) =>
        `<div class="summary-item">
          <div class="label">${item.bucket} Days</div>
          <div class="value">${item.count} refs (${formatCurrency(item.amount, summary.currency)})</div>
        </div>`,
    )
    .join('');

  const spBreakdown = summary.byServiceProvider
    .slice(0, 5)
    .map(
      (item) =>
        `<div class="summary-item">
          <div class="label">${item.name}</div>
          <div class="value">${item.count} refs (${formatCurrency(item.amount, summary.currency)})</div>
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
          <th class="text-right">Invoice Amt</th>
          <th class="text-right">Paid</th>
          <th class="text-right">Outstanding</th>
          <th class="text-center">Age (Days)</th>
          <th class="text-center">Bucket</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${
          data.length > 0
            ? `
        <tr class="total-row">
          <td colspan="7" class="text-right"><strong>TOTAL OUTSTANDING</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.totalOutstanding, summary.currency)}</strong></td>
          <td colspan="2"></td>
        </tr>
        `
            : ''
        }
      </tbody>
    </table>

    <div class="summary-section">
      <h4>Outstanding Summary</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total References</div>
          <div class="value">${summary.totalReferences.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Outstanding</div>
          <div class="value">${formatCurrency(summary.totalOutstanding, summary.currency)}</div>
        </div>
      </div>

      <h4 style="margin-top: 15px;">By Ageing Bucket</h4>
      <div class="summary-grid">
        ${ageingBreakdown}
      </div>

      ${
        spBreakdown
          ? `
      <h4 style="margin-top: 15px;">Top Service Providers with Outstanding</h4>
      <div class="summary-grid">
        ${spBreakdown}
      </div>
      `
          : ''
      }
    </div>
  `;

  return generateBaseHtml(
    'Outstanding Payments Report',
    `Total Outstanding: ${formatCurrency(summary.totalOutstanding, summary.currency)}`,
    content,
    filtersSummary,
  );
}
