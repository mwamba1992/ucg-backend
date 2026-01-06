import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FinancialServiceProviderService } from './financial-service-provider.service';
import { CreateFspDto } from './dto/create-fsp.dto';
import { UpdateFspDto } from './dto/update-fsp.dto';
import { QueryFspDto } from './dto/query-fsp.dto';
import { FspResponseDto } from './dto/fsp-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Financial Service Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('financial-service-providers')
export class FinancialServiceProviderController {
  constructor(
    private readonly fspService: FinancialServiceProviderService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new Financial Service Provider',
    description: 'Register a new FSP (Bank or MNO) in the system',
  })
  @ApiResponse({
    status: 201,
    description: 'FSP created successfully',
    type: FspResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'FSP code already exists' })
  async create(@Body() createDto: CreateFspDto): Promise<FspResponseDto> {
    return await this.fspService.create(createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all Financial Service Providers',
    description: 'Get paginated list of FSPs with filtering options',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['MNO', 'BANK'],
    description: 'Filter by FSP type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name, short name, or FSP code',
  })
  @ApiResponse({
    status: 200,
    description: 'FSPs retrieved successfully',
  })
  async findAll(@Query() query: QueryFspDto) {
    const result = await this.fspService.findAll(query);
    return {
      success: true,
      data: {
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalItems: result.total,
          totalPages: result.totalPages,
          hasNext: result.page * result.limit < result.total,
          hasPrevious: result.page > 1,
        },
      },
    };
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get FSP statistics',
    description: 'Get aggregated statistics for all FSPs',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    const stats = await this.fspService.getStatistics();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('code/:fspCode')
  @ApiOperation({
    summary: 'Get FSP by code',
    description: 'Retrieve FSP details by FSP code',
  })
  @ApiParam({
    name: 'fspCode',
    description: 'FSP code (e.g., VODACOM, CRDB)',
  })
  @ApiResponse({
    status: 200,
    description: 'FSP retrieved successfully',
    type: FspResponseDto,
  })
  @ApiResponse({ status: 404, description: 'FSP not found' })
  async findByFspCode(@Param('fspCode') fspCode: string) {
    const fsp = await this.fspService.findByFspCode(fspCode);
    return {
      success: true,
      data: fsp,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get FSP by ID',
    description: 'Retrieve FSP details by UUID',
  })
  @ApiParam({ name: 'id', description: 'FSP UUID' })
  @ApiResponse({
    status: 200,
    description: 'FSP retrieved successfully',
    type: FspResponseDto,
  })
  @ApiResponse({ status: 404, description: 'FSP not found' })
  async findOne(@Param('id') id: string) {
    const fsp = await this.fspService.findOne(id);
    return {
      success: true,
      data: fsp,
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update FSP',
    description: 'Update FSP details',
  })
  @ApiParam({ name: 'id', description: 'FSP UUID' })
  @ApiResponse({
    status: 200,
    description: 'FSP updated successfully',
    type: FspResponseDto,
  })
  @ApiResponse({ status: 404, description: 'FSP not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFspDto,
  ) {
    const fsp = await this.fspService.update(id, updateDto);
    return {
      success: true,
      message: 'FSP updated successfully',
      data: fsp,
    };
  }

  @Post(':id/activate')
  @ApiOperation({
    summary: 'Activate FSP',
    description: 'Set FSP status to ACTIVE',
  })
  @ApiParam({ name: 'id', description: 'FSP UUID' })
  @ApiResponse({
    status: 200,
    description: 'FSP activated successfully',
  })
  @ApiResponse({ status: 404, description: 'FSP not found' })
  async activate(@Param('id') id: string) {
    const fsp = await this.fspService.activate(id);
    return {
      success: true,
      message: 'FSP activated successfully',
      data: fsp,
    };
  }

  @Post(':id/deactivate')
  @ApiOperation({
    summary: 'Deactivate FSP',
    description: 'Set FSP status to INACTIVE',
  })
  @ApiParam({ name: 'id', description: 'FSP UUID' })
  @ApiResponse({
    status: 200,
    description: 'FSP deactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'FSP not found' })
  async deactivate(@Param('id') id: string) {
    const fsp = await this.fspService.deactivate(id);
    return {
      success: true,
      message: 'FSP deactivated successfully',
      data: fsp,
    };
  }

  @Post(':id/suspend')
  @ApiOperation({
    summary: 'Suspend FSP',
    description: 'Suspend FSP operations',
  })
  @ApiParam({ name: 'id', description: 'FSP UUID' })
  @ApiResponse({
    status: 200,
    description: 'FSP suspended successfully',
  })
  @ApiResponse({ status: 404, description: 'FSP not found' })
  async suspend(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const fsp = await this.fspService.suspend(id, reason);
    return {
      success: true,
      message: 'FSP suspended successfully',
      data: fsp,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete FSP',
    description: 'Soft delete FSP (sets deletedAt timestamp)',
  })
  @ApiParam({ name: 'id', description: 'FSP UUID' })
  @ApiResponse({
    status: 204,
    description: 'FSP deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'FSP not found' })
  async remove(@Param('id') id: string) {
    await this.fspService.remove(id);
  }

  // ==================== Payment Reporting Endpoints ====================

  @Get(':fspCode/payment-report')
  @ApiOperation({
    summary: 'Get payment report for FSP',
    description: 'Get detailed payment analytics and statistics for a specific FSP',
  })
  @ApiParam({
    name: 'fspCode',
    description: 'FSP code (e.g., VODACOM, FSP001)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO format)',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO format)',
    example: '2025-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment report retrieved successfully',
  })
  async getPaymentReport(
    @Param('fspCode') fspCode: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const report = await this.fspService.getPaymentReport(
      fspCode,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      data: report,
    };
  }

  @Get('reports/all-fsps')
  @ApiOperation({
    summary: 'Get payment reports for all FSPs',
    description: 'Get aggregated payment statistics for all FSPs',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO format)',
  })
  @ApiResponse({
    status: 200,
    description: 'All FSP reports retrieved successfully',
  })
  async getAllFspReports(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const reports = await this.fspService.getAllFspReports(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      data: reports,
    };
  }

  @Get(':fspCode/daily-transactions')
  @ApiOperation({
    summary: 'Get daily transaction trend for FSP',
    description: 'Get day-by-day transaction count and volume for a specific FSP',
  })
  @ApiParam({
    name: 'fspCode',
    description: 'FSP code',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look back (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Daily transaction trend retrieved',
  })
  async getDailyTransactions(
    @Param('fspCode') fspCode: string,
    @Query('days') days?: number,
  ) {
    const trend = await this.fspService.getDailyTransactionTrend(
      fspCode,
      days || 30,
    );

    return {
      success: true,
      data: trend,
    };
  }
}
