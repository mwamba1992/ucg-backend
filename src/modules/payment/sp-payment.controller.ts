import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { ReferenceService } from '../reference/reference.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { SpJwtAuthGuard } from '../auth/guards/sp-jwt-auth.guard';

/**
 * Service Provider Payment Controller
 *
 * Handles API endpoints for service providers to view payment information
 * filtered by their institution.
 *
 * Authentication: All endpoints require JWT token from SP login
 */
@ApiTags('Service Provider - Payments')
@Controller('sp/payments')
@UseGuards(SpJwtAuthGuard)
@ApiBearerAuth()
export class SpPaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly referenceService: ReferenceService,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  /**
   * List Payments for Service Provider
   *
   * GET /api/v1/sp/payments
   */
  @Get()
  @ApiOperation({
    summary: 'List all payments for service provider',
    description: 'Get paginated list of payments filtered by service provider with optional date range and status filtering.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['SUCCESS', 'PENDING', 'FAILED'], description: 'Filter by payment status' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter end date (ISO format)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by reference number, payer name, or phone' })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              referenceNumber: 'MWA-0001234-A7B',
              amountPaid: 50000,
              payerName: 'John Doe',
              payerPhone: '+255712345678',
              paymentChannel: 'MPESA',
              transactionId: 'QA12345678',
              status: 'SUCCESS',
              paidAt: '2025-12-07T10:30:00.000Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 150,
            totalPages: 8,
            hasNext: true,
            hasPrevious: false,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listPayments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const serviceProviderId = req.user.serviceProviderId;

    const pageNum = page || 1;
    const limitNum = limit || 20;
    const skip = (pageNum - 1) * limitNum;

    // Build query to get payments for this service provider's references
    const queryBuilder = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment_reference', 'reference', 'payment.referenceNumber = reference.referenceNumber')
      .where('reference.serviceProviderId = :serviceProviderId', { serviceProviderId });

    // Apply filters
    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('payment.paidAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(payment.referenceNumber ILIKE :search OR payment.payerName ILIKE :search OR payment.payerPhone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const payments = await queryBuilder
      .orderBy('payment.paidAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getMany();

    return {
      success: true,
      data: {
        items: payments.map((payment) => ({
          id: payment.id,
          referenceNumber: payment.referenceNumber,
          amountPaid: payment.amountPaid,
          payerName: payment.payerName,
          payerPhone: payment.payerPhone,
          paymentChannel: payment.paymentChannel,
          status: payment.status,
          currency: payment.currency,
          paidAt: payment.paidAt,
          updatedAt: payment.updatedAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems: total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrevious: pageNum > 1,
        },
      },
    };
  }

  /**
   * Get Payment Statistics
   *
   * GET /api/v1/sp/payments/statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get payment statistics',
    description: 'Get payment statistics for service provider (total payments, total amount, success rate, etc.).',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter end date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          totalPayments: 850,
          totalAmount: 42500000,
          averagePaymentAmount: 50000,
          successfulPayments: 837,
          failedPayments: 13,
          successRate: 98.47,
          paymentsByChannel: {
            MPESA: { count: 450, amount: 22500000 },
            TIGOPESA: { count: 250, amount: 12500000 },
            AIRTEL: { count: 150, amount: 7500000 },
          },
          recentPayments: [],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPaymentStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const serviceProviderId = req?.user?.serviceProviderId || 'mock-sp-id';

    // Build base query
    const queryBuilder = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment_reference', 'reference', 'payment.referenceNumber = reference.referenceNumber')
      .where('reference.serviceProviderId = :serviceProviderId', { serviceProviderId });

    // Apply date filters if provided
    if (startDate && endDate) {
      queryBuilder.andWhere('payment.paidAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    // Get all payments for statistics
    const payments = await queryBuilder.getMany();

    // Calculate statistics
    const totalPayments = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const averagePaymentAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
    const successfulPayments = payments.filter((p) => p.status === 'SUCCESS').length;
    const failedPayments = payments.filter((p) => p.status === 'FAILED').length;
    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    // Group by payment channel
    const paymentsByChannel = payments.reduce((acc, payment) => {
      const channel = payment.paymentChannel || 'UNKNOWN';
      if (!acc[channel]) {
        acc[channel] = { count: 0, amount: 0 };
      }
      acc[channel].count++;
      acc[channel].amount += Number(payment.amountPaid);
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    // Get recent payments (last 10)
    const recentPayments = payments
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
      .slice(0, 10)
      .map((payment) => ({
        id: payment.id,
        referenceNumber: payment.referenceNumber,
        amountPaid: payment.amountPaid,
        payerName: payment.payerName,
        paymentChannel: payment.paymentChannel,
        status: payment.status,
        paidAt: payment.paidAt,
      }));

    return {
      success: true,
      data: {
        totalPayments,
        totalAmount,
        averagePaymentAmount: Math.round(averagePaymentAmount),
        successfulPayments,
        failedPayments,
        successRate: Number(successRate.toFixed(2)),
        paymentsByChannel,
        recentPayments,
      },
    };
  }

  /**
   * Get Payments by Reference Number
   *
   * GET /api/v1/sp/payments/reference/:referenceNumber
   */
  @Get('reference/:referenceNumber')
  @ApiOperation({
    summary: 'Get payments by reference number',
    description: 'Get all payments made against a specific reference number.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          referenceNumber: 'MWA-0001234-A7B',
          payments: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              amountPaid: 25000,
              payerName: 'John Doe',
              paymentChannel: 'MPESA',
              paidAt: '2025-12-07T10:30:00.000Z',
            },
          ],
          totalPaid: 25000,
          paymentCount: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Reference not found or not accessible' })
  async getPaymentsByReference(
    @Param('referenceNumber') referenceNumber: string,
    @Request() req: any,
  ) {
    const serviceProviderId = req?.user?.serviceProviderId || 'mock-sp-id';

    // Verify the reference belongs to this service provider
    const reference = await this.referenceService.findByReferenceNumber(
      referenceNumber,
      serviceProviderId,
    );

    if (!reference) {
      throw new BadRequestException(
        'Reference not found or you do not have permission to access it',
      );
    }

    // Get all payments for this reference
    const payments = await this.paymentService.getPaymentsByReference(referenceNumber);

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);

    return {
      success: true,
      data: {
        referenceNumber,
        payments: payments.map((payment) => ({
          id: payment.id,
          amountPaid: payment.amountPaid,
          payerName: payment.payerName,
          payerPhone: payment.payerPhone,
          paymentChannel: payment.paymentChannel,
          status: payment.status,
          currency: payment.currency,
          paidAt: payment.paidAt,
        })),
        totalPaid,
        paymentCount: payments.length,
      },
    };
  }

  /**
   * Get Payment Summary by Reference
   *
   * GET /api/v1/sp/payments/reference/:referenceNumber/summary
   */
  @Get('reference/:referenceNumber/summary')
  @ApiOperation({
    summary: 'Get payment summary for reference',
    description: 'Get detailed payment summary including invoice amount, total paid, remaining, and payment history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment summary retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          referenceNumber: 'MWA-0001234-A7B',
          invoiceAmount: 50000,
          totalPaid: 50000,
          remainingAmount: 0,
          installmentCount: 2,
          paymentOption: 'INSTALLMENT',
          isFullyPaid: true,
          status: 'USED',
          payments: [],
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Reference not found or not accessible' })
  async getPaymentSummary(
    @Param('referenceNumber') referenceNumber: string,
    @Request() req: any,
  ) {
    const serviceProviderId = req?.user?.serviceProviderId || 'mock-sp-id';

    // Verify the reference belongs to this service provider
    const reference = await this.referenceService.findByReferenceNumber(
      referenceNumber,
      serviceProviderId,
    );

    if (!reference) {
      throw new BadRequestException(
        'Reference not found or you do not have permission to access it',
      );
    }

    // Get payment summary
    const summary = await this.paymentService.getPaymentSummary(referenceNumber);

    return {
      success: true,
      data: summary,
    };
  }

  /**
   * Get Payment Details
   *
   * GET /api/v1/sp/payments/:paymentId
   */
  @Get(':paymentId')
  @ApiOperation({
    summary: 'Get payment details',
    description: 'Get detailed information about a specific payment.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Payment not found or not accessible' })
  async getPaymentDetails(
    @Param('paymentId') paymentId: string,
    @Request() req: any,
  ) {
    const serviceProviderId = req?.user?.serviceProviderId || 'mock-sp-id';

    // Get payment with reference relationship
    const payment = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment_reference', 'reference', 'payment.referenceNumber = reference.referenceNumber')
      .where('payment.id = :paymentId', { paymentId })
      .andWhere('reference.serviceProviderId = :serviceProviderId', { serviceProviderId })
      .getOne();

    if (!payment) {
      throw new BadRequestException(
        'Payment not found or you do not have permission to access it',
      );
    }

    return {
      success: true,
      data: {
        id: payment.id,
        referenceNumber: payment.referenceNumber,
        amountPaid: payment.amountPaid,
        payerName: payment.payerName,
        payerPhone: payment.payerPhone,
        paymentChannel: payment.paymentChannel,
        status: payment.status,
        currency: payment.currency,
        paidAt: payment.paidAt,
        updatedAt: payment.updatedAt,
      },
    };
  }
}
