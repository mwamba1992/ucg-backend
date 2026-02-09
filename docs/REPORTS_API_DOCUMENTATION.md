# UCG Reports API Documentation

## Overview

The UCG Reports API provides comprehensive reporting capabilities for both Admin users and Service Provider (SP) users. All reports support **PDF** and **Excel** export formats.

---

## Authentication

### Admin Reports
- **Authentication**: Bearer JWT Token
- **Header**: `Authorization: Bearer <token>`
- **Roles Required**: Varies by endpoint (see individual endpoints)

### SP Reports
- **Authentication**: SP JWT Token
- **Header**: `Authorization: Bearer <sp_token>`
- **Note**: Service Provider ID is automatically extracted from the token

---

## Response Format

All report endpoints return binary file data with appropriate headers:

```
Content-Type: application/pdf
  OR
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

Content-Disposition: attachment; filename="<report-name>-<timestamp>.pdf"
Content-Length: <file-size>
```

---

## Common Enums

### ReportFormat
```typescript
enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL'
}
```

### PaymentChannel
```typescript
enum PaymentChannel {
  MPESA = 'MPESA',
  TIGO = 'TIGO',
  BANK = 'BANK',
  APEF = 'APEF'
}
```

### GroupBy
```typescript
enum GroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}
```

### AgeingBucket
```typescript
enum AgeingBucket {
  DAYS_0_30 = '0-30',
  DAYS_31_60 = '31-60',
  DAYS_61_90 = '61-90',
  DAYS_90_PLUS = '90+'
}
```

### PaymentStatus
```typescript
enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  REVERSED = 'REVERSED'
}
```

### ReferenceStatus
```typescript
enum ReferenceStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}
```

### PaymentOption
```typescript
enum PaymentOption {
  COMPLETE = 'COMPLETE',
  PARTIAL = 'PARTIAL',
  PRECISE = 'PRECISE',
  LIMITED = 'LIMITED',
  PERPETUAL = 'PERPETUAL'
}
```

### BusinessType
```typescript
enum BusinessType {
  SCHOOL = 'SCHOOL',
  MICROFINANCE = 'MICROFINANCE',
  UTILITY = 'UTILITY',
  HEALTHCARE = 'HEALTHCARE',
  GOVERNMENT = 'GOVERNMENT',
  OTHER = 'OTHER'
}
```

### ServiceProviderStatus
```typescript
enum ServiceProviderStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  KYC_VERIFICATION = 'KYC_VERIFICATION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  ACTIVE = 'ACTIVE'
}
```

---

# ADMIN REPORTS

Base URL: `/reports`

---

## 1. Payment Transactions Report

Generates a report of all payment transactions.

### Endpoint
```
POST /reports/payments
```

### Roles Required
`SUPER_ADMIN`, `ADMIN`, `FINANCE_MANAGER`, `ANALYST`, `AUDITOR`

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "serviceProviderId": "uuid",        // Optional
  "status": "SUCCESS",                 // Optional: SUCCESS | FAILED | PENDING | REVERSED
  "channel": "MPESA",                  // Optional: MPESA | TIGO | BANK | APEF
  "fspCode": "FSP001",                 // Optional
  "minAmount": 1000,                   // Optional
  "maxAmount": 100000                  // Optional
}
```

### Report Contents
- Transaction list with: Reference No, Payer Name, Phone, Amount, Channel, FSP, Status, Paid At
- Summary: Total transactions, Successful/Failed/Pending counts, Total amount, Success rate
- Channel breakdown with counts and amounts

### Example Request
```bash
curl -X POST "https://api.ucg.co.tz/reports/payments" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31",
    "format": "PDF",
    "status": "SUCCESS"
  }' \
  --output payment-report.pdf
```

---

## 2. Payment References Report

Generates a report of payment references.

### Endpoint
```
POST /reports/references
```

### Roles Required
`SUPER_ADMIN`, `ADMIN`, `FINANCE_MANAGER`, `ANALYST`, `AUDITOR`, `OPERATIONS_MANAGER`

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "serviceProviderId": "uuid",        // Optional
  "status": "ACTIVE",                  // Optional: ACTIVE | USED | EXPIRED | CANCELLED
  "paymentOption": "COMPLETE",         // Optional: COMPLETE | PARTIAL | PRECISE | LIMITED | PERPETUAL
  "customerName": "John"               // Optional: partial match
}
```

### Report Contents
- Reference list with: Reference No, Customer, Phone, Amount, Paid, Remaining, Payment Option, Installments, Status, Expires
- Summary: Total references, Active/Used/Expired/Cancelled counts, Collection rate
- Payment option breakdown

---

## 3. Service Providers Report

Generates a report of registered service providers.

### Endpoint
```
POST /reports/service-providers
```

### Roles Required
`SUPER_ADMIN`, `ADMIN`, `ANALYST`, `AUDITOR`, `OPERATIONS_MANAGER`

### Request Body
```json
{
  "format": "PDF",
  "status": "ACTIVE",                  // Optional
  "businessType": "SCHOOL",            // Optional
  "region": "Dar es Salaam",           // Optional
  "district": "Ilala",                 // Optional
  "isActive": true                     // Optional
}
```

### Report Contents
- SP list with: SP Code, Business Name, Type, Registration No, TIN, Phone, Email, Region, Status, Active, Registered Date
- Summary: Total SPs, Active/Pending/Suspended counts
- Breakdown by business type, status, and region

---

## 4. Revenue Summary Report

Generates a revenue summary grouped by period.

### Endpoint
```
POST /reports/revenue-summary
```

### Roles Required
`SUPER_ADMIN`, `ADMIN`, `FINANCE_MANAGER`, `ANALYST`, `AUDITOR`

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "serviceProviderId": "uuid",        // Optional
  "groupBy": "day"                     // Optional: day | week | month
}
```

### Report Contents
- Period breakdown: Period, References, Payments, Total Billed, Total Collected, Collection Rate
- Summary: Grand totals, overall collection rate
- Top service providers by revenue

---

## 5. Channel Performance Report

Generates a payment channel performance analysis.

### Endpoint
```
POST /reports/channel-performance
```

### Roles Required
`SUPER_ADMIN`, `ADMIN`, `FINANCE_MANAGER`, `ANALYST`, `AUDITOR`

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "serviceProviderId": "uuid",        // Optional
  "channel": "MPESA"                   // Optional
}
```

### Report Contents
- Channel breakdown: Channel, Total Transactions, Successful, Failed, Total Amount, Avg Amount, Success Rate
- Summary: Total transactions, success rate, top performing channel

---

## 6. Outstanding Payments Report

Generates a report of unpaid/outstanding references.

### Endpoint
```
POST /reports/outstanding
```

### Roles Required
`SUPER_ADMIN`, `ADMIN`, `FINANCE_MANAGER`, `ANALYST`, `AUDITOR`

### Request Body
```json
{
  "format": "PDF",
  "serviceProviderId": "uuid",        // Optional
  "ageingBucket": "0-30",              // Optional: 0-30 | 31-60 | 61-90 | 90+
  "minAmount": 10000                   // Optional
}
```

### Report Contents
- Outstanding list: Reference No, Customer, Phone, Service Provider, Invoice Amount, Paid, Outstanding, Age (Days), Ageing Bucket
- Summary: Total outstanding amount
- Breakdown by ageing bucket
- Top service providers with outstanding

---

## 7. Daily Trends Report

Generates a day-by-day transaction trends report.

### Endpoint
```
POST /reports/daily-trends
```

### Roles Required
`SUPER_ADMIN`, `ADMIN`, `FINANCE_MANAGER`, `ANALYST`, `AUDITOR`

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "serviceProviderId": "uuid"         // Optional
}
```

### Report Contents
- Daily breakdown: Date, References Count, Reference Amount, Payments Count, Payment Amount, Collection Rate
- Summary: Total days, averages per day, peak day

---

## 8. Top Service Providers Report

Generates a ranking of service providers by transaction volume.

### Endpoint
```
POST /reports/top-service-providers
```

### Roles Required
`SUPER_ADMIN`, `ADMIN`, `ANALYST`, `AUDITOR`

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "limit": 10,                         // Optional, default: 10, max: 100
  "businessType": "SCHOOL"             // Optional
}
```

### Report Contents
- Ranked list: Rank, SP Code, Business Name, Type, References, Payments, Total Billed, Collected, Collection Rate
- Summary: Totals for displayed service providers

---

## 9. Collection Rate Report

Generates a collection rate analysis by period.

### Endpoint
```
POST /reports/collection-rate
```

### Roles Required
`SUPER_ADMIN`, `ADMIN`, `FINANCE_MANAGER`, `ANALYST`, `AUDITOR`

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "serviceProviderId": "uuid",        // Optional
  "businessType": "SCHOOL",            // Optional
  "groupBy": "month"                   // Optional: day | week | month
}
```

### Report Contents
- Period breakdown: Period, Total Refs, Paid Refs, Total Billed, Collected, Collection Rate
- Collection rate by business type
- Summary with overall collection rate

---

# SERVICE PROVIDER (SP) REPORTS

Base URL: `/sp/reports`

**Note**: All SP reports automatically filter by the authenticated service provider's ID (extracted from JWT token).

---

## 1. My Payments Report

Generates a report of payments received by the service provider.

### Endpoint
```
POST /sp/reports/payments
```

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "status": "SUCCESS",                 // Optional
  "channel": "MPESA",                  // Optional
  "minAmount": 1000,                   // Optional
  "maxAmount": 100000                  // Optional
}
```

### Report Contents
- Payment list: Reference No, Payer Name, Phone, Amount, Channel, FSP, Status, Paid At
- Summary: Transaction counts, amounts, success rate
- Channel breakdown

---

## 2. My References Report

Generates a report of payment references created by the service provider.

### Endpoint
```
POST /sp/reports/references
```

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "status": "ACTIVE",                  // Optional
  "paymentOption": "COMPLETE",         // Optional
  "customerName": "John"               // Optional
}
```

### Report Contents
- Reference list: Reference No, Customer, Phone, Amount, Paid, Remaining, Payment Option, Installments, Status, Expires
- Summary: Reference counts by status, collection rate
- Payment option breakdown

---

## 3. My Revenue Summary Report

Generates the service provider's revenue summary.

### Endpoint
```
POST /sp/reports/revenue-summary
```

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "groupBy": "day"                     // Optional: day | week | month
}
```

### Report Contents
- Period breakdown: Period, References, Payments, Total Billed, Collected, Collection Rate
- Summary: Grand totals, overall collection rate

---

## 4. My Channel Performance Report

Generates channel performance analysis for the service provider.

### Endpoint
```
POST /sp/reports/channel-performance
```

### Request Body
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "format": "PDF",
  "channel": "MPESA"                   // Optional
}
```

### Report Contents
- Channel breakdown: Channel, Transactions, Successful, Failed, Amount, Avg Amount, Success Rate
- Summary: Totals and top channel

---

## 5. My Outstanding Report

Generates the service provider's outstanding payments report.

### Endpoint
```
POST /sp/reports/outstanding
```

### Request Body
```json
{
  "format": "PDF",
  "ageingBucket": "0-30",              // Optional
  "minAmount": 10000                   // Optional
}
```

### Report Contents
- Outstanding list: Reference No, Customer, Phone, Invoice Amount, Paid, Outstanding, Age, Bucket
- Summary: Total outstanding
- Ageing breakdown

---

# Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["dateFrom must be a valid ISO 8601 date string"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

# Frontend Integration Examples

## React/TypeScript Example

```typescript
// types.ts
interface PaymentReportFilter {
  dateFrom: string;
  dateTo: string;
  format: 'PDF' | 'EXCEL';
  serviceProviderId?: string;
  status?: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REVERSED';
  channel?: 'MPESA' | 'TIGO' | 'BANK' | 'APEF';
  minAmount?: number;
  maxAmount?: number;
}

// reportService.ts
import axios from 'axios';

const API_BASE = 'https://api.ucg.co.tz';

export async function downloadPaymentReport(
  filters: PaymentReportFilter,
  token: string
): Promise<void> {
  const response = await axios.post(
    `${API_BASE}/reports/payments`,
    filters,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      responseType: 'blob',
    }
  );

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;

  // Extract filename from Content-Disposition header
  const contentDisposition = response.headers['content-disposition'];
  const filename = contentDisposition
    ? contentDisposition.split('filename="')[1]?.replace('"', '')
    : `payment-report.${filters.format.toLowerCase()}`;

  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Usage in component
const handleDownload = async () => {
  try {
    setLoading(true);
    await downloadPaymentReport({
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      format: 'PDF',
      status: 'SUCCESS',
    }, authToken);
  } catch (error) {
    console.error('Download failed:', error);
    toast.error('Failed to download report');
  } finally {
    setLoading(false);
  }
};
```

## Date Filter Component Example

```tsx
// DateRangeFilter.tsx
import { useState } from 'react';
import DatePicker from 'react-datepicker';

interface DateRangeFilterProps {
  onFilter: (dateFrom: string, dateTo: string) => void;
}

export function DateRangeFilter({ onFilter }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handleApply = () => {
    onFilter(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
  };

  return (
    <div className="flex gap-4">
      <DatePicker
        selected={startDate}
        onChange={(date) => setStartDate(date!)}
        selectsStart
        startDate={startDate}
        endDate={endDate}
      />
      <DatePicker
        selected={endDate}
        onChange={(date) => setEndDate(date!)}
        selectsEnd
        startDate={startDate}
        endDate={endDate}
        minDate={startDate}
      />
      <button onClick={handleApply}>Apply</button>
    </div>
  );
}
```

---

# Report Samples

## PDF Report Structure
- Header: Logo, Bank Name, Report Title, Date Range
- Filters Summary: Applied filters displayed
- Data Table: Main report data with styled rows
- Summary Section: Totals and breakdowns
- Footer: Page numbers, generation timestamp

## Excel Report Structure
- Row 1: Title (merged cells, bold, 16pt)
- Row 2: Period/filters info
- Row 3: Empty
- Row 4: Column headers (styled, blue background)
- Rows 5+: Data rows (alternating colors)
- Last Row: Totals (highlighted)

---

# Best Practices

1. **Date Range**: Always provide both `dateFrom` and `dateTo`
2. **Format Selection**: Use PDF for printing, Excel for data analysis
3. **Large Reports**: For reports > 10,000 rows, consider using pagination or narrower date ranges
4. **Caching**: Reports are generated on-demand; implement client-side caching if needed
5. **Error Handling**: Always handle blob download errors gracefully

---

# Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-02-09 | Initial release with 9 admin reports and 5 SP reports |
