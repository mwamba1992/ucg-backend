import {
  generateBaseHtml,
  formatDate,
  formatDateTime,
  getRowClass,
} from './base.template';
import { ServiceProviderReportFilterDto } from '../dto/report-filter.dto';

export interface ServiceProviderReportData {
  id: string;
  spCode: string;
  businessName: string;
  businessType: string;
  registrationNumber: string;
  tinNumber: string;
  phoneNumber: string;
  email: string;
  region: string;
  district: string;
  status: string;
  isActive: boolean;
  createdAt: Date;
  approvedAt: Date | null;
  contactName?: string;
  contactPhone?: string;
}

export interface ServiceProviderReportSummary {
  totalServiceProviders: number;
  activeServiceProviders: number;
  pendingServiceProviders: number;
  suspendedServiceProviders: number;
  byBusinessType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byRegion: { region: string; count: number }[];
}

function getStatusClass(status: string): string {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
    case 'APPROVED':
      return 'status-success';
    case 'PENDING':
    case 'UNDER_REVIEW':
    case 'KYC_VERIFICATION':
      return 'status-pending';
    case 'REJECTED':
    case 'SUSPENDED':
      return 'status-failed';
    default:
      return '';
  }
}

export function generateServiceProviderReportHtml(
  data: ServiceProviderReportData[],
  summary: ServiceProviderReportSummary,
  filters: ServiceProviderReportFilterDto,
): string {
  const filtersSummary = `
    ${filters.status ? `<strong>Status:</strong> <span>${filters.status}</span>` : '<strong>Status:</strong> <span>All</span>'}
    ${filters.businessType ? `<strong>Business Type:</strong> <span>${filters.businessType}</span>` : ''}
    ${filters.region ? `<strong>Region:</strong> <span>${filters.region}</span>` : ''}
    ${filters.district ? `<strong>District:</strong> <span>${filters.district}</span>` : ''}
    ${filters.isActive !== undefined ? `<strong>Active:</strong> <span>${filters.isActive ? 'Yes' : 'No'}</span>` : ''}
  `;

  let tableRows = '';
  if (data.length === 0) {
    tableRows = '<tr><td colspan="12" class="no-data">No service providers found for the selected criteria</td></tr>';
  } else {
    tableRows = data
      .map(
        (sp, index) => `
        <tr class="${getRowClass(index)}">
          <td class="text-center">${index + 1}</td>
          <td>${sp.spCode || '-'}</td>
          <td>${sp.businessName || '-'}</td>
          <td>${sp.businessType || '-'}</td>
          <td>${sp.registrationNumber || '-'}</td>
          <td>${sp.tinNumber || '-'}</td>
          <td>${sp.phoneNumber || '-'}</td>
          <td>${sp.email || '-'}</td>
          <td>${sp.region || '-'}</td>
          <td class="text-center ${getStatusClass(sp.status)}">${sp.status || '-'}</td>
          <td class="text-center">${sp.isActive ? 'Yes' : 'No'}</td>
          <td>${formatDate(sp.createdAt)}</td>
        </tr>
      `,
      )
      .join('');
  }

  const businessTypeBreakdown = summary.byBusinessType
    .map(
      (bt) =>
        `<div class="summary-item">
          <div class="label">${bt.type}</div>
          <div class="value">${bt.count}</div>
        </div>`,
    )
    .join('');

  const statusBreakdown = summary.byStatus
    .map(
      (s) =>
        `<div class="summary-item">
          <div class="label">${s.status}</div>
          <div class="value">${s.count}</div>
        </div>`,
    )
    .join('');

  const regionBreakdown = summary.byRegion
    .slice(0, 10) // Top 10 regions
    .map(
      (r) =>
        `<div class="summary-item">
          <div class="label">${r.region || 'Unknown'}</div>
          <div class="value">${r.count}</div>
        </div>`,
    )
    .join('');

  const content = `
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 40px">Sn</th>
          <th>SP Code</th>
          <th>Business Name</th>
          <th>Type</th>
          <th>Reg. Number</th>
          <th>TIN</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Region</th>
          <th class="text-center">Status</th>
          <th class="text-center">Active</th>
          <th>Registered</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="summary-section">
      <h4>Summary</h4>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Service Providers</div>
          <div class="value">${summary.totalServiceProviders.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Active</div>
          <div class="value status-success">${summary.activeServiceProviders.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Pending</div>
          <div class="value status-pending">${summary.pendingServiceProviders.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="label">Suspended</div>
          <div class="value status-failed">${summary.suspendedServiceProviders.toLocaleString()}</div>
        </div>
      </div>
      ${
        summary.byBusinessType.length > 0
          ? `
      <h4 style="margin-top: 15px;">By Business Type</h4>
      <div class="summary-grid">
        ${businessTypeBreakdown}
      </div>
      `
          : ''
      }
      ${
        summary.byStatus.length > 0
          ? `
      <h4 style="margin-top: 15px;">By Status</h4>
      <div class="summary-grid">
        ${statusBreakdown}
      </div>
      `
          : ''
      }
      ${
        summary.byRegion.length > 0
          ? `
      <h4 style="margin-top: 15px;">Top Regions</h4>
      <div class="summary-grid">
        ${regionBreakdown}
      </div>
      `
          : ''
      }
    </div>
  `;

  return generateBaseHtml(
    'Service Providers Report',
    `Total: ${summary.totalServiceProviders} Service Providers`,
    content,
    filtersSummary,
  );
}
