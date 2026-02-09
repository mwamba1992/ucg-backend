import {
  generateBaseHtml,
  formatDate,
  formatCurrency,
  formatPercentage,
  getRowClass,
} from './base.template';
import { ChannelPerformanceReportFilterDto } from '../dto/report-filter.dto';

export interface ChannelPerformanceRow {
  channel: string;
  transactionCount: number;
  successfulCount: number;
  failedCount: number;
  totalAmount: number;
  successfulAmount: number;
  successRate: number;
  avgTransactionAmount: number;
}

export interface ChannelPerformanceReportSummary {
  totalTransactions: number;
  totalSuccessful: number;
  totalFailed: number;
  totalAmount: number;
  totalSuccessfulAmount: number;
  overallSuccessRate: number;
  currency: string;
  topChannel: string;
}

export function generateChannelPerformanceReportHtml(
  data: ChannelPerformanceRow[],
  summary: ChannelPerformanceReportSummary,
  filters: ChannelPerformanceReportFilterDto,
): string {
  const filtersSummary = `
    <strong>Report Period:</strong> <span>${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}</span>
    ${filters.serviceProviderId ? `<strong>Service Provider:</strong> <span>${filters.serviceProviderId}</span>` : ''}
    ${filters.channel ? `<strong>Channel:</strong> <span>${filters.channel}</span>` : '<strong>Channels:</strong> <span>All</span>'}
  `;

  let tableRows = '';
  if (data.length === 0) {
    tableRows = '<tr><td colspan="8" class="no-data">No channel performance data found for the selected criteria</td></tr>';
  } else {
    tableRows = data
      .map(
        (row, index) => `
        <tr class="${getRowClass(index)}">
          <td class="text-center">${index + 1}</td>
          <td><strong>${row.channel || '-'}</strong></td>
          <td class="text-center">${row.transactionCount.toLocaleString()}</td>
          <td class="text-center status-success">${row.successfulCount.toLocaleString()}</td>
          <td class="text-center status-failed">${row.failedCount.toLocaleString()}</td>
          <td class="amount">${formatCurrency(row.totalAmount, summary.currency)}</td>
          <td class="amount">${formatCurrency(row.avgTransactionAmount, summary.currency)}</td>
          <td class="text-center">${formatPercentage(row.successRate)}</td>
        </tr>
      `,
      )
      .join('');
  }

  const content = `
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 40px">Sn</th>
          <th>Channel</th>
          <th class="text-center">Total Txns</th>
          <th class="text-center">Successful</th>
          <th class="text-center">Failed</th>
          <th class="text-right">Total Amount</th>
          <th class="text-right">Avg Amount</th>
          <th class="text-center">Success Rate</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${
          data.length > 0
            ? `
        <tr class="total-row">
          <td colspan="2" class="text-right"><strong>TOTAL</strong></td>
          <td class="text-center"><strong>${summary.totalTransactions.toLocaleString()}</strong></td>
          <td class="text-center"><strong>${summary.totalSuccessful.toLocaleString()}</strong></td>
          <td class="text-center"><strong>${summary.totalFailed.toLocaleString()}</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.totalAmount, summary.currency)}</strong></td>
          <td class="amount">-</td>
          <td class="text-center"><strong>${formatPercentage(summary.overallSuccessRate)}</strong></td>
        </tr>
        `
            : ''
        }
      </tbody>
    </table>

    <div class="summary-section">
      <h4>Channel Performance Summary</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Transactions</div>
          <div class="value">${summary.totalTransactions.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Successful Transactions</div>
          <div class="value status-success">${summary.totalSuccessful.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Failed Transactions</div>
          <div class="value status-failed">${summary.totalFailed.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Volume</div>
          <div class="value">${formatCurrency(summary.totalAmount, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Successful Volume</div>
          <div class="value">${formatCurrency(summary.totalSuccessfulAmount, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Overall Success Rate</div>
          <div class="value">${formatPercentage(summary.overallSuccessRate)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Top Performing Channel</div>
          <div class="value">${summary.topChannel || '-'}</div>
        </div>
      </div>
    </div>
  `;

  return generateBaseHtml(
    'Channel Performance Report',
    `Period: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`,
    content,
    filtersSummary,
  );
}
