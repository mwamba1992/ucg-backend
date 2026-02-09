import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

import { ReportService } from './report.service';
import {
  PaymentReportFilterDto,
  ReferenceReportFilterDto,
  ServiceProviderReportFilterDto,
  RevenueSummaryReportFilterDto,
  ChannelPerformanceReportFilterDto,
  OutstandingReportFilterDto,
  DailyTrendsReportFilterDto,
  TopServiceProvidersReportFilterDto,
  CollectionRateReportFilterDto,
} from './dto/report-filter.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ============================================
  // PAYMENT TRANSACTION REPORT
  // ============================================
  @Post('payments')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE_MANAGER,
    UserRole.ANALYST,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: 'Generate Payment Transactions Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generatePaymentReport(
    @Body() filters: PaymentReportFilterDto,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } =
      await this.reportService.generatePaymentReport(filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // REFERENCE REPORT
  // ============================================
  @Post('references')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE_MANAGER,
    UserRole.ANALYST,
    UserRole.AUDITOR,
    UserRole.OPERATIONS_MANAGER,
  )
  @ApiOperation({ summary: 'Generate Payment References Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateReferenceReport(
    @Body() filters: ReferenceReportFilterDto,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } =
      await this.reportService.generateReferenceReport(filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // SERVICE PROVIDER REPORT
  // ============================================
  @Post('service-providers')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ANALYST,
    UserRole.AUDITOR,
    UserRole.OPERATIONS_MANAGER,
  )
  @ApiOperation({ summary: 'Generate Service Providers Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateServiceProviderReport(
    @Body() filters: ServiceProviderReportFilterDto,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } =
      await this.reportService.generateServiceProviderReport(filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // REVENUE SUMMARY REPORT
  // ============================================
  @Post('revenue-summary')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE_MANAGER,
    UserRole.ANALYST,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: 'Generate Revenue Summary Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateRevenueSummaryReport(
    @Body() filters: RevenueSummaryReportFilterDto,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } =
      await this.reportService.generateRevenueSummaryReport(filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // CHANNEL PERFORMANCE REPORT
  // ============================================
  @Post('channel-performance')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE_MANAGER,
    UserRole.ANALYST,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: 'Generate Channel Performance Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateChannelPerformanceReport(
    @Body() filters: ChannelPerformanceReportFilterDto,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } =
      await this.reportService.generateChannelPerformanceReport(filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // OUTSTANDING REPORT
  // ============================================
  @Post('outstanding')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE_MANAGER,
    UserRole.ANALYST,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: 'Generate Outstanding Payments Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateOutstandingReport(
    @Body() filters: OutstandingReportFilterDto,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } =
      await this.reportService.generateOutstandingReport(filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // DAILY TRENDS REPORT
  // ============================================
  @Post('daily-trends')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE_MANAGER,
    UserRole.ANALYST,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: 'Generate Daily Trends Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateDailyTrendsReport(
    @Body() filters: DailyTrendsReportFilterDto,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } =
      await this.reportService.generateDailyTrendsReport(filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // TOP SERVICE PROVIDERS REPORT
  // ============================================
  @Post('top-service-providers')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ANALYST,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: 'Generate Top Service Providers Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateTopServiceProvidersReport(
    @Body() filters: TopServiceProvidersReportFilterDto,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } =
      await this.reportService.generateTopServiceProvidersReport(filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // COLLECTION RATE REPORT
  // ============================================
  @Post('collection-rate')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE_MANAGER,
    UserRole.ANALYST,
    UserRole.AUDITOR,
  )
  @ApiOperation({ summary: 'Generate Collection Rate Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateCollectionRateReport(
    @Body() filters: CollectionRateReportFilterDto,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } =
      await this.reportService.generateCollectionRateReport(filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
