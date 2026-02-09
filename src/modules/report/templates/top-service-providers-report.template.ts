import {
  generateBaseHtml,
  formatDate,
  formatCurrency,
  formatPercentage,
  getRowClass,
} from './base.template';
import { TopServiceProvidersReportFilterDto } from '../dto/report-filter.dto';

export interface TopServiceProviderRow {
  rank: number;
  spCode: string;
  businessName: string;
  businessType: string;
  referenceCount: number;
  paymentCount: number;
  totalBilled: number;
  totalCollected: number;
  collectionRate: number;
}

export interface TopServiceProvidersReportSummary {
  totalServiceProviders: number;
  totalReferences: number;
  totalPayments: number;
  totalBilled: number;
  totalCollected: number;
  overallCollectionRate: number;
  currency: string;
}

export function generateTopServiceProvidersReportHtml(
  data: TopServiceProviderRow[],
  summary: TopServiceProvidersReportSummary,
  filters: TopServiceProvidersReportFilterDto,
): string {
  const filtersSummary = `
    <strong>Report Period:</strong> <span>${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}</span>
    <strong>Top:</strong> <span>${filters.limit || 10} Service Providers</span>
    ${filters.businessType ? `<strong>Business Type:</strong> <span>${filters.businessType}</span>` : ''}
  `;

  let tableRows = '';
  if (data.length === 0) {
    tableRows = '<tr><td colspan="9" class="no-data">No service provider data found for the selected criteria</td></tr>';
  } else {
    tableRows = data
      .map(
        (row, index) => `
        <tr class="${getRowClass(index)}">
          <td class="text-center"><strong>#${row.rank}</strong></td>
          <td>${row.spCode || '-'}</td>
          <td><strong>${row.businessName || '-'}</strong></td>
          <td>${row.businessType || '-'}</td>
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

  const content = `
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 50px">Rank</th>
          <th>SP Code</th>
          <th>Business Name</th>
          <th>Type</th>
          <th class="text-center">References</th>
          <th class="text-center">Payments</th>
          <th class="text-right">Total Billed</th>
          <th class="text-right">Collected</th>
          <th class="text-center">Rate</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${
          data.length > 0
            ? `
        <tr class="total-row">
          <td colspan="4" class="text-right"><strong>TOTALS (Top ${data.length})</strong></td>
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
      <h4>Top Service Providers Summary</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Service Providers Shown</div>
          <div class="value">${data.length}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total References</div>
          <div class="value">${summary.totalReferences.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Payments</div>
          <div class="value">${summary.totalPayments.toLocaleString()}</div>
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
          <div class="label">Overall Collection Rate</div>
          <div class="value">${formatPercentage(summary.overallCollectionRate)}</div>
        </div>
      </div>
    </div>
  `;

  return generateBaseHtml(
    'Top Service Providers Report',
    `Period: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`,
    content,
    filtersSummary,
  );
}
