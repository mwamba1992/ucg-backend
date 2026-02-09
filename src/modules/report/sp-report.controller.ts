import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response, Request } from 'express';

import { SpJwtAuthGuard } from '../auth/guards/sp-jwt-auth.guard';

import { SpReportService } from './sp-report.service';
import {
  SpPaymentReportFilterDto,
  SpReferenceReportFilterDto,
  SpRevenueSummaryReportFilterDto,
  SpChannelPerformanceReportFilterDto,
  SpOutstandingReportFilterDto,
} from './dto/sp-report-filter.dto';

// Extend Request to include user with serviceProviderId
interface SpRequest extends Request {
  user: {
    serviceProviderId: string;
    [key: string]: any;
  };
}

@ApiTags('SP Reports')
@ApiBearerAuth()
@Controller('sp/reports')
@UseGuards(SpJwtAuthGuard)
export class SpReportController {
  constructor(private readonly spReportService: SpReportService) {}

  // ============================================
  // SP PAYMENT REPORT
  // ============================================
  @Post('payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate My Payments Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateSpPaymentReport(
    @Req() req: SpRequest,
    @Body() filters: SpPaymentReportFilterDto,
    @Res() res: Response,
  ) {
    const serviceProviderId = req.user.serviceProviderId;
    const { buffer, contentType, filename } =
      await this.spReportService.generateSpPaymentReport(serviceProviderId, filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // SP REFERENCE REPORT
  // ============================================
  @Post('references')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate My References Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateSpReferenceReport(
    @Req() req: SpRequest,
    @Body() filters: SpReferenceReportFilterDto,
    @Res() res: Response,
  ) {
    const serviceProviderId = req.user.serviceProviderId;
    const { buffer, contentType, filename } =
      await this.spReportService.generateSpReferenceReport(serviceProviderId, filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // SP REVENUE SUMMARY REPORT
  // ============================================
  @Post('revenue-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate My Revenue Summary Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateSpRevenueSummaryReport(
    @Req() req: SpRequest,
    @Body() filters: SpRevenueSummaryReportFilterDto,
    @Res() res: Response,
  ) {
    const serviceProviderId = req.user.serviceProviderId;
    const { buffer, contentType, filename } =
      await this.spReportService.generateSpRevenueSummaryReport(serviceProviderId, filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // SP CHANNEL PERFORMANCE REPORT
  // ============================================
  @Post('channel-performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate My Channel Performance Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateSpChannelPerformanceReport(
    @Req() req: SpRequest,
    @Body() filters: SpChannelPerformanceReportFilterDto,
    @Res() res: Response,
  ) {
    const serviceProviderId = req.user.serviceProviderId;
    const { buffer, contentType, filename } =
      await this.spReportService.generateSpChannelPerformanceReport(
        serviceProviderId,
        filters,
      );

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ============================================
  // SP OUTSTANDING REPORT
  // ============================================
  @Post('outstanding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate My Outstanding Payments Report' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async generateSpOutstandingReport(
    @Req() req: SpRequest,
    @Body() filters: SpOutstandingReportFilterDto,
    @Res() res: Response,
  ) {
    const serviceProviderId = req.user.serviceProviderId;
    const { buffer, contentType, filename } =
      await this.spReportService.generateSpOutstandingReport(serviceProviderId, filters);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
