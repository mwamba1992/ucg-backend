import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import {
  ReconciliationQueryDto,
  TransactionQueryDto,
  GenerateSettlementDto,
} from './dto/reconciliation-query.dto';

@ApiTags('Reconciliation')
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('settlements/generate')
  @ApiOperation({
    summary: 'Generate settlement for a period',
    description: 'Creates a settlement record for the specified service provider and period',
  })
  @ApiResponse({
    status: 201,
    description: 'Settlement generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - settlement already exists or invalid parameters',
  })
  async generateSettlement(@Body() dto: GenerateSettlementDto) {
    return await this.reconciliationService.generateSettlement(dto);
  }

  @Get('settlements')
  @ApiOperation({
    summary: 'Get settlements for service provider',
    description: 'Retrieve all settlements based on query parameters',
  })
  @ApiResponse({
    status: 200,
    description: 'List of settlements',
  })
  async getSettlements(@Query() query: ReconciliationQueryDto) {
    return await this.reconciliationService.getSettlements(query);
  }

  @Get('settlements/:settlementId')
  @ApiOperation({
    summary: 'Get settlement by ID',
    description: 'Retrieve detailed information about a specific settlement',
  })
  @ApiParam({
    name: 'settlementId',
    description: 'Settlement UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement details',
  })
  @ApiResponse({
    status: 404,
    description: 'Settlement not found',
  })
  async getSettlementById(@Param('settlementId') settlementId: string) {
    return await this.reconciliationService.getSettlementById(settlementId);
  }

  @Get('settlements/:settlementId/report')
  @ApiOperation({
    summary: 'Get settlement report',
    description: 'Get comprehensive settlement report with all transactions and summary',
  })
  @ApiParam({
    name: 'settlementId',
    description: 'Settlement UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement report with transactions',
  })
  async getSettlementReport(@Param('settlementId') settlementId: string) {
    return await this.reconciliationService.getSettlementReport(settlementId);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Get transactions for reconciliation',
    description: 'Query transactions for a specific period for reconciliation purposes',
  })
  @ApiResponse({
    status: 200,
    description: 'List of transactions',
  })
  async getTransactions(@Query() query: TransactionQueryDto) {
    return await this.reconciliationService.getTransactionsForReconciliation(query);
  }

  @Patch('settlements/:settlementId/reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark settlement as reconciled',
    description: 'Confirm that settlement has been reconciled by the service provider',
  })
  @ApiParam({
    name: 'settlementId',
    description: 'Settlement UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement marked as reconciled',
  })
  async markAsReconciled(
    @Param('settlementId') settlementId: string,
    @Body() body: { reconciledBy: string },
  ) {
    return await this.reconciliationService.markAsReconciled(
      settlementId,
      body.reconciledBy,
    );
  }

  @Post('settlements/:settlementId/dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Report settlement discrepancy',
    description: 'Report a discrepancy or dispute for a settlement',
  })
  @ApiParam({
    name: 'settlementId',
    description: 'Settlement UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Discrepancy reported successfully',
  })
  async reportDiscrepancy(
    @Param('settlementId') settlementId: string,
    @Body() body: { details: string },
  ) {
    return await this.reconciliationService.reportDiscrepancy(
      settlementId,
      body.details,
    );
  }
}
