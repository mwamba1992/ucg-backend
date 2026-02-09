import {
  generateBaseHtml,
  formatDate,
  formatCurrency,
  formatPercentage,
  getRowClass,
} from './base.template';
import { CollectionRateReportFilterDto, GroupBy } from '../dto/report-filter.dto';

export interface CollectionRateRow {
  period: string;
  businessType?: string;
  referenceCount: number;
  usedCount: number;
  totalBilled: number;
  totalCollected: number;
  collectionRate: number;
}

export interface CollectionRateReportSummary {
  totalReferences: number;
  totalUsed: number;
  totalBilled: number;
  totalCollected: number;
  overallCollectionRate: number;
  currency: string;
  byBusinessType: {
    type: string;
    count: number;
    usedCount: number;
    amount: number;
    collected: number;
    rate: number;
  }[];
}

function getRateClass(rate: number): string {
  if (rate >= 80) return 'status-success';
  if (rate >= 50) return 'status-pending';
  return 'status-failed';
}

export function generateCollectionRateReportHtml(
  data: CollectionRateRow[],
  summary: CollectionRateReportSummary,
  filters: CollectionRateReportFilterDto,
): string {
  const filtersSummary = `
    <strong>Report Period:</strong> <span>${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}</span>
    ${filters.serviceProviderId ? `<strong>Service Provider:</strong> <span>${filters.serviceProviderId}</span>` : ''}
    ${filters.businessType ? `<strong>Business Type:</strong> <span>${filters.businessType}</span>` : ''}
    <strong>Grouped By:</strong> <span>${filters.groupBy || 'Day'}</span>
  `;

  let tableRows = '';
  if (data.length === 0) {
    tableRows = '<tr><td colspan="7" class="no-data">No collection data found for the selected criteria</td></tr>';
  } else {
    tableRows = data
      .map(
        (row, index) => `
        <tr class="${getRowClass(index)}">
          <td class="text-center">${index + 1}</td>
          <td><strong>${row.period}</strong></td>
          <td class="text-center">${row.referenceCount.toLocaleString()}</td>
          <td class="text-center">${row.usedCount.toLocaleString()}</td>
          <td class="amount">${formatCurrency(row.totalBilled, summary.currency)}</td>
          <td class="amount">${formatCurrency(row.totalCollected, summary.currency)}</td>
          <td class="text-center ${getRateClass(row.collectionRate)}"><strong>${formatPercentage(row.collectionRate)}</strong></td>
        </tr>
      `,
      )
      .join('');
  }

  const businessTypeBreakdown = summary.byBusinessType
    .map(
      (item) =>
        `<tr class="${getRowClass(summary.byBusinessType.indexOf(item))}">
          <td><strong>${item.type}</strong></td>
          <td class="text-center">${item.count.toLocaleString()}</td>
          <td class="text-center">${item.usedCount.toLocaleString()}</td>
          <td class="amount">${formatCurrency(item.amount, summary.currency)}</td>
          <td class="amount">${formatCurrency(item.collected, summary.currency)}</td>
          <td class="text-center ${getRateClass(item.rate)}"><strong>${formatPercentage(item.rate)}</strong></td>
        </tr>`,
    )
    .join('');

  const content = `
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 40px">Sn</th>
          <th>Period</th>
          <th class="text-center">Total Refs</th>
          <th class="text-center">Paid Refs</th>
          <th class="text-right">Total Billed</th>
          <th class="text-right">Collected</th>
          <th class="text-center">Collection Rate</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${
          data.length > 0
            ? `
        <tr class="total-row">
          <td colspan="2" class="text-right"><strong>OVERALL</strong></td>
          <td class="text-center"><strong>${summary.totalReferences.toLocaleString()}</strong></td>
          <td class="text-center"><strong>${summary.totalUsed.toLocaleString()}</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.totalBilled, summary.currency)}</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.totalCollected, summary.currency)}</strong></td>
          <td class="text-center ${getRateClass(summary.overallCollectionRate)}"><strong>${formatPercentage(summary.overallCollectionRate)}</strong></td>
        </tr>
        `
            : ''
        }
      </tbody>
    </table>

    ${
      summary.byBusinessType.length > 0
        ? `
    <div class="summary-section">
      <h4>Collection Rate by Business Type</h4>
      <table>
        <thead>
          <tr>
            <th>Business Type</th>
            <th class="text-center">Total Refs</th>
            <th class="text-center">Paid Refs</th>
            <th class="text-right">Total Billed</th>
            <th class="text-right">Collected</th>
            <th class="text-center">Rate</th>
          </tr>
        </thead>
        <tbody>
          ${businessTypeBreakdown}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <div class="summary-section">
      <h4>Collection Summary</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total References</div>
          <div class="value">${summary.totalReferences.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Paid References</div>
          <div class="value">${summary.totalUsed.toLocaleString()}</div>
        </div>
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
          <div class="label">Overall Collection Rate</div>
          <div class="value ${getRateClass(summary.overallCollectionRate)}">${formatPercentage(summary.overallCollectionRate)}</div>
        </div>
      </div>
    </div>
  `;

  return generateBaseHtml(
    'Collection Rate Report',
    `Period: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`,
    content,
    filtersSummary,
  );
}
