import {
  generateBaseHtml,
  formatDate,
  formatCurrency,
  formatPercentage,
  getRowClass,
} from './base.template';
import { DailyTrendsReportFilterDto } from '../dto/report-filter.dto';

export interface DailyTrendsRow {
  date: string;
  referenceCount: number;
  referenceAmount: number;
  paymentCount: number;
  paymentAmount: number;
  collectionRate: number;
}

export interface DailyTrendsReportSummary {
  totalDays: number;
  totalReferences: number;
  totalReferenceAmount: number;
  totalPayments: number;
  totalPaymentAmount: number;
  avgDailyReferences: number;
  avgDailyPayments: number;
  avgDailyAmount: number;
  overallCollectionRate: number;
  currency: string;
  peakDay: string;
  peakDayAmount: number;
}

export function generateDailyTrendsReportHtml(
  data: DailyTrendsRow[],
  summary: DailyTrendsReportSummary,
  filters: DailyTrendsReportFilterDto,
): string {
  const filtersSummary = `
    <strong>Report Period:</strong> <span>${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}</span>
    ${filters.serviceProviderId ? `<strong>Service Provider:</strong> <span>${filters.serviceProviderId}</span>` : ''}
  `;

  let tableRows = '';
  if (data.length === 0) {
    tableRows = '<tr><td colspan="7" class="no-data">No daily trends data found for the selected criteria</td></tr>';
  } else {
    tableRows = data
      .map(
        (row, index) => `
        <tr class="${getRowClass(index)}">
          <td class="text-center">${index + 1}</td>
          <td><strong>${row.date}</strong></td>
          <td class="text-center">${row.referenceCount.toLocaleString()}</td>
          <td class="amount">${formatCurrency(row.referenceAmount, summary.currency)}</td>
          <td class="text-center">${row.paymentCount.toLocaleString()}</td>
          <td class="amount">${formatCurrency(row.paymentAmount, summary.currency)}</td>
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
          <th class="text-center" style="width: 40px">Sn</th>
          <th>Date</th>
          <th class="text-center">References</th>
          <th class="text-right">Ref Amount</th>
          <th class="text-center">Payments</th>
          <th class="text-right">Pay Amount</th>
          <th class="text-center">Collection Rate</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${
          data.length > 0
            ? `
        <tr class="total-row">
          <td colspan="2" class="text-right"><strong>TOTALS</strong></td>
          <td class="text-center"><strong>${summary.totalReferences.toLocaleString()}</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.totalReferenceAmount, summary.currency)}</strong></td>
          <td class="text-center"><strong>${summary.totalPayments.toLocaleString()}</strong></td>
          <td class="amount"><strong>${formatCurrency(summary.totalPaymentAmount, summary.currency)}</strong></td>
          <td class="text-center"><strong>${formatPercentage(summary.overallCollectionRate)}</strong></td>
        </tr>
        `
            : ''
        }
      </tbody>
    </table>

    <div class="summary-section">
      <h4>Daily Trends Summary</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Days</div>
          <div class="value">${summary.totalDays}</div>
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
          <div class="label">Total Ref Amount</div>
          <div class="value">${formatCurrency(summary.totalReferenceAmount, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Pay Amount</div>
          <div class="value">${formatCurrency(summary.totalPaymentAmount, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Collection Rate</div>
          <div class="value">${formatPercentage(summary.overallCollectionRate)}</div>
        </div>
      </div>

      <h4 style="margin-top: 15px;">Daily Averages</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Avg Daily References</div>
          <div class="value">${summary.avgDailyReferences.toFixed(1)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Avg Daily Payments</div>
          <div class="value">${summary.avgDailyPayments.toFixed(1)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Avg Daily Amount</div>
          <div class="value">${formatCurrency(summary.avgDailyAmount, summary.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Peak Day</div>
          <div class="value">${summary.peakDay} (${formatCurrency(summary.peakDayAmount, summary.currency)})</div>
        </div>
      </div>
    </div>
  `;

  return generateBaseHtml(
    'Daily Trends Report',
    `Period: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`,
    content,
    filtersSummary,
  );
}
