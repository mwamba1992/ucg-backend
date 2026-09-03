import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DEFAULT_PERIOD, PERIOD_OPTIONS } from './dashboard-period.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('periods')
  @ApiOperation({
    summary: 'List the periods the dashboard supports',
    description:
      'Returns the selectable windows and which one is applied when no ' +
      'period is supplied, so the UI can render the picker without ' +
      'hardcoding the list.',
  })
  @ApiResponse({ status: 200, description: 'Available dashboard periods' })
  getPeriods() {
    return {
      default: DEFAULT_PERIOD,
      options: PERIOD_OPTIONS,
    };
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Get comprehensive dashboard overview',
    description:
      'Returns statistics for references, payments, recent activity, and top service providers',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', '7d', '30d', '90d', '180d', '365d', 'all'],
    description:
      'Named window. Defaults to 30d. Use "all" for all-time figures. ' +
      'The resolved window and the full list of options are returned as ' +
      '`period` on the response.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Arbitrary rolling window in days (e.g. 45), for windows the presets do not cover',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601). Overrides period/days with a custom range',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (ISO 8601). Defaults to now',
  })
  @ApiQuery({
    name: 'serviceProviderId',
    required: false,
    type: String,
    description: 'Filter by service provider ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview data',
  })
  async getOverview(
    @Query('period') period?: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceProviderId') serviceProviderId?: string,
  ) {
    return await this.dashboardService.getOverview({
      period,
      days,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      serviceProviderId,
    });
  }

  @Get('trends')
  @ApiOperation({
    summary: 'Get daily trends for references and payments',
    description: 'Returns day-by-day statistics for the specified period',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', '7d', '30d', '90d', '180d', '365d', 'all'],
    description:
      'Named window. Defaults to 30d. Use "all" for all-time figures. ' +
      'The resolved window and the full list of options are returned as ' +
      '`period` on the response.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Arbitrary rolling window in days (e.g. 45), for windows the presets do not cover',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601). Overrides period/days with a custom range',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (ISO 8601). Defaults to now',
  })
  @ApiQuery({
    name: 'serviceProviderId',
    required: false,
    type: String,
    description: 'Filter by service provider ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily trends data',
  })
  async getDailyTrends(
    @Query('period') period?: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceProviderId') serviceProviderId?: string,
  ) {
    return await this.dashboardService.getDailyTrends({
      period,
      days,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      serviceProviderId,
    });
  }

  @Get('analytics/references')
  @ApiOperation({
    summary: 'Get detailed reference analytics',
    description:
      'Returns payment option breakdown, amount statistics, and installment data',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', '7d', '30d', '90d', '180d', '365d', 'all'],
    description:
      'Named window. Defaults to 30d. Use "all" for all-time figures. ' +
      'The resolved window and the full list of options are returned as ' +
      '`period` on the response.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Arbitrary rolling window in days (e.g. 45), for windows the presets do not cover',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601). Overrides period/days with a custom range',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (ISO 8601). Defaults to now',
  })
  @ApiQuery({
    name: 'serviceProviderId',
    required: false,
    type: String,
    description: 'Filter by service provider ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Reference analytics data',
  })
  async getReferenceAnalytics(
    @Query('period') period?: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceProviderId') serviceProviderId?: string,
  ) {
    return await this.dashboardService.getReferenceAnalytics({
      period,
      days,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      serviceProviderId,
    });
  }

  @Get('service-provider/:id')
  @ApiOperation({
    summary: 'Get service provider specific dashboard',
    description:
      'Returns complete dashboard for a specific service provider including overview, trends, and analytics',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', '7d', '30d', '90d', '180d', '365d', 'all'],
    description:
      'Named window. Defaults to 30d. Use "all" for all-time figures. ' +
      'The resolved window and the full list of options are returned as ' +
      '`period` on the response.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Arbitrary rolling window in days (e.g. 45), for windows the presets do not cover',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601). Overrides period/days with a custom range',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (ISO 8601). Defaults to now',
  })
  @ApiResponse({
    status: 200,
    description: 'Service provider dashboard data',
  })
  async getServiceProviderDashboard(
    @Param('id') id: string,
    @Query('period') period?: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.dashboardService.getServiceProviderDashboard(id, {
      period,
      days,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
