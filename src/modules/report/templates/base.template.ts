import { UCG_LOGO_BASE64, COMPANY_INFO } from '../assets/logo';

// Common utility functions for templates
export function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAmount(amount: number | string | null): string {
  if (amount === null || amount === undefined) return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrency(amount: number | string | null, currency: string = 'TZS'): string {
  const formatted = formatAmount(amount);
  if (formatted === '-') return formatted;
  return `${currency} ${formatted}`;
}

export function formatPercentage(value: number | string | null): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return `${num.toFixed(2)}%`;
}

export function getRowClass(index: number): string {
  return index % 2 === 0 ? 'even' : 'odd';
}

// Base CSS styles for all reports
export const BASE_STYLES = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    padding: 20px 30px;
    line-height: 1.4;
  }

  .header {
    text-align: center;
    margin-bottom: 15px;
  }

  .header img {
    height: 60px;
    margin-bottom: 8px;
  }

  .header h1 {
    font-size: 18px;
    color: #1a1a1a;
    margin-bottom: 4px;
  }

  .header h2 {
    font-size: 14px;
    color: #333;
    font-weight: normal;
    margin-bottom: 4px;
  }

  .header h3 {
    font-size: 12px;
    color: #666;
    font-weight: normal;
  }

  .header-rule {
    border: none;
    height: 3px;
    background: linear-gradient(90deg, #0056b3, #007bff, #0056b3);
    margin-bottom: 15px;
  }

  .filters-section {
    background: #f5f5f5;
    padding: 10px 15px;
    border-radius: 4px;
    margin-bottom: 15px;
    font-size: 10px;
  }

  .filters-section strong {
    color: #333;
  }

  .filters-section span {
    margin-right: 20px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
  }

  th {
    background-color: #0056b3;
    color: #fff;
    font-weight: bold;
    font-size: 10px;
    text-align: left;
    padding: 8px 6px;
    border: 1px solid #004494;
    white-space: nowrap;
  }

  td {
    padding: 6px;
    border: 1px solid #ddd;
    font-size: 10px;
    vertical-align: top;
  }

  tr.even {
    background-color: #fff;
  }

  tr.odd {
    background-color: #f9f9f9;
  }

  tr:hover {
    background-color: #e8f4ff;
  }

  .text-right {
    text-align: right;
  }

  .text-center {
    text-align: center;
  }

  .amount {
    text-align: right;
    font-family: 'Courier New', monospace;
  }

  .status-success {
    color: #28a745;
    font-weight: bold;
  }

  .status-failed {
    color: #dc3545;
    font-weight: bold;
  }

  .status-pending {
    color: #ffc107;
    font-weight: bold;
  }

  .status-active {
    color: #007bff;
    font-weight: bold;
  }

  .status-expired {
    color: #6c757d;
    font-weight: bold;
  }

  .summary-section {
    margin-top: 15px;
    padding: 12px 15px;
    background: #f0f7ff;
    border-radius: 4px;
    border-left: 4px solid #0056b3;
  }

  .summary-section h4 {
    font-size: 12px;
    color: #0056b3;
    margin-bottom: 8px;
  }

  .summary-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }

  .summary-item {
    min-width: 150px;
  }

  .summary-item .label {
    font-size: 9px;
    color: #666;
    text-transform: uppercase;
  }

  .summary-item .value {
    font-size: 14px;
    font-weight: bold;
    color: #1a1a1a;
  }

  .footer {
    position: fixed;
    bottom: 15px;
    left: 30px;
    right: 30px;
    font-size: 9px;
    color: #666;
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #ddd;
    padding-top: 8px;
  }

  .total-row {
    background-color: #e8f4ff !important;
    font-weight: bold;
  }

  .total-row td {
    border-top: 2px solid #0056b3;
  }

  .no-data {
    text-align: center;
    padding: 40px;
    color: #666;
    font-style: italic;
  }
`;

// Generate base HTML wrapper
export function generateBaseHtml(
  title: string,
  subtitle: string,
  content: string,
  filtersSummary: string,
  generatedAt: Date = new Date(),
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="header">
    <img src="${UCG_LOGO_BASE64}" alt="${COMPANY_INFO.name} Logo"/>
    <h1>${COMPANY_INFO.name}</h1>
    <h2>${title}</h2>
    <h3>${subtitle}</h3>
  </div>

  <hr class="header-rule"/>

  <div class="filters-section">
    ${filtersSummary}
  </div>

  ${content}

  <div class="footer">
    <span>${COMPANY_INFO.systemName} | ${COMPANY_INFO.name}</span>
    <span>Generated: ${formatDateTime(generatedAt)}</span>
  </div>
</body>
</html>`;
}
