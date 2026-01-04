import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { Payment } from './entities/payment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Payments Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get payment statistics (admin)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter end date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getPaymentStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const queryBuilder = this.paymentRepo.createQueryBuilder('payment');

    // Apply date filters if provided
    if (startDate && endDate) {
      queryBuilder.where('payment.paidAt BETWEEN :startDate AND :endDate', {
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
      },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Make a payment using a reference number' })
  @ApiResponse({
    status: 201,
    description: 'Payment successfully created',
    type: Payment,
  })
  @ApiResponse({ status: 400, description: 'Invalid payment data or amount' })
  @ApiResponse({ status: 404, description: 'Reference not found' })
  async createPayment(@Body() dto: CreatePaymentDto) {
    return await this.paymentService.createPayment(dto);
  }

  @Get(':referenceNumber')
  @ApiOperation({ summary: 'Get all payments made for a specific reference number' })
  @ApiParam({ name: 'referenceNumber', description: 'Reference number for the payment' })
  @ApiResponse({
    status: 200,
    description: 'List of payments for the reference number',
    type: [Payment],
  })
  @ApiResponse({ status: 404, description: 'No payments found for this reference' })
  async getPaymentsByReference(@Param('referenceNumber') referenceNumber: string) {
    const payments = await this.paymentService.getPaymentsByReference(referenceNumber);

    if (!payments || payments.length === 0) {
      throw new NotFoundException('No payments found for this reference');
    }

    return payments;
  }

  @Get(':referenceNumber/summary')
  @ApiOperation({
    summary: 'Get payment summary including installments and remaining amount',
  })
  @ApiParam({ name: 'referenceNumber', description: 'Reference number' })
  @ApiResponse({
    status: 200,
    description: 'Payment summary with installment details',
  })
  @ApiResponse({ status: 400, description: 'Invalid reference number' })
  async getPaymentSummary(@Param('referenceNumber') referenceNumber: string) {
    return await this.paymentService.getPaymentSummary(referenceNumber);
  }
}
