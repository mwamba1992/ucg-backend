import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { SpJwtAuthGuard } from '../auth/guards/sp-jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceProvider } from '../service-provider/entities/service-provider.entity';

/**
 * Service Provider Dashboard Controller
 *
 * Handles API endpoints for service providers to view their dashboard
 * statistics, trends, and analytics.
 *
 * Authentication: All endpoints require JWT token from SP login
 */
@ApiTags('Service Provider - Dashboard')
@Controller('sp/dashboard')
@UseGuards(SpJwtAuthGuard)
@ApiBearerAuth()
export class SpDashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,
  ) {}

  /**
   * Get Dashboard Overview
   *
   * GET /api/v1/sp/dashboard/overview
   */
  @Get('overview')
  @ApiOperation({
    summary: 'Get dashboard overview',
    description: 'Get overview statistics for the service provider including total references, payments, revenue, etc.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter end date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          totalReferences: 1250,
          activeReferences: 450,
          totalPayments: 800,
          totalRevenue: 45000000,
          pendingSettlement: 2500000,
          recentActivity: [],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOverview(
    @Query('period') period?: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const overview = await this.dashboardService.getOverview({
      serviceProviderId,
      period,
      days,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return {
      success: true,
      data: overview,
    };
  }

  /**
   * Get Dashboard Trends
   *
   * GET /api/v1/sp/dashboard/trends
   */
  @Get('trends')
  @ApiOperation({
    summary: 'Get trends data',
    description: 'Get payment and reference trends over time for charts and graphs.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', '7d', '30d', '90d', '180d', '365d', 'all'],
    description:
      'Time period for trends. Defaults to 30d. Legacy values (7days, 30days, ' +
      '90days, year) are still accepted. Use "all" for all-time.',
  })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Arbitrary rolling window in days' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Custom start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Custom end date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Trends data retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          period: '30days',
          paymentTrends: [
            { date: '2025-11-01', count: 45, amount: 2250000 },
            { date: '2025-11-02', count: 52, amount: 2600000 },
          ],
          referenceTrends: [
            { date: '2025-11-01', generated: 60, used: 45 },
            { date: '2025-11-02', generated: 65, used: 52 },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrends(
    @Query('period') period?: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const trends = await this.dashboardService.getDailyTrends({
      serviceProviderId,
      period,
      days,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return {
      success: true,
      data: trends,
    };
  }

  /**
   * Get Reference Analytics
   *
   * GET /api/v1/sp/dashboard/analytics/references
   */
  @Get('analytics/references')
  @ApiOperation({
    summary: 'Get reference analytics',
    description: 'Get detailed analytics about references (status breakdown, usage patterns, etc.).',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({
    status: 200,
    description: 'Reference analytics retrieved',
    schema: {
      example: {
        success: true,
        data: {
          statusBreakdown: {
            active: 450,
            used: 650,
            expired: 100,
            cancelled: 50,
          },
          utilizationRate: 76.5,
          averageTimeToUse: 12.5,
          topCustomers: [],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getReferenceAnalytics(
    @Query('period') period?: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const analytics = await this.dashboardService.getReferenceAnalytics({
      serviceProviderId,
      period,
      days,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return {
      success: true,
      data: analytics,
    };
  }

  /**
   * Get Service Provider Profile
   *
   * GET /api/v1/sp/dashboard/profile
   */
  @Get('profile')
  @ApiOperation({
    summary: 'Get service provider profile',
    description: 'Get the authenticated service provider\'s profile information and settings.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          spCode: 'MWA',
          businessName: 'Mwanga Secondary School',
          businessType: 'SCHOOL',
          status: 'APPROVED',
          isActive: true,
          settings: {
            commissionRate: 2.5,
            settlementFrequency: 'DAILY',
            autoSettlement: true,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: any) {
    const serviceProviderId = req.user.serviceProviderId;

    const serviceProvider = await this.serviceProviderRepository.findOne({
      where: { id: serviceProviderId },
      relations: ['contact', 'bankAccounts', 'settings'],
    });

    return {
      success: true,
      data: {
        id: serviceProvider.id,
        spCode: serviceProvider.spCode,
        businessName: serviceProvider.businessName,
        businessType: serviceProvider.businessType,
        email: serviceProvider.email,
        phoneNumber: serviceProvider.phoneNumber,
        physicalAddress: serviceProvider.physicalAddress,
        region: serviceProvider.region,
        district: serviceProvider.district,
        status: serviceProvider.status,
        isActive: serviceProvider.isActive,
        contact: serviceProvider.contact,
        bankAccounts: serviceProvider.bankAccounts,
        settings: serviceProvider.settings,
      },
    };
  }
}
