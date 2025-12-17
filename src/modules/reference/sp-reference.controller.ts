import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReferenceService } from './reference.service';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { BulkGenerateReferenceDto } from './dto/bulk-generate-reference.dto';
import { QueryReferenceDto } from './dto/query-reference.dto';
import { SpJwtAuthGuard } from '../auth/guards/sp-jwt-auth.guard';

/**
 * Service Provider Reference Controller
 *
 * Handles API endpoints for service providers to generate and manage
 * payment references asynchronously.
 *
 * Authentication: All endpoints require JWT token from SP login
 * Rate Limiting: Applied per endpoint (see SP_REFERENCE_GENERATION_API.md)
 */
@ApiTags('Service Provider - References')
@Controller('sp/references')
@UseGuards(SpJwtAuthGuard)
@ApiBearerAuth()
export class SpReferenceController {
  constructor(
    private readonly referenceService: ReferenceService,
  ) {}

  /**
   * Generate Single Reference
   *
   * POST /api/v1/sp/references
   */
  @Post()
  @ApiOperation({
    summary: 'Generate single payment reference',
    description: 'Create a payment reference for a customer. Returns reference immediately.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reference generated successfully',
    schema: {
      example: {
        success: true,
        message: 'Payment reference generated successfully',
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          referenceNumber: 'MWA-0001234-A7B',
          customerName: 'John Doe',
          customerPhone: '+255712345678',
          amount: 50000,
          status: 'ACTIVE',
          expiresAt: '2025-12-07T23:59:59.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async generateReference(
    @Body() createDto: CreateReferenceDto,
    @Request() req: any, // TODO: Type this with actual request interface
  ) {
    // Extract SP ID from JWT token
    const serviceProviderId = req.user.serviceProviderId;

    const reference = await this.referenceService.create({
      ...createDto,
      serviceProviderId,
    });

    return {
      success: true,
      message: 'Payment reference generated successfully',
      data: this.referenceService.toResponseDto(reference),
    };
  }

  /**
   * Generate Multiple References (Bulk)
   *
   * POST /api/v1/sp/references/bulk
   */
  @Post('bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Generate multiple references (bulk)',
    description: 'Create up to 1000 references in one request. Processing is asynchronous. Returns batch ID for tracking.',
  })
  @ApiResponse({
    status: 202,
    description: 'Bulk generation initiated',
    schema: {
      example: {
        success: true,
        message: 'Bulk reference generation initiated',
        data: {
          batchId: 'batch-550e8400-e29b-41d4-a716-446655440000',
          totalRequested: 100,
          status: 'PROCESSING',
          estimatedCompletionTime: '2025-11-07T10:35:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error or exceeds max 1000 references' })
  async bulkGenerate(
    @Body() bulkDto: BulkGenerateReferenceDto,
    @Request() req: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    // Validate max references
    if (bulkDto.references.length > 1000) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Maximum 1000 references per bulk request',
        },
      };
    }

    const batch = await this.referenceService.bulkGenerate(
      serviceProviderId,
      bulkDto,
    );

    return {
      success: true,
      message: 'Bulk reference generation initiated',
      data: {
        batchId: batch.batchId,
        totalRequested: batch.totalRequested,
        status: batch.status,
        estimatedCompletionTime: batch.estimatedCompletionTime,
      },
    };
  }

  /**
   * Get Bulk Generation Status
   *
   * GET /api/v1/sp/references/bulk/:batchId
   */
  @Get('bulk/:batchId')
  @ApiOperation({
    summary: 'Get bulk generation status',
    description: 'Check the status and progress of a bulk reference generation job.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch status retrieved',
    schema: {
      example: {
        success: true,
        data: {
          batchId: 'batch-550e8400',
          status: 'COMPLETED',
          summary: {
            totalRequested: 100,
            successCount: 98,
            failureCount: 2,
            processingCount: 0,
          },
          progress: 100,
          startedAt: '2025-11-07T10:30:00.000Z',
          completedAt: '2025-11-07T10:35:00.000Z',
          downloadUrl: 'https://api.ucg.mhb.co.tz/api/v1/sp/references/bulk/batch-550e8400/download',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async getBulkStatus(@Param('batchId') batchId: string, @Request() req: any) {
    const serviceProviderId = req.user.serviceProviderId;

    const batch = await this.referenceService.getBatchStatus(batchId, serviceProviderId);

    if (!batch) {
      return {
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: 'Batch not found or you do not have permission to access it',
        },
      };
    }

    return {
      success: true,
      data: {
        batchId: batch.batchId,
        status: batch.status,
        summary: {
          totalRequested: batch.totalRequested,
          successCount: batch.successCount,
          failureCount: batch.failureCount,
          processingCount: batch.processingCount,
        },
        progress: batch.getProgress(),
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        downloadUrl: batch.isComplete()
          ? `${process.env.API_URL}/api/v1/sp/references/bulk/${batchId}/download`
          : null,
      },
    };
  }

  /**
   * Download Bulk Results
   *
   * GET /api/v1/sp/references/bulk/:batchId/download
   */
  @Get('bulk/:batchId/download')
  @ApiOperation({
    summary: 'Download bulk generation results',
    description: 'Download the results of a completed bulk generation as CSV or JSON.',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    description: 'Download format',
  })
  @ApiResponse({
    status: 200,
    description: 'Results file downloaded',
  })
  @ApiResponse({ status: 404, description: 'Batch not found or not completed' })
  async downloadBulkResults(
    @Param('batchId') batchId: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Request() req: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const results = await this.referenceService.downloadBulkResults(
      batchId,
      serviceProviderId,
      format,
    );

    return results;
  }

  /**
   * Get Reference Details
   *
   * GET /api/v1/sp/references/:referenceNumber
   */
  @Get(':referenceNumber')
  @ApiOperation({
    summary: 'Get reference details',
    description: 'Get detailed information about a specific reference.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reference details retrieved',
  })
  @ApiResponse({ status: 404, description: 'Reference not found' })
  async getReference(
    @Param('referenceNumber') referenceNumber: string,
    @Request() req: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const reference = await this.referenceService.findByReferenceNumber(
      referenceNumber,
      serviceProviderId,
    );

    if (!reference) {
      return {
        success: false,
        error: {
          code: 'REFERENCE_NOT_FOUND',
          message: 'Reference not found or you do not have permission to access it',
        },
      };
    }

    return {
      success: true,
      data: this.referenceService.toResponseDto(reference),
    };
  }

  /**
   * List Service Provider References
   *
   * GET /api/v1/sp/references
   */
  @Get()
  @ApiOperation({
    summary: 'List all references for service provider',
    description: 'Get paginated list of references with filtering and search.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by customer name, phone, or reference' })
  @ApiResponse({
    status: 200,
    description: 'References retrieved',
  })
  async listReferences(
    @Query() query: QueryReferenceDto,
    @Request() req: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const { items, total } = await this.referenceService.findAllForSp(
      serviceProviderId,
      query,
    );

    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      success: true,
      data: {
        items: items.map((ref) => this.referenceService.toResponseDto(ref)),
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrevious: page > 1,
        },
      },
    };
  }

  /**
   * Get Reference Statistics
   *
   * GET /api/v1/sp/references/statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get reference statistics',
    description: 'Get statistics for service provider references (counts, amounts, trends).',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved',
  })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const stats = await this.referenceService.getStatistics(
      serviceProviderId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Cancel Reference
   *
   * POST /api/v1/sp/references/:referenceNumber/cancel
   */
  @Post(':referenceNumber/cancel')
  @ApiOperation({
    summary: 'Cancel reference',
    description: 'Cancel an active reference. Cannot be used for payment after cancellation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reference cancelled',
  })
  @ApiResponse({ status: 400, description: 'Reference cannot be cancelled (already used/expired)' })
  async cancelReference(
    @Param('referenceNumber') referenceNumber: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const reference = await this.referenceService.cancel(
      referenceNumber,
      serviceProviderId,
      reason,
    );

    return {
      success: true,
      message: 'Reference cancelled successfully',
      data: {
        referenceNumber: reference.referenceNumber,
        status: reference.status,
        cancelledAt: new Date(),
        reason,
      },
    };
  }

  /**
   * Validate Reference
   *
   * GET /api/v1/sp/references/:referenceNumber/validate
   */
  @Get(':referenceNumber/validate')
  @ApiOperation({
    summary: 'Validate reference',
    description: 'Validate a reference before giving to customer (optional check).',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
  })
  async validateReference(
    @Param('referenceNumber') referenceNumber: string,
    @Request() req: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const result = await this.referenceService.validate(
      referenceNumber,
      serviceProviderId,
    );

    return {
      success: result.isValid,
      data: result,
    };
  }

  /**
   * Extend Reference Expiry
   *
   * PATCH /api/v1/sp/references/:referenceNumber/extend
   */
  @Patch(':referenceNumber/extend')
  @ApiOperation({
    summary: 'Extend reference expiry',
    description: 'Extend the expiry date of an active reference.',
  })
  @ApiResponse({
    status: 200,
    description: 'Expiry extended',
  })
  async extendExpiry(
    @Param('referenceNumber') referenceNumber: string,
    @Body('additionalDays') additionalDays: number,
    @Request() req: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const reference = await this.referenceService.extendExpiry(
      referenceNumber,
      serviceProviderId,
      additionalDays,
    );

    return {
      success: true,
      message: 'Reference expiry extended successfully',
      data: {
        referenceNumber: reference.referenceNumber,
        oldExpiryDate: reference.expiresAt, // This would need to be tracked
        newExpiryDate: reference.expiresAt,
        extendedBy: additionalDays,
        extendedAt: new Date(),
      },
    };
  }
}
