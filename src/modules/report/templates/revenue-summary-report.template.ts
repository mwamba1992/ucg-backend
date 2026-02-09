import {
  generateBaseHtml,
  formatDate,
  formatCurrency,
  formatPercentage,
  getRowClass,
} from './base.template';
import { RevenueSummaryReportFilterDto, GroupBy } from '../dto/report-filter.dto';

export interface RevenueSummaryRow {
  period: string;
  referenceCount: number;
  paymentCount: number;
  totalBilled: number;
  totalCollected: number;
  collectionRate: number;
  successRate: number;
}

export interface RevenueSummaryReportSummary {
  totalBilled: number;
  totalCollected: number;
  totalReferences: number;
  totalPayments: number;
  overallCollectionRate: number;
  overallSuccessRate: number;
  currency: string;
  byServiceProvider?: { name: string; amount: number; count: number }[];
}

function getGroupLabel(groupBy: GroupBy | undefined): string {
  switch (groupBy) {
    case GroupBy.DAY:
      return 'Date';
    case GroupBy.WEEK:
      return 'Week';
    case GroupBy.MONTH:
      return 'Month';
    default:
      return 'Period';
  }
}

export function generateRevenueSummaryReportHtml(
  data: RevenueSummaryRow[],
  summary: RevenueSummaryReportSummary,
  filters: RevenueSummaryReportFilterDto,
): string {
  const filtersSummary = `
    <strong>Report Period:</strong> <span>${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}</span>
    ${filters.serviceProviderId ? `<strong>Service Provider:</strong> <span>${filters.serviceProviderId}</span>` : ''}
    <strong>Grouped By:</strong> <span>${filters.groupBy || 'Day'}</span>
  `;

  const groupLabel = getGroupLabel(filters.groupBy);

  let tableRows = '';
  if (data.length === 0) {
    tableRows = '<tr><td colspan="7" class="no-data">No revenue data found for the selected criteria</td></tr>';
  } else {
    tableRows = data
      .map(
        (row, index) => `
        <tr class="${getRowClass(index)}">
          <td class="text-center">${index + 1}</td>
          <td>${row.period || '-'}</td>
          <td class="text-center">${row.referenceCount.toLocaleString()}</td>
          <td class="text-center">${row.paymentCount.toLocaleString()}</td>
          <td class="amount">${formatCurrency(row.totalBilled, summary.currency)}</td>
          <td class="amount">${formatCurrency(row.totalCollected, summary.currency)}</td>
          <td class="text-center">${formatPercentage(row.collectionRate)}</td>
        </tr>
      `,
      )
      .join('');
  }

  const spBreakdown =
    summary.byServiceProvider && summary.byServiceProvider.length > 0
      ? summary.byServiceProvider
          .slice(0, 10) // Top 10
          .map(
            (sp) =>
              `<div class="summary-item">
              <div class="label">${sp.name}</div>
              <div class="value">${formatCurrency(sp.amount, summary.currency)} (${sp.count})</div>
            </div>`,
          )
          .join('')
      : '';

  const content = `
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 40px">Sn</th>
          <th>${groupLabel}</th>
          <th class="text-center">References</th>
          <th class="text-center">Payments</th>
          <th class="text-right">Total Billed</th>
          <th class="text-right">Total Collected</th>
          <th class="text-center">Collection Rate</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${
          data.length > 0
            ? `
        <tr class="total-row">
          <td colspan="2" class="text-right"><strong>GRAND TOTAL</strong></td>
          <td class="text-center"><strong>${summary.totalReferences.toLocaleString()}</strong></td>
          <td class="text-center"><strong>${summary.totalPayments.toLocaleString()}</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.totalBilled, summary.currency)}</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.totalCollected, summary.currency)}</strong></td>
          <td class="text-center"><strong>${formatPercentage(summary.overallCollectionRate)}</strong></td>
        </tr>
        `
            : ''
        }
      </tbody>
    </table>

    <div class="summary-section">
      <h4>Revenue Summary</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Billed</div>
          <div class="value">${formatCurrency(summary.totalBilled, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Collected</div>
          <div class="value">${formatCurrency(summary.totalCollected, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Outstanding</div>
          <div class="value">${formatCurrency(summary.totalBilled - summary.totalCollected, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Collection Rate</div>
          <div class="value">${formatPercentage(summary.overallCollectionRate)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total References</div>
          <div class="value">${summary.totalReferences.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Payments</div>
          <div class="value">${summary.totalPayments.toLocaleString()}</div>
        </div>
      </div>
      ${
        spBreakdown
          ? `
      <h4 style="margin-top: 15px;">Top Service Providers by Revenue</h4>
      <div class="summary-grid">
        ${spBreakdown}
      </div>
      `
          : ''
      }
    </div>
  `;

  return generateBaseHtml(
    'Revenue Summary Report',
    `Period: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`,
    content,
    filtersSummary,
  );
}
