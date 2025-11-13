import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get comprehensive dashboard overview',
    description:
      'Returns statistics for references, payments, recent activity, and top service providers',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601). Defaults to 30 days ago',
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceProviderId') serviceProviderId?: string,
  ) {
    return await this.dashboardService.getOverview({
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
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601). Defaults to 30 days ago',
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceProviderId') serviceProviderId?: string,
  ) {
    return await this.dashboardService.getDailyTrends({
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
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601). Defaults to 30 days ago',
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceProviderId') serviceProviderId?: string,
  ) {
    return await this.dashboardService.getReferenceAnalytics({
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
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO 8601). Defaults to 30 days ago',
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.dashboardService.getServiceProviderDashboard(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
